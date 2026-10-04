/* val-waveform.js — Waveform moderno dentro del orb (líneas modulares de audio reales).
 * Reemplaza las animaciones CSS genéricas: ahora el orb muestra las BARRAS DE AUDIO
 * que reaccionan al micrófono (AnalyserNode) cuando escucha, y a un patrón de habla
 * sintético cuando Val habla. Estados: idle (línea plana suave), listening (barras
 * reales del mic), thinking (barras girando ámbar), speaking (barras hablando azules).
 */
(function () {
  if (window.__valWaveform) return; window.__valWaveform = true;

  const orbCore = document.getElementById('orb-core');
  if (!orbCore) return;

  /* ---- Canvas waveform centrado en el orb ---- */
  const N = 14; // número de barras
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:15;pointer-events:none;';
  orbCore.appendChild(cv);
  const ctx = cv.getContext('2d');

  function sizeCanvas() {
    const r = orbCore.getBoundingClientRect();
    cv.width = Math.max(10, r.width); cv.height = Math.max(10, r.height);
  }
  window.addEventListener('resize', sizeCanvas);
  setTimeout(sizeCanvas, 60); // tras layout inicial

  /* ---- Estado global de animación ---- */
  let mode = 'idle';        // idle | listening | thinking | speaking
  let micData = null;        // Uint8Array del analyser del core (si existe)
  let t = 0;

  function levelFromMic() {
    // Si el voice core dejó un analyser vivo, úsalo (window.analyser es global del core)
    try {
      if (window.analyser && window.recording) {
        const buf = new Uint8Array(window.analyser.frequencyBinCount);
        window.analyser.getByteFrequencyData(buf);
        const lvl = buf.reduce((a, b) => a + b, 0) / buf.length / 255; // 0..1
        return { lvl, buf };
      }
    } catch (_) {}
    return null;
  }

  function drawIdle(h) {
    // Línea plana que respira
    const breathe = Math.sin(t / 40) * 2;
    for (let i = 0; i < N; i++) {
      const bh = 4 + breathe + Math.sin(i + t / 30) * 1.5;
      h[i] = Math.max(3, bh);
    }
  }

  function drawListening(h, mic) {
    // Barras REALES del micrófono (o seno energético si no hay analyser)
    const buf = mic && mic.buf;
    for (let i = 0; i < N; i++) {
      let v;
      if (buf) {
        // mapear el espectro a las N barras (log-ish)
        const idx = Math.floor((i / N) * (buf.length * 0.6));
        v = buf[idx] / 255;
      } else {
        v = 0.25 + Math.abs(Math.sin(t / 12 + i * 0.7)) * 0.35 * (0.6 + 0.4 * Math.sin(t / 90));
      }
      h[i] = 6 + v * (cv.height * 0.42);
    }
  }

  function drawThinking(h) {
    // Onda girando amable (barras con desfase circular)
    for (let i = 0; i < N; i++) {
      const w = Math.sin(t / 9 + (i / N) * Math.PI * 2);
      h[i] = 8 + Math.abs(w) * cv.height * 0.22;
    }
  }

  function drawSpeaking(h) {
    // Patrón de habla: picos alternos orgánicos (Val hablando)
    const s = Math.sin(t / 6);
    for (let i = 0; i < N; i++) {
      const base = Math.sin(i * 1.7 + t / 5) * 0.5 + 0.5;
      const env = 0.55 + 0.45 * Math.sin(t / 14);
      h[i] = 6 + base * env * cv.height * 0.4 * (0.7 + 0.3 * s);
    }
  }

  const COLORS = {
    idle:     ['rgba(78,222,163,.75)', 'rgba(78,222,163,.35)'],
    listening:['rgba(16,185,129,.95)', 'rgba(16,185,129,.45)'],
    thinking: ['rgba(245,158,11,.95)', 'rgba(245,158,11,.45)'],
    speaking:['rgba(56,189,248,.95)', 'rgba(56,189,248,.45)'],
  };

  function frame() {
    t++;
    sizeCanvas();
    const mic = mode === 'listening' ? levelFromMic() : null;
    const h = new Array(N);
    if (mode === 'listening') drawListening(h, mic);
    else if (mode === 'thinking') drawThinking(h);
    else if (mode === 'speaking') drawSpeaking(h);
    else drawIdle(h);

    ctx.clearRect(0, 0, cv.width, cv.height);
    const [c1, c2] = COLORS[mode] || COLORS.idle;
    const gap = cv.width / (N * 2 - 1);
    const bw = Math.max(2, gap * 0.72);
    for (let i = 0; i < N; i++) {
      const x = (i * 2 + 1) * gap - bw / 2;
      const bh = h[i];
      const y = (cv.height - bh) / 2;
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, bw, bh, bw / 2) : ctx.rect(x, y, bw, bh);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---- Gancho de estados: el core/ux-patch llaman setVoiceState → sincronizar modo ---- */
  const prev = window.setVoiceState;
  window.setVoiceState = function (state) {
    try { prev && prev(state); } catch (_) {}
    mode = (state === 'listening' || state === 'thinking' || state === 'speaking') ? state : 'idle';
  };
  // Arrancar en idle
  window.setVoiceState('idle');

  console.log('[Val Waveform] barras de audio reales dentro del orb (mic → listening, patrón → speaking)');
})();
