#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""make_orb_mic.py — Genera val-orb-mic.js: convierte el ORB CENTRAL de Stitch
en el micrófono real (clicable, animado, ondas al hablar, cambio de color por estado).
El FAB de abajo se oculta (queda como respaldo táctil opcional).
"""

PATCH = r"""
/* ====== VAL ORB-MIC: el círculo central ES el micrófono ====== */
(function(){
  if (window.__valOrbMic) return; window.__valOrbMic = true;

  const orbCore = document.getElementById('orb-core');
  const orbHalo = document.getElementById('orb-halo');
  const r1 = document.getElementById('orb-ripple-1');
  const r2 = document.getElementById('orb-ripple-2');
  const eq  = document.getElementById('orb-equalizer');
  const fab = document.getElementById('main-fab');
  if (!orbCore) return;

  /* 1. El orb central es clicable = mismo comportamiento que el FAB */
  const sb = document.getElementById('startBtn');
  orbCore.style.cursor = 'pointer';
  orbCore.style.userSelect = 'none';
  orbCore.addEventListener('click', function(){
    if (!window.session) { sb && sb.click(); return; }
    if (window.recording) { window.stopRecording && window.stopRecording(); }
    else if (!window.busy && !window.micBlocked) { window.listen && window.listen(); }
  });

  /* 2. Ocultar el FAB inferior (el orb es ahora el control único) */
  if (fab) { fab.style.display = 'none'; }

  /* 3. Animaciones por estado con colores y ondas reales */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes valOrbPulse {
      0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(16,185,129,.45), 0 0 32px -8px rgba(16,185,129,.35); }
      50%  { transform: scale(1.06); box-shadow: 0 0 0 18px rgba(16,185,129,0), 0 0 48px -4px rgba(16,185,129,.55); }
      100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(16,185,129,0), 0 0 32px -8px rgba(16,185,129,.35); }
    }
    @keyframes valOrbThink {
      0%   { transform: rotate(0deg) scale(1.03); box-shadow: 0 0 42px -6px rgba(245,158,11,.5); }
      100% { transform: rotate(360deg) scale(1.03); box-shadow: 0 0 42px -6px rgba(245,158,11,.5); }
    }
    @keyframes valOrbSpeak {
      0%   { transform: scale(1);    box-shadow: 0 0 36px -6px rgba(56,189,248,.45); }
      50%  { transform: scale(1.05); box-shadow: 0 0 60px -4px rgba(56,189,248,.65); }
      100% { transform: scale(1);    box-shadow: 0 0 36px -6px rgba(56,189,248,.45); }
    }
    @keyframes valRipple {
      0%   { transform: scale(1);   opacity:.7; }
      100% { transform: scale(1.9); opacity:0; }
    }
    @keyframes valIdleBreath {
      0%   { transform: scale(1);    box-shadow: 0 0 24px -8px rgba(78,222,163,.25); }
      50%  { transform: scale(1.02); box-shadow: 0 0 34px -6px rgba(78,222,163,.4); }
      100% { transform: scale(1);    box-shadow: 0 0 24px -8px rgba(78,222,163,.25); }
    }
    .val-orb-idle      { animation: valIdleBreath 3.2s ease-in-out infinite; border-color: rgba(78,222,163,.35) !important; }
    .val-orb-listening { animation: valOrbPulse 1.15s ease-in-out infinite; border-color: #10B981 !important; }
    .val-orb-thinking  { animation: valOrbThink 1.6s linear infinite; border-color: #F59E0B !important; }
    .val-orb-speaking  { animation: valOrbSpeak .9s ease-in-out infinite; border-color: #38BDF8 !important; }
    .val-ripple-on { display:block !important; animation: valRipple 1.15s ease-out infinite; }
    .val-eq-on { display:flex !important; }
  `;
  document.head.appendChild(style);

  /* 4. setVoiceState real sobre el orb: clase + ondas + equalizador */
  const prevSetState = window.setVoiceState;
  window.setVoiceState = function(state){
    try { prevSetState && prevSetState(state); } catch(_){}

    orbCore.classList.remove('val-orb-idle','val-orb-listening','val-orb-thinking','val-orb-speaking');
    [r1, r2].forEach(el => el && el.classList.remove('val-ripple-on'));
    eq && eq.classList.remove('val-eq-on');

    switch(state){
      case 'listening':
        orbCore.classList.add('val-orb-listening');
        r1 && r1.classList.add('val-ripple-on');
        r2 && r2.classList.add('val-ripple-on');
        break;
      case 'thinking':
        orbCore.classList.add('val-orb-thinking');
        break;
      case 'speaking':
        orbCore.classList.add('val-orb-speaking');
        eq && eq.classList.add('val-eq-on');
        break;
      default: // idle
        orbCore.classList.add('val-orb-idle');
    }
  };

  /* 5. Asegurar arranque en idle animado */
  window.setVoiceState && window.setVoiceState('idle');

  /* 6. Mic icono dentro del orb (reemplaza el icono decorativo) */
  const micSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:44px;height:44px;color:#4edea3;filter:drop-shadow(0 0 8px rgba(16,185,129,.6));"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v3"/></svg>';
  const container = orbCore.querySelector('.flex.items-center.justify-center') || orbCore;
  const iconHost = document.createElement('div');
  iconHost.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:20;pointer-events:none;';
  iconHost.innerHTML = micSvg;
  const micIconEl = iconHost.firstElementChild;
  orbCore.appendChild(iconHost);

  /* 7. El icono del mic reacciona al estado (color) */
  const prevSetState2 = window.setVoiceState;
  window.setVoiceState = function(state){
    prevSetState2 && prevSetState2(state);
    if (!micIconEl) return;
    const colors = { listening:'#10B981', thinking:'#F59E0B', speaking:'#38BDF8', idle:'#4edea3' };
    micIconEl.style.color = colors[state] || colors.idle;
  };

  console.log('[Val Orb-Mic] el círculo central es el micrófono: click=escuchar, ondas+colores por estado');
})();
"""

if __name__ == '__main__':
    p = r'C:\Users\Usuario\AppData\Local\hermes\val-repo\val-orb-mic.js'
    with open(p, 'w', encoding='utf-8') as f:
        f.write(PATCH)
    print('ORB-MIC OK ->', p, len(PATCH), 'chars')
