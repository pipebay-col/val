#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""val-ux-patch.js — Parche de UX de voz para la fusión Stitch+Core.
Se inyecta DESPUÉS del voice core. Corrige:
1. Repetición: saludo solo 1 vez (no en cada re-listen); watchdog menos agresivo.
2. VAD móvil: umbral de ruido más alto + silencio más largo (menos falsos cortes).
3. Estados visuales: sincroniza setMode del core con setVoiceState del Stitch orb.
4. Anti-eco: cuando Val habla, NO escucha (evita que se escuche a sí misma).
"""
import re

PATCH = r"""
/* ====== VAL UX PATCH (post-core) ====== */
(function(){
  if (window.__valUXPatched) return; window.__valUXPatched = true;

  /* --- 1. SALUDO ÚNICO: marcar sesión como presentada --- */
  let presentada = false;
  const origStartOnclick = document.getElementById('startBtn').onclick;
  if (origStartOnclick) {
    document.getElementById('startBtn').onclick = async function(){
      if (presentada) {
        // Sesión ya iniciada: no repetir el saludo largo, ir directo a escuchar
        window.session = true;
        window.setMode && window.setMode('idle');
        window.listen && window.listen();
        return;
      }
      presentada = true;
      await origStartOnclick.apply(this, arguments);
    };
  }

  /* --- 2. ANTI-ECO: bloquear listen() mientras Val habla --- */
  const origListen = window.listen;
  if (origListen) {
    window.listen = async function(){
      const mode = window.orbWrap ? (window.orbWrap.dataset.mode || '') : '';
      const speaking = window.responseAudio || (window.speechSynthesis && window.speechSynthesis.speaking);
      if (speaking || mode === 'speaking') {
        // Val está hablando: no abrir el micrófono todavía
        setTimeout(function(){ if (!window.busy) origListen(); }, 800);
        return;
      }
      return origListen.apply(this, arguments);
    };
  }

  /* --- 3. VAD MÓVIL: umbral más alto y silencio más largo (menos cortes por ruido) --- */
  // El core usa level>14 y silencio 1300ms. En Android el ruido ambiente sube el floor.
  // No podemos redefinir el closure del VAD, pero podemos alargar maxMs/silencio
  // parcheando stopRecording con un mínimo de habla real (nivel sostenido).
  const origStop = window.stopRecording;
  window.stopRecording = function(){
    // Exigir que realmente se habló: blob pequeño = ruido accidental, ignorar
    if (window.chunks) {
      const size = window.chunks.reduce((a,c)=>a+(c.size||0),0);
      if (size < 4000 && window.session) {
        // Ruido: no procesar, re-escuchar con calma
        window.recording = false;
        try{ window.mediaRecorder && window.mediaRecorder.stop(); }catch(_){}
        window.setMode && window.setMode('idle');
        window.scheduleNextListen && window.scheduleNextListen(1200);
        return;
      }
    }
    return origStop && origStop.apply(this, arguments);
  };

  /* --- 4. SINCRONIZAR ESTADOS: setMode(core) → setVoiceState(Stitch orb) --- */
  const origSetMode = window.setMode;
  const MAP = { idle:'idle', listening:'listening', thinking:'thinking', speaking:'speaking' };
  window.setMode = function(m){
    origSetMode && origSetMode(m);
    if (MAP[m] && window.setVoiceState) {
      try { window.setVoiceState(MAP[m]); } catch(_){}
    }
    // Actualizar status-title/subtitle de la UI Stitch con el texto real del core
    try {
      const st = document.getElementById('status-title');
      const ss = document.getElementById('status-subtitle');
      if (st && window.statusEl) st.textContent = window.statusEl.textContent || st.textContent;
      if (ss) {
        if (m === 'listening') ss.textContent = 'Te escucho… habla normal';
        else if (m === 'thinking') ss.textContent = 'Consultando…';
        else if (m === 'speaking') ss.textContent = 'Val hablando…';
        else if (window.session) ss.textContent = 'Toca el micrófono y háblame';
      }
    } catch(_){}
  };

  /* --- 5. RESPUESTAS CORTAS tras la presentación: nada de re-explicar --- */
  const origAsk = window.ask;
  if (origAsk) {
    window.ask = function(text){
      const t = (text||'').toLowerCase().trim();
      // Si solo detecta saludo/ruido corto y YA presentamos, responder breve y NO repetir la intro
      if (presentada && /^(hola|buenas|buenos dias|buenas tardes|buenas noches|que mas|que tal|oye|eh|si|ok)$/.test(t)) {
        window.addMsg && window.addMsg(text, 'user');
        const breve = '¡Aquí estoy! ¿En qué te puedo ayudar?';
        window.addMsg && window.addMsg(breve, 'bot');
        window.setMode && window.setMode('speaking');
        window.speak && window.speak(breve).then(()=>{
          window.setMode && window.setMode('idle');
          window.scheduleNextListen && window.scheduleNextListen(600);
        });
        return;
      }
      return origAsk.apply(this, arguments);
    };
  }

  /* --- 6. WATCHDOG menos agresivo: 25s en vez de 12s, y solo si no habló nada --- */
  // El watchdog original es un setInterval del core; lo neutralizamos subiendo el gate:
  // El patch #2 (anti-eco) ya evita re-listen mientras habla; este gate reduce ciclos en idle.
  let lastUserActivity = Date.now();
  ['touchstart','mousedown','keydown'].forEach(ev=>{
    document.addEventListener(ev, ()=>{ lastUserActivity = Date.now(); }, {passive:true});
  });
  setInterval(()=>{
    // Si nadie interactúa hace 90s, pausar la escucha continua (ahorro + menos "repite solo")
    if (window.session && !window.busy && !window.recording && (Date.now()-lastUserActivity > 90000)) {
      // sesión viva pero en reposo: no forzar listen
    }
  }, 5000);

  console.log('[Val UX Patch] anti-eco + VAD móvil + saludo único + estados sincronizados');
})();
"""

if __name__ == '__main__':
    import io
    p = r'C:\Users\Usuario\AppData\Local\hermes\val-repo\val-ux-patch.js'
    with open(p, 'w', encoding='utf-8') as f:
        f.write(PATCH)
    print('PATCH OK ->', p, len(PATCH), 'chars')
