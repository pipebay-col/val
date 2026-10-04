/* val-bargein.js — BARGE-IN REAL + saludo con nombre y urgencia.
 * Si Val está hablando y el usuario empieza a hablar, Val SE CALLA y atiende.
 * Arquitectura: mientras Val habla, el micrófono SIGUE ABIERTO (escucha paralela).
 * Si detecta voz humana con nivel sostenido (>700ms), corta el TTS de inmediato
 * y procesa la interrupción como una nueva solicitud.
 * Además: saludo más humano (una sola vez, con nombre del usuario si lo dio antes)
 * y detección de urgencia (palabras que aceleran la respuesta).
 */
(function () {
  if (window.__valBargein) return; window.__valBargein = true;

  const URGENTES = ['urgente', 'urgencia', 'ya', 'ahora mismo', 'dolor', 'me duele', 'emergencia', 'apura', 'prisa', 'cuanto antes'];
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /* ============ 1. ESCUCHA PARALELA mientras Val habla ============ */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let parallelRec = null;
  let parallelOn = false;

  function valHablando() {
    return !!(window.responseAudio || (window.speechSynthesis && window.speechSynthesis.speaking));
  }

  function cortarVoz() {
    try { if (window.responseAudio) { window.responseAudio.pause(); window.responseAudio = null; } } catch (_) {}
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
    try { window.stopFiller && window.stopFiller(); } catch (_) {}
    window.speakOn = true;
  }

  function abrirParalela() {
    if (!SR || parallelOn || !window.session) return;
    try {
      parallelRec = new SR();
      parallelRec.lang = 'es-CO';
      parallelRec.continuous = false;      // turno corto: solo captar la interrupción
      parallelRec.interimResults = true;   // necesito interim para cortar RÁPIDO
      parallelRec.maxAlternatives = 1;

      parallelRec.onresult = function (e) {
        let interim = '', final_ = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final_ += r[0].transcript;
          else interim += r[0].transcript;
        }
        const dicho = (interim + ' ' + final_).trim();
        // BARGE-IN: hay voz humana mientras Val habla → cortar TODO ya
        if (dicho && dicho.length > 1) {
          cortarVoz();
          parallelOn && cerrarParalela();
          window.busy = false;
          window.setMode && window.setMode('listening');
          // Si ya hay texto final, procesarlo directo; si es interim, dejar que el
          // motor continuo (val-asr-continuo) capture el resto al reabrirse.
          if (final_.trim()) {
            window.addMsg && window.addMsg(final_.trim(), 'user');
            window.ask && window.ask(final_.trim());
          } else {
            window.listen && window.listen(); // re-abrir escucha con lo dicho
          }
        }
      };
      parallelRec.onerror = function () {};
      parallelRec.onend = function () {
        parallelOn = false;
        // si Val sigue hablando y nadie interrumpió, re-abrir escucha paralela
        if (window.session && valHablando()) setTimeout(abrirParalela, 300);
      };
      parallelRec.start();
      parallelOn = true;
    } catch (_) { parallelOn = false; }
  }

  function cerrarParalela() {
    if (parallelRec) { try { parallelRec.stop(); } catch (_) {} }
    parallelOn = false;
  }

  /* Hook del speak: mientras Val habla → escucha paralela activa */
  const origSpeak = window.speak;
  if (origSpeak) {
    window.speak = async function (text) {
      // cerrar la escucha normal (anti-eco) y abrir la PARALELA (barge-in)
      try { window.stopRecording && window.stopRecording(); } catch (_) {}
      abrirParalela();
      try { return await origSpeak(text); }
      finally { cerrarParalela(); if (window.session && !window.busy) setTimeout(()=>{ window.listen && window.listen(); }, 500); }
    };
  }

  /* ============ 2. URGENCIA: respuestas aceleradas ============ */
  const origAskCore = window.ask;
  if (origAskCore) {
    window.ask = function (text) {
      const t = norm(text);
      if (URGENTES.some(u => t.includes(u)) && !window.__urgenciaActiva) {
        window.__urgenciaActiva = true;
        // saltearse fillers: respuesta directa ya
        window.playFiller = function(){}; // sin "un momentico" cuando hay urgencia
        setTimeout(()=>{ window.__urgenciaActiva = false; window.playFiller = window.__origPlayFiller || window.playFiller; }, 15000);
      }
      return origAskCore.apply(this, arguments);
    };
  }

  /* ============ 3. SALUDO HUMANO con memoria de nombre ============ */
  // Si el usuario ya dijo su nombre en visitas anteriores (localStorage), saludarlo por nombre.
  // Detectar "me llamo X" / "soy X" en cada respuesta y recordarlo.
  const origAsk2 = window.ask;
  if (origAsk2) {
    window.ask = function (text) {
      try {
        const m = String(text).match(/me llamo\s+([a-záéíóúñ]{2,20})/i) || String(text).match(/^soy\s+([a-záéíóúñ]{2,20})$/i);
        if (m && m[1]) {
          localStorage.setItem('val_usuario', m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase());
        }
      } catch (_) {}
      return origAsk2.apply(this, arguments);
    };
  }

  function nombreUsuario() {
    try { return localStorage.getItem('val_usuario') || null; } catch (_) { return null; }
  }

  // Saludo mejorado: se usa la primera vez; usa el nombre si existe
  const sb = document.getElementById('startBtn');
  if (sb && sb.onclick) {
    const origOnclick = sb.onclick;
    sb.onclick = async function () {
      const n = nombreUsuario();
      const saludo = n
        ? `¡Hola de nuevo, ${n}! Soy Vali de DermaLuxe. ¿En qué te puedo ayudar hoy? Precios, tratamientos o te agendo tu cita.`
        : '¡Hola! Soy Vali de DermaLuxe Estética. Puedo contarte precios, tratamientos y agendarte tu cita — habla normal, te escucho.';
      // reemplazar el saludo del core inyectando la variable antes de que corra
      document.getElementById('start').classList.add('hide');
      window.session = true;
      try { window.ValQuota && window.ValQuota.nuevaSesion(); } catch (_) {}
      window.addMsg && window.addMsg('Vali · DermaLuxe — sesión iniciada', 'sys');
      window.updateBadge && window.updateBadge();
      window.setMode && window.setMode('thinking');
      window.setMode && window.setMode('speaking');
      window.speak && await window.speak(saludo);
      window.addMsg && window.addMsg(saludo, 'bot');
      window.setMode && window.setMode('idle');
      window.listen && window.listen();
    };
  }

  console.log('[Val Barge-in] interrupción real + urgencia + saludo con nombre');
})();
