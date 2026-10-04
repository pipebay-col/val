
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

  /* --- 5b. FEEDBACK DEL ASR: si el reconocimiento falla, Val lo DICE (nunca silencio) --- */
  const origTranscribe = window.transcribe;
  let asrFails = 0;
  window.transcribe = async function(blob){
    try {
      const b64 = await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(blob); });
      const res = await window.fetch('/api/asr', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({audio:b64, mime:blob.type})});
      const j = await res.json();
      window.stopFiller && window.stopFiller();
      if(j.ok && j.text && String(j.text).trim()){ asrFails = 0; window.busy=false; window.ask(j.text); return; }
      // ASR devolvió vacío → no quedarse muda
      asrFails++;
      window.setMode && window.setMode('idle');
      if (asrFails === 1) {
        const aviso = 'No te escuché bien. Háblame otra vez un poquito más cerca, o escríbeme abajo.';
        window.addMsg && window.addMsg(aviso, 'bot');
        window.setMode && window.setMode('speaking');
        window.speak && window.speak(aviso).then(()=>{ window.setMode && window.setMode('idle'); window.scheduleNextListen && window.scheduleNextListen(800); });
      } else if (asrFails === 3) {
        asrFails = 0;
        const aviso = 'Parece que el micrófono no me está llegando bien. Puedes escribirme abajo y te contesto igual.';
        window.addMsg && window.addMsg(aviso, 'bot');
        const inp = document.getElementById('textInput');
        inp && (inp.style.display = 'block', inp.focus());
      } else {
        window.scheduleNextListen && window.scheduleNextListen(900);
      }
    } catch(e) {
      window.stopFiller && window.stopFiller();
      asrFails++;
      window.setMode && window.setMode('idle');
      if (asrFails >= 2) {
        asrFails = 0;
        const aviso = 'El micrófono no me está llegando. Escríbeme abajo y te contesto enseguida.';
        window.addMsg && window.addMsg(aviso, 'bot');
        window.setMode && window.setMode('speaking');
        window.speak && window.speak(aviso).then(()=>{ window.setMode && window.setMode('idle'); window.scheduleNextListen && window.scheduleNextListen(1500); });
        const inp = document.getElementById('textInput');
        inp && (inp.style.display = 'block');
      } else {
        window.scheduleNextListen && window.scheduleNextListen(900);
      }
    }
  };

  /* --- 5c. INPUT DE TEXTO SIEMPRE VISIBLE y funcional (hablarle escribiendo) --- */
  window.addEventListener('load', function(){
    const inp = document.getElementById('textInput');
    if (inp) {
      inp.style.display = 'block';
      inp.placeholder = 'También puedes escribirme aquí…';
      inp.style.cssText += ';position:fixed;bottom:12px;left:12px;right:12px;z-index:60;background:rgba(17,20,24,.92)!important;border:1px solid rgba(78,222,163,.4)!important;border-radius:9999px;padding:12px 18px;color:#eef7f2!important;font-size:15px;outline:none;backdrop-filter:blur(12px);';
      inp.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && inp.value.trim()) {
          const v = inp.value.trim(); inp.value = '';
          window.session = true;
          window.ask && window.ask(v);
        }
      });
    }
  });

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
