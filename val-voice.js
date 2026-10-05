/* val-voice.js — Motor de voz UNIFICADO y estable para Android (v4).
 * Arquitectura definitiva sin backend:
 *   1. getUserMedia ABIERTO de fondo (estabiliza el SR de Chrome Android —
 *      sin él, el SpeechRecognition suelto cicla onend sin resultados).
 *   2. UN SpeechRecognition como fuente de texto (interim para barge-in).
 *   3. El MediaRecorder del core queda: el analyser alimenta el waveform.
 *   Este archivo REEMPLAZA solo transcribe() (el texto ya viene del SR).
 *   Escucha: se llama al iniciar sesión (el core ya lo hace via listen()).
 */
(function () {
  if (window.__valVoice) return; window.__valVoice = true;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { console.warn('[Val Voice] sin SR — usar barra de texto'); return; }

  let rec = null, activo = false, fallos = 0, t0 = 0;

  function valHablando() {
    return !!(window.responseAudio || (window.speechSynthesis && window.speechSynthesis.speaking));
  }

  function setDbg(txt, color) {
    let d = document.getElementById('val-sr-debug');
    if (!d) {
      d = document.createElement('div');
      d.id = 'val-sr-debug';
      d.style.cssText = 'position:fixed;top:6px;right:8px;z-index:999;font-size:10px;color:#64748b;font-family:monospace;background:rgba(10,12,14,.7);padding:3px 8px;border-radius:8px;pointer-events:none;opacity:.8;';
      document.body.appendChild(d);
    }
    d.textContent = txt; d.style.color = color || '#64748b';
  }

  /* 1. getUserMedia de fondo: mic abierto SIEMPRE (estabilizador de Android) */
  // SIN getUserMedia propio: el core YA abre el mic en listen().
  // El SR corre en paralelo sobre el MISMO permiso (Chrome lo permite y es estable).
  async function abrirFondo() {
    // solo esperar a que el core tenga su stream vivo
    let intentos = 0;
    while (!window.stream && intentos++ < 20) await new Promise(r => setTimeout(r, 250));
    console.log('[Val Voice] stream del core ' + (window.stream ? 'activo' : 'NO disponible'));
  }

  /* 2. SpeechRecognition como fuente de texto */
  function abrir() {
    if (activo || window.micBlocked) return;
    try {
      rec = new SR();
      rec.lang = 'es-CO';
      rec.continuous = true;      // continuo: el mic de fondo lo sostiene
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      let acumulado = '';

      rec.onresult = function (e) {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) acumulado += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        // barge-in: si Val habla y el usuario habla → cortarla
        if (valHablando() && ((interim + acumulado).trim().length > 1)) {
          try { if (window.responseAudio) { window.responseAudio.pause(); window.responseAudio = null; } } catch (_) {}
          try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {}
          window.setMode && window.setMode('listening');
        }
        if (acumulado.trim()) {
          const texto = acumulado.trim();
          acumulado = '';
          fallos = 0;
          // filtro anti-ruido
          const nrm = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, '').trim();
          if (!nrm || nrm.length < 3) return;
          window.busy = false;
          window.setMode && window.setMode('thinking');
          window.ask && window.ask(texto);
        }
      };

      let errCaptureAvisado = false;
      rec.onerror = function (e) {
        setDbg('err: ' + e.error, '#F59E0B');
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          window.micBlocked = true;
          setDbg('sin permiso de mic', '#ef4444');
          const aviso = 'Necesito permiso del micrófono. Toca el candado en la barra de dirección, permite el micrófono y recarga.';
          window.addMsg && window.addMsg(aviso, 'bot');
          try { window.speak && window.speak(aviso); } catch (_) {}
        } else if (e.error === 'audio-capture' && !errCaptureAvisado) {
          errCaptureAvisado = true;
          const aviso = 'No me está llegando el micrófono. Puede estar ocupado por otra app — ciérrala, o usa la barra de texto abajo mientras vuelve.';
          window.addMsg && window.addMsg(aviso, 'bot');
          setDbg('mic ocupado — reintenta', '#F59E0B');
        }
      };

      rec.onend = function () {
        activo = false;
        const dur = Date.now() - t0;
        if (window.session && !window.micBlocked && !valHablando()) {
          window.busy = false;
          if (dur < 1500) {
            fallos++;
            setDbg('reintento ' + fallos, '#64748b');
            setTimeout(abrir, fallos > 3 ? 3000 : 900);
          } else {
            setDbg('SR: escuchando', '#10B981');
            setTimeout(abrir, 500);
          }
        }
      };

      rec.start();
      activo = true;
      t0 = Date.now();
      if (fallos > 0) fallos--;
      setDbg('SR: escuchando', '#10B981');
      window.setMode && window.setMode('listening');
    } catch (e) {
      activo = false;
      fallos++;
      setTimeout(abrir, fallos > 3 ? 3000 : 1500);
    }
  }

  /* 3. Hooks: el core graba (blob) pero el TEXTO llega por el SR.
     transcribe() ya no consume el blob — el SR ya entregó el texto. */
  window.transcribe = function () { /* el texto llega directo por SR */ };
  // listen() del core se mantiene: su getUserMedia abre el mic de fondo.
  // Solo garantizamos que al iniciar sesión el SR arranque:
  const sb = document.getElementById('startBtn');
  const origOnclick = sb && sb.onclick;
  if (sb && origOnclick) {
    sb.onclick = async function () {
      abrirFondo().then(abrir);
      return origOnclick.apply(this, arguments);
    };
  }

  /* Reanudar tras cada respuesta: cuando speak() termina, el SR sigue (continuous).
     Heartbeat de seguridad cada 6s */
  setInterval(function () {
    if (window.session && !activo && !window.micBlocked && !valHablando()) abrir();
  }, 6000);

  setDbg('SR: listo', '#64748b');
  console.log('[Val Voice v4] getUserMedia de fondo + SR continuo estabilizado');
})();
