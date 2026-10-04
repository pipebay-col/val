/* val-skin.js — CAPA VISUAL Stitch sobre el pipeline ORIGINAL (cero JS de voz).
 * REGLA INVIOLABLE: este archivo NO toca listen/transcribe/speak/ask/VAD.
 * Solo reemplaza la estética del orb/estados/chips con el look "Obsidian Emerald"
 * de Stitch: microgrid de fondo, orb con glow animado por estado, colores
 * (idle esmeralda, listening verde pulso, thinking ámbar giro, speaking azul),
 * chips pill, barra de texto flotante. Todo CSS + un pequeño hook en setMode
 * que SOLO cambia clases CSS (no intercepta el mic).
 */
(function () {
  if (window.__valSkin) return; window.__valSkin = true;

  /* ============ 1. CSS: tema Obsidian Emerald ============ */
  const css = `
  /* fondo: microgrid sutil + aurora esmeralda */
  body { background:#0a0c0e !important; }
  body::before {
    content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
    background-image:
      linear-gradient(rgba(30,38,43,.45) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30,38,43,.45) 1px, transparent 1px);
    background-size:24px 24px; opacity:.5;
  }
  body::after {
    content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
    background:radial-gradient(ellipse 60% 40% at 50% 38%, rgba(16,185,129,.14), transparent 60%),
               radial-gradient(ellipse 40% 30% at 85% 85%, rgba(16,185,129,.07), transparent 60%);
  }
  .stage, .bg, #bg { background:transparent !important; }
  .stars, #stars { opacity:.25 !important; }

  /* ============ ORB: núcleo obsidiana con aro esmeralda ============ */
  .orb-wrap { position:relative; }
  .big-orb, .orb {
    background:radial-gradient(circle at 35% 30%, #16211b 0%, #0d1210 45%, #070a08 100%) !important;
    border:1px solid rgba(78,222,163,.4) !important;
    box-shadow:0 0 32px -8px rgba(16,185,129,.35), inset 0 0 40px rgba(0,0,0,.6) !important;
    transition:box-shadow .4s ease, border-color .4s ease !important;
  }
  .orb-wrap.idle .big-orb, .orb-wrap.idle .orb {
    animation: valOrbBreath 3.2s ease-in-out infinite !important;
    border-color:rgba(78,222,163,.35) !important;
  }
  .orb-wrap.listening .big-orb, .orb-wrap.listening .orb {
    animation: valOrbPulse 1.1s ease-in-out infinite !important;
    border-color:#10B981 !important;
    box-shadow:0 0 44px -4px rgba(16,185,129,.6) !important;
  }
  .orb-wrap.thinking .big-orb, .orb-wrap.thinking .orb {
    animation: valOrbSpin 1.6s linear infinite !important;
    border-color:#F59E0B !important;
    box-shadow:0 0 44px -6px rgba(245,158,11,.5) !important;
  }
  .orb-wrap.speaking .big-orb, .orb-wrap.speaking .orb {
    animation: valOrbSpeak .9s ease-in-out infinite !important;
    border-color:#38BDF8 !important;
    box-shadow:0 0 56px -4px rgba(56,189,248,.65) !important;
  }
  @keyframes valOrbBreath { 0%,100%{transform:scale(1); box-shadow:0 0 24px -8px rgba(78,222,163,.25)} 50%{transform:scale(1.02); box-shadow:0 0 34px -6px rgba(78,222,163,.4)} }
  @keyframes valOrbPulse { 0%,100%{transform:scale(1); box-shadow:0 0 28px 2px rgba(16,185,129,.45)} 50%{transform:scale(1.05); box-shadow:0 0 48px -2px rgba(16,185,129,.75)} }
  @keyframes valOrbSpin { 0%{filter:hue-rotate(0deg) saturate(1.1)} 100%{filter:hue-rotate(360deg) saturate(1.1)} }
  @keyframes valOrbSpeak { 0%,100%{transform:scale(1); box-shadow:0 0 36px -6px rgba(56,189,248,.5)} 50%{transform:scale(1.04); box-shadow:0 0 60px -4px rgba(56,189,248,.8)} }

  /* ondas del listening (si el core las dibuja) */
  .orb-wrap.listening .wave i { background:#4edea3 !important; }

  /* ============ STATUS: tipografía Inter + colores tema ============ */
  #status { font-family:Inter,system-ui,sans-serif !important; color:#e2e2e5 !important; letter-spacing:.01em !important; }
  #status .wave { color:#4edea3 !important; }

  /* ============ CHIPS: pill obsidiana-esmeralda ============ */
  .chip, #chips .chip, #chips button {
    background:rgba(17,20,24,.85) !important;
    border:1px solid rgba(78,222,163,.35) !important;
    color:#e2e2e5 !important;
    border-radius:9999px !important;
    padding:8px 16px !important;
    font-size:12px !important;
    backdrop-filter:blur(10px);
    transition:all .2s ease !important;
  }
  .chip:hover, .chip:active {
    background:rgba(16,185,129,.18) !important;
    border-color:#10B981 !important;
    color:#fff !important;
    transform:translateY(-1px);
  }

  /* ============ INPUT de texto: pill flotante ============ */
  #textInput {
    background:rgba(17,20,24,.92) !important;
    border:1px solid rgba(78,222,163,.35) !important;
    color:#eef7f2 !important;
    border-radius:9999px !important;
    padding:10px 18px !important;
    outline:none !important;
    backdrop-filter:blur(12px);
  }
  #textInput:focus { border-color:#10B981 !important; box-shadow:0 0 0 3px rgba(16,185,129,.15) !important; }

  /* ============ BOTONES: mismo lenguaje ============ */
  button, .mini-btn {
    border-radius:9999px !important;
    border:1px solid rgba(78,222,163,.3) !important;
    background:rgba(17,20,24,.9) !important;
    color:#e2e2e5 !important;
    transition:all .2s ease !important;
  }
  button:hover, .mini-btn:hover { background:rgba(16,185,129,.15) !important; border-color:#10B981 !important; }

  /* burbujas del chat */
  .msg, .m { border-radius:16px !important; }
  `;
  const st = document.createElement('style');
  st.id = 'val-skin-css';
  st.textContent = css;
  document.head.appendChild(st);

  /* ============ 2. Estado visual por defecto ============ */
  // El core ya aplica orb-wrap + modo en setMode() — NO tocamos nada del pipeline.
  // Solo aseguramos el estado inicial del aro:
  const ow = document.getElementById('orbWrap');
  if (ow && !/idle|listening|thinking|speaking/.test(ow.className)) ow.classList.add('idle');

  console.log('[Val Skin] look Obsidian Emerald aplicado — pipeline de voz 100% intacto');
})();
