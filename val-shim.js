/* val-shim.js — Capa de compatibilidad self-hosted de Val v1.0 (decisión D-004).
 * Intercepta los 4 fetch('/api/...') del demo y los resuelve SIN backend:
 *   /api/tts             → Response vacío (el demo ya cae a speechSynthesis)
 *   /api/asr             → webkitSpeechRecognition es-CO (Web Speech API)
 *   /api/voice-assistant → ValBrain (cerebro local, catálogo del Sheet)
 *   /api/bookings        → link wa.me prellenado (§3.3) + registro de uso
 * También inyecta el gate del banco gratuito (§6) en ask() y el arranque.
 * Este archivo SE CARGA ANTES que el <script> del demo (ver valeria.html).
 */
(function () {
  const C = () => window.VAL_CONFIG || {};
  const realFetch = window.fetch ? window.fetch.bind(window) : null;

  /* ================= TTS: dejar que el demo use su fallback nativo ================= */
  async function ttsFake(text) {
    // El demo ya tiene fallback a speechSynthesis cuando /api/tts falla (catch → utterance).
    // Devolvemos un 502 controlado para que caiga ahí — voz Web Speech API (§5).
    return new Response(JSON.stringify({ ok: false, reason: 'self-hosted: tts nativo' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  /* ================= ASR: Web Speech API ================= */
  function reconocer() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return Promise.reject(new Error('Este navegador no soporta reconocimiento de voz. Usa Chrome o Edge, o escríbeme abajo.'));
    return new Promise((resolve, reject) => {
      const rec = new SR();
      rec.lang = 'es-CO';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      let got = false;
      const to = setTimeout(() => { try { rec.stop(); } catch (_) {} if (!got) reject(new Error('timeout')); }, 12000);
      rec.onresult = e => { got = true; clearTimeout(to); const t = e.results[0][0].transcript; resolve({ ok: true, text: t }); };
      rec.onerror = e => { got = true; clearTimeout(to); reject(new Error('asr:' + e.error)); };
      rec.onend = () => { clearTimeout(to); if (!got) reject(new Error('asr:silencio')); };
      rec.start();
    });
  }

  /* ================= Citas: wa.me prellenado (§3.3) ================= */
  function waLink(mensaje) {
    const num = String(C().WHATSAPP || '').replace(/\D/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(mensaje);
  }

  /* ================= bookings → wa.me ================= */
  async function bookingsFake(body) {
    const servicios = body.servicios ? String(body.servicios) : '';
    const mensaje = `Nueva cita web (Val):\n• Nombre: ${body.nombre || 'Visitante'}\n• Teléfono: ${body.telefono || '-'}\n• Fecha: ${body.fecha} ${body.hora}\n• Servicio: ${servicios || 'por confirmar'}\n(Registrada desde la página de Val)`;
    const url = waLink(mensaje);
    try { window.open(url, '_blank'); } catch (_) {}
    return new Response(JSON.stringify({ ok: true, whatsapp: true, url }), { headers: { 'Content-Type': 'application/json' } });
  }

  /* ================= voice-assistant → ValBrain + quota ================= */
  async function assistantFake(body) {
    const text = String(body.text || '');
    // §6.2: banco agotado → máximo 3 mensajes por sesión con CTA
    const st = window.ValQuota.registrarMensaje();
    if (st.exhausted) {
      if (window.ValQuota.limiteSesionAlcanzado()) {
        return new Response(JSON.stringify({
          ok: true,
          answer: window.ValQuota.ctaTexto() + ' ' + window.ValQuota.ctaUrl(),
          action: 'quota_exhausted', args: { url: window.ValQuota.ctaUrl() },
          history: [],
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }
    try {
      const r = await window.ValBrain.responder(text, body.history || []);
      return new Response(JSON.stringify({ ok: true, answer: r.answer, action: r.action || null, args: r.args || {}, history: (body.history || []).slice(-8) }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      // Sheet sin configurar o caído → respuesta honesta, nunca inventar (§3.5)
      const msg = String(e && e.message || e).includes('SHEET_ID')
        ? 'Aún no está conectada la información de la clínica (configura tu Google Sheet). Mientras tanto puedes escribirle directo a la clínica por el botón de WhatsApp.'
        : 'Déjame confirmar ese dato con la clínica y te escribo por WhatsApp enseguida.';
      return new Response(JSON.stringify({ ok: true, answer: msg, action: 'derivar', args: {}, history: [] }), { headers: { 'Content-Type': 'application/json' } });
    }
  }

  /* ================= interceptor ================= */
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const body = init && init.body ? JSON.parse(init.body) : {};
    if (url.includes('/api/tts')) return ttsFake(body.text);
    if (url.includes('/api/asr')) return reconocer().then(j => new Response(JSON.stringify(j), { headers: { 'Content-Type': 'application/json' } })).catch(e => new Response(JSON.stringify({ ok: false, error: String(e.message || e) }), { headers: { 'Content-Type': 'application/json' } }));
    if (url.includes('/api/bookings')) return bookingsFake(body);
    if (url.includes('/api/voice-assistant')) return assistantFake(body);
    return realFetch ? realFetch(input, init) : Promise.reject(new Error('offline: ' + url));
  };

  /* ================= doAction de ValBrain (el demo define el suyo; ampliamos) ================= */
  // El demo tiene doAction(action, args) propio para add/cita/agenda. ValBrain emite:
  //   'derivar'        → abre wa.me con mensaje de transferencia
  //   'confirmar_cita' → abre wa.me con el resumen de la cita (§3.3)
  //   'quota_exhausted'→ abre la página de planes (§6.2)
  // Se engancha a nivel documento (bubbling) para no tocar el script del demo.
  const WA_GENERIC = 'Hola, vengo de la página web y quiero hablar con un asesor humano, por favor.';
  const _open = window.open ? window.open.bind(window) : null;
  function abrirWa(msg) {
    const url = waLink(msg || WA_GENERIC);
    if (_open) { _open(url, '_blank'); } else { location.href = url; }
  }
  // exponer para el parche del HTML (lo llama el doAction del demo extendido)
  window.__valAbrirWa = abrirWa;

/* ================= BARGE-IN (interrupción real) ================= */
// Hook para que el demo interrumpa TTS cuando usuario habla
window.__valBargeIn = function() {
  if (window.speakOn && window.responseAudio) {
    try { window.responseAudio.pause(); window.responseAudio = null; } catch(_) {}
    window.stopFiller && window.stopFiller();
    window.setMode && window.setMode('listening');
    window.listen && window.listen(); // empieza a escuchar ya
    return true;
  }
  return false;
};

// Detectar voz del usuario mientras Val habla (usando analyser si existe)
let __bargeInterval = null;
function __startBargeDetection() {
  if (__bargeInterval) return;
  __bargeInterval = setInterval(() => {
    if (window.speakOn && window.responseAudio && !window.recording && !window.micBlocked && window.analyser) {
      const buf = new Uint8Array(window.analyser.frequencyBinCount);
      window.analyser.getByteFrequencyData(buf);
      const level = buf.reduce((a,b)=>a+b,0) / buf.length;
      if (level > 18) { // umbral de voz detectada
        window.__valBargeIn();
      }
    }
  }, 150);
}
function __stopBargeDetection() {
  if (__bargeInterval) { clearInterval(__bargeInterval); __bargeInterval = null; }
}
// Auto-arrancar cuando empiece a hablar Val
const _origSpeak = window.speak;
if (_origSpeak) {
  window.speak = async function(text) {
    __startBargeDetection();
    try { return await _origSpeak(text); }
    finally { __stopBargeDetection(); }
  };
}

})();
