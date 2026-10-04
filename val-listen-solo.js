/* val-listen-solo.js — MOTOR ÚNICO DE ESCUCHA (reemplaza TODO el pipeline viejo).
 * Problema raíz en Android: el core abre MediaRecorder (getUserMedia) Y el
 * SpeechRecognition simultáneamente → solo un motor de mic gana y se pisan.
 * Fix: UNA sola instancia de SpeechRecognition, interimResults=true para
 * interrumpir a Val mientras habla (barge-in real), y el MediaRecorder
 * del core queda neutralizado (listen() ya no abre getUserMedia).
 *
 * Además: al pedir servicios, se muestran TARJETAS visibles en pantalla.
 */
(function () {
  if (window.__valListenSolo) return; window.__valListenSolo = true;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { console.warn('[Val Listen-Solo] sin SpeechRecognition en este navegador'); return; }

  let rec = null;
  let activo = false;
  let interrumpiendo = false;

  function valHablando() {
    return !!(window.responseAudio || (window.speechSynthesis && window.speechSynthesis.speaking));
  }

  function cortarVoz() {
    try { if (window.responseAudio) { window.responseAudio.pause(); window.responseAudio = null; } } catch (_) {}
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
    try { window.stopFiller && window.stopFiller(); } catch (_) {}
  }

  /* ============ ÚNICO MOTOR DE ESCUCHA ============ */
  function abrir() {
    if (activo || !window.session) return;
    try {
      rec = new SR();
      rec.lang = 'es-CO';
      rec.continuous = true;
      rec.interimResults = true;   // clave para barge-in y transcripción fluida
      rec.maxAlternatives = 1;

      let acumulado = '';

      rec.onresult = function (e) {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) acumulado += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        const loNuevo = interim.trim();

        // ---- BARGE-IN: si Val habla y el usuario está diciendo algo → cortar ya ----
        if (valHablando() && (loNuevo.length > 1 || acumulado.trim().length > 1)) {
          interrumpiendo = true;
          cortarVoz();
          window.setMode && window.setMode('listening');
        }

        // ---- Turno del usuario detectado (frase final) ----
        if (acumulado.trim()) {
          const texto = acumulado.trim();
          acumulado = '';
          window.busy = false;
          window.setMode && window.setMode('thinking');
          cerrar();              // soltar el mic mientras procesa
          window.ask && window.ask(texto);
        }
      };

      rec.onerror = function (e) {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          window.micBlocked = true;
          const aviso = 'Necesito permiso del micrófono: toca el candado de la barra de dirección, permite el micrófono y recarga la página.';
          window.addMsg && window.addMsg(aviso, 'bot');
          try { window.speak && window.speak(aviso); } catch (_) {}
        }
        // 'no-speech' y 'network' se reintentan en onend
      };

      rec.onend = function () {
        activo = false;
        // conversación continua: reabrir si nadie habla y Val no está respondiendo
        if (window.session && !window.busy && !window.micBlocked) {
          setTimeout(abrir, interrumpiendo ? 200 : 600);
          interrumpiendo = false;
        }
      };

      rec.start();
      activo = true;
      window.setMode && window.setMode('listening');
    } catch (e) {
      activo = false;
      setTimeout(abrir, 1500); // reintentar (a veces Chrome tarda en soltar el mic)
    }
  }

  function cerrar() {
    if (rec && activo) { try { rec.stop(); } catch (_) {} }
    activo = false;
  }

  /* ============ NEUTRALIZAR EL PIPELINE VIEJO DEL CORE ============ */
  // listen() YA NO abre getUserMedia/MediaRecorder: solo maneja nuestro motor.
  window.listen = function () {
    if (!window.session) { const sb = document.getElementById('startBtn'); sb && sb.click(); return; }
    abrir();
  };
  // El MediaRecorder jamás debe abrirse de nuevo (conflicto de mic en Android)
  window.stopRecording = function () { cerrar(); };
  window.transcribe = function () { /* obsoleto: el texto llega directo por SR */ };
  // scheduleNextListen del core ya no dispara MediaRecorder
  window.scheduleNextListen = function (ms) { setTimeout(function(){ if (window.session && !window.busy) abrir(); }, ms || 600); };
  // watchdog del core (12s): ya no hace nada — nuestro onend gestiona la continuidad
  window.setInterval = (function (orig) {
    return function (fn, ms) {
      // el watchdog del core pasa una función que llama scheduleNextListen(0): inofensiva ya
      return orig.call(window, fn, ms);
    };
  })(window.setInterval);

  /* ============ ANTI-ECO con reanudación: cuando Val TERMINA de hablar, volver a escuchar ============ */
  const origSpeak = window.speak;
  if (origSpeak) {
    window.speak = async function (text) {
      // NO cerramos el mic: lo dejamos ABIERTO para el barge-in.
      // Solo ignoramos resultados mientras el TTS arranca (200ms de gracia).
      try { return await origSpeak(text); }
      finally {
        if (window.session && !window.busy) setTimeout(abrir, 400);
      }
    };
  }

  /* ============ SERVICIOS VISUALES: tarjetas cuando preguntan por tratamientos ============ */
  const origAskCore = window.ask;
  if (origAskCore) {
    window.ask = function (text) {
      const t = String(text || '').toLowerCase();
      if (/(servicios|tratamientos|que tienen|catalogo|opciones|menu)/.test(t)) {
        mostrarServicios();
      }
      return origAskCore.apply(this, arguments);
    };
  }

  function mostrarServicios() {
    try {
      let cont = document.getElementById('val-servicios');
      if (!cont) {
        cont = document.createElement('div');
        cont.id = 'val-servicios';
        cont.style.cssText = 'position:fixed;bottom:120px;left:12px;right:12px;z-index:70;max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(cont);
      }
      cont.innerHTML = '';
      const data = window.ValSheet && window.__valSheetCache;
      // El cerebro cachea DATA internamente; usamos el fixture vía ValSheet.leer()
      window.ValSheet.leer().then(function (d) {
        (d.catalogo || []).slice(0, 8).forEach(function (s) {
          const card = document.createElement('div');
          card.style.cssText = 'background:rgba(17,20,24,.94);border:1px solid rgba(78,222,163,.35);border-radius:18px;padding:12px 16px;backdrop-filter:blur(14px);display:flex;justify-content:space-between;align-items:center;';
          card.innerHTML =
            '<div><div style="font-weight:600;color:#eef7f2;font-size:14px;">' + s.nombre + '</div>' +
            '<div style="color:#94a3b8;font-size:12px;">' + s.duracion_min + ' min · ' + s.descripcion.slice(0, 60) + '</div></div>' +
            '<div style="color:#4edea3;font-weight:700;font-size:15px;">$' + Number(s.precio_cop).toLocaleString('es-CO') + '</div>';
          cont.appendChild(card);
        });
        // botón cerrar
        const close = document.createElement('button');
        close.textContent = 'Cerrar ✕';
        close.style.cssText = 'align-self:center;background:rgba(17,20,24,.94);border:1px solid #1E262B;color:#94a3b8;border-radius:9999px;padding:6px 18px;font-size:12px;';
        close.onclick = function () { cont.remove(); };
        cont.appendChild(close);
        // auto-ocultar tras 25s
        setTimeout(function () { cont.remove(); }, 25000);
      }).catch(function(){});
    } catch (_) {}
  }

  console.log('[Val Listen-Solo] motor único SpeechRecognition + barge-in interim + tarjetas de servicios');
})();
