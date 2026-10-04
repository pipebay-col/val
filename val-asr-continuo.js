/* val-asr-continuo.js — Motor de escucha REAL para móvil: SpeechRecognition continuo.
 * SUSTITUYE la doble captura rota (MediaRecorder+VAD → asr fetch → 2do mic).
 * Arquitectura estándar de asistentes web: UN solo motor, el de Chrome.
 *
 * Flujo nuevo:
 *   touch orb → startListening() → SR.continuous escucha TODO el turno
 *   onresult(texto) → ask(texto) directo al cerebro
 *   onend → si Val no está hablando, re-abre escucha (conversación continua)
 *   mientras Val habla (TTS), la escucha se PAUSA (anti-eco) y reanada sola al terminar.
 */
(function () {
  if (window.__valAsrContinuo) return; window.__valAsrContinuo = true;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { console.warn('[Val ASR] navegador sin SpeechRecognition'); return; }

  let rec = null;
  let escuchando = false;

  function valHablando() {
    return !!(window.responseAudio || (window.speechSynthesis && window.speechSynthesis.speaking));
  }

  function arrancar() {
    if (escuchando || valHablando() || !window.session) return;
    try {
      rec = new SR();
      rec.lang = 'es-CO';
      rec.continuous = true;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = function (e) {
        let texto = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) texto += e.results[i][0].transcript;
        }
        texto = texto.trim();
        if (!texto) return;
        // feedback inmediato: estaba escuchando, pasa a pensar
        window.setMode && window.setMode('thinking');
        window.busy = true;
        window.ask && window.ask(texto);
        pausar(); // cierra el mic mientras procesa/responde
      };

      rec.onerror = function (e) {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          window.micBlocked = true;
          window.setMode && window.setMode('idle');
          const aviso = 'Necesito permiso del micrófono: toca el candado de la barra de dirección, permite el micrófono y recarga.';
          window.addMsg && window.addMsg(aviso, 'bot');
          window.speak && window.speak(aviso);
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[Val ASR] error:', e.error);
        }
      };

      rec.onend = function () {
        escuchando = false;
        // conversación continua: re-escuchar si nadie habla y la sesión está viva
        if (window.session && !window.busy && !window.micBlocked && !valHablando()) {
          setTimeout(arrancar, 400);
        }
      };

      rec.start();
      escuchando = true;
      window.setMode && window.setMode('listening');
    } catch (e) {
      console.warn('[Val ASR] no pudo arrancar:', e.message);
    }
  }

  function pausar() {
    if (rec && escuchando) { try { rec.stop(); } catch (_) {} }
    escuchando = false;
  }

  /* --- Reemplazar listen()/transcribe() del core por el motor continuo --- */
  window.listen = function () {
    if (!window.session) { const sb = document.getElementById('startBtn'); sb && sb.click(); return; }
    arrancar();
  };
  window.stopRecording = function(){ pausar(); };
  window.transcribe = function(){ /* el blob ya no importa: SR entrega el texto directo */ };

  // Anti-eco con TTS: cuando speechSynthesis termina, reanudar escucha sola
  if (window.speechSynthesis) {
    const rs = window.speechSynthesis;
    const _origSpeak = window.speak;
    if (_origSpeak) {
      window.speak = async function (text) {
        pausar();
        try { return await _origSpeak(text); }
        finally { if (window.session && !window.busy) setTimeout(arrancar, 600); }
      };
    }
  }

  /* Al confirmar cita / derivar (doAction), mantener el ciclo vivo */
  document.addEventListener('val:cita-confirmada', ()=>{ setTimeout(arrancar, 1200); });

  console.log('[Val ASR Continuo] SpeechRecognition continuo es-CO como motor único de escucha');
})();
