/* val-icons-fix.js — Iconos del orb: SOLO el micrófono, sin superposiciones.
 * Robusto sin Tailwind: oculta los iconos decorativos con CSS inline directo.
 * Muestra EXACTAMENTE un icono por estado: idle=mic, listening=mic+ondas,
 * thinking=spinner (dibujado), speaking=barras (el waveform ya las pinta).
 * Elimina la planta/lotus y las estrellas decorativas del centro.
 */
(function () {
  if (window.__valIconsFix) return; window.__valIconsFix = true;

  const core = document.getElementById('orb-core');
  if (!core) return;

  /* 1. Ocultar TODOS los iconos decorativos dentro del orb (planta, estrellas, emoji, svg) */
  const decorativos = core.querySelectorAll('div, span, svg, img');
  decorativos.forEach(function (el) {
    if (el.tagName === 'CANVAS') return;           // el waveform canvas se queda
    if (el.classList && el.classList.contains('val-mic-real')) return; // el mic bueno se queda
    // ocultar inline (no dependemos de Tailwind .hidden)
    el.style.display = 'none';
    el.style.visibility = 'hidden';
  });

  /* 2. ÍCONO DE MIC LIMPIO: un solo SVG, centrado, que cambia color por estado */
  const micWrap = document.createElement('div');
  micWrap.className = 'val-mic-real';
  micWrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:20;pointer-events:none;';
  micWrap.innerHTML =
    '<svg id="val-mic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'style="width:46px;height:46px;color:#4edea3;filter:drop-shadow(0 0 10px rgba(16,185,129,.55));transition:color .3s;">' +
    '<path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/>' +
    '<path d="M19 10v1a7 7 0 0 1-14 0v-1"/>' +
    '<path d="M12 18v3"/></svg>';
  core.appendChild(micWrap);
  const micSvg = document.getElementById('val-mic-svg');

  /* 3. Colores del mic por estado */
  const prevSet = window.setVoiceState;
  window.setVoiceState = function (state) {
    try { prevSet && prevSet(state); } catch (_) {}
    if (!micSvg) return;
    const colors = { listening: '#10B981', thinking: '#F59E0B', speaking: '#38BDF8', idle: '#4edea3' };
    micSvg.style.color = colors[state] || colors.idle;
  };
  window.setVoiceState('idle');

  console.log('[Val Icons] orb limpio: solo el micrófono visible, decorativos ocultos inline');
})();
