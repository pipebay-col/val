/* val-listen-solo.js — Motor ÚNICO de escucha (v3 — estable en Android).
 * Cambios v3 (fix "SR: reiniciando… eterno"):
 * - continuous=false por TURNO (en Android continuous=true cicla onend sin escuchar).
 * - Backoff con límite: 3 reintentos rápidos, luego 3s, luego aviso por voz y pausa.
 * - onend solo reabre si el SR estuvo abierto >1.2s (cerró por GUION, no por bug).
 * - El barge-in se mantiene: interimResults=true + mic abierto mientras Val habla
 *   se logra re-abriendo el SR en cada turno con espera corta.
 */
(function () {
  if (window.__valListenSolo) return; window.__valListenSolo = true;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { console.warn('[Val Listen-Solo] sin SpeechRecognition'); return; }

  let rec = null;
  let activo = false;
  let fallosSeguidos = 0;
  let tInicio = 0;

  function valHablando() {
    return !!(window.responseAudio || (window.speechSynthesis && window.speechSynthesis.speaking));
  }

  function cortarVoz() {
    try { if (window.responseAudio) { window.responseAudio.pause(); window.responseAudio = null; } } catch (_) {}
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
    try { window.stopFiller && window.stopFiller(); } catch (_) {}
  }

  function setDbg(txt, color) {
    const d = document.getElementById('val-sr-debug');
    if (d) { d.textContent = txt; d.style.color = color || '#64748b'; }
  }
  function ensureDbg() {
    if (!document.getElementById('val-sr-debug')) {
      const dbg = document.createElement('div');
      dbg.id = 'val-sr-debug';
      dbg.style.cssText = 'position:fixed;top:6px;right:8px;z-index:999;font-size:10px;color:#64748b;font-family:monospace;background:rgba(10,12,14,.7);padding:3px 8px;border-radius:8px;pointer-events:none;opacity:.85;';
      document.body.appendChild(dbg);
    }
  }

  function abrir() {
    if (activo) return;
    if (!window.session) {
      window.session = true;
      const st = document.getElementById('start'); st && st.classList.add('hide');
    }
    if (window.micBlocked) return;
    ensureDbg();

    try {
      rec = new SR();
      rec.lang = 'es-CO';
      rec.continuous = false;        // POR TURNO: mucho más estable en Android
      rec.interimResults = true;     // interim para barge-in
      rec.maxAlternatives = 1;

      let acumulado = '';

      rec.onresult = function (e) {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) acumulado += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        // BARGE-IN: usuario habla mientras Val habla → cortar voz
        if (valHablando() && ((interim + acumulado).trim().length > 1)) {
          cortarVoz();
          window.setMode && window.setMode('listening');
        }
        if (acumulado.trim()) {
          const texto = acumulado.trim();
          acumulado = '';
          fallosSeguidos = 0;
          window.busy = false;
          window.setMode && window.setMode('thinking');
          try { rec.stop(); } catch (_) {}
          activo = false;
          window.ask && window.ask(texto);
        }
      };

      rec.onerror = function (e) {
        setDbg('SR err: ' + e.error, '#F59E0B');
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          window.micBlocked = true;
          setDbg('SR: sin permiso', '#ef4444');
          const aviso = 'Necesito permiso del micrófono: toca el candado de la barra de dirección, permite el micrófono y recarga la página.';
          window.addMsg && window.addMsg(aviso, 'bot');
          try { window.speak && window.speak(aviso); } catch (_) {}
        }
        // 'no-speech' es normal entre turnos; 'network' se reintenta con backoff
      };

      rec.onend = function () {
        activo = false;
        const duracion = Date.now() - tInicio;
        if (window.session && !window.micBlocked && !valHablando()) {
          window.busy = false;
          if (duracion < 1200) {
            // cierre sospechosamente rápido = arranque fallido en Android
            fallosSeguidos++;
            if (fallosSeguidos > 6) {
              setDbg('SR: problema de micrófono', '#ef4444');
              const aviso = 'El micrófono no está respondiendo bien. Cierra y abre la pestaña, o escríbeme abajo mientras tanto.';
              window.addMsg && window.addMsg(aviso, 'bot');
              try { window.speak && window.speak(aviso); } catch (_) {}
              fallosSeguidos = 3; // seguir reintentando pero más lento
              setTimeout(abrir, 4000);
              return;
            }
            setDbg('SR: reintentando', '#64748b');
            setTimeout(abrir, fallosSeguidos > 3 ? 3000 : 800);
          } else {
            // cierre normal tras turno: reabrir pronto (conversación continua)
            setDbg('SR: escuchando', '#10B981');
            setTimeout(abrir, 500);
          }
        }
      };

      rec.start();
      activo = true;
      tInicio = Date.now();
      fallosSeguidos = Math.max(0, fallosSeguidos - 1); // apertura exitosa va bajando el contador
      setDbg('SR: escuchando', '#10B981');
      window.setMode && window.setMode('listening');
    } catch (e) {
      activo = false;
      fallosSeguidos++;
      setDbg('SR: reintento…', '#64748b');
      setTimeout(abrir, fallosSeguidos > 3 ? 3000 : 1500);
    }
  }

  function cerrar() {
    if (rec && activo) { try { rec.stop(); } catch (_) {} }
    activo = false;
  }

  /* Pipeline público */
  window.listen = function () {
    if (!window.session) {
      window.session = true;
      const st = document.getElementById('start'); st && st.classList.add('hide');
    }
    abrir();
  };
  window.stopRecording = function () { cerrar(); };
  window.transcribe = function () {};
  window.scheduleNextListen = function (ms) {
    setTimeout(function () { if (window.session && !window.busy) abrir(); }, ms || 600);
  };

  /* speak: reanudar escucha al terminar de hablar */
  const origSpeak = window.speak;
  if (origSpeak) {
    window.speak = async function (text) {
      try { return await origSpeak(text); }
      finally {
        if (window.session && !window.micBlocked) setTimeout(abrir, 400);
      }
    };
  }

  /* Chips de producto → preguntas al cerebro */
  const origAskCore = window.ask;
  if (origAskCore) {
    window.ask = function (text) {
      return origAskCore.apply(this, arguments);
    };
  }

  /* Heartbeat: garantía de conversación (cada 6s si nada está activo) */
  setInterval(function () {
    if (window.session && !activo && !valHablando() && !window.micBlocked) {
      abrir();
    }
  }, 6000);

  setDbg('SR: listo', '#64748b');
  console.log('[Val Listen-Solo v3] turno a turno con backoff — estable en Android');
})();
