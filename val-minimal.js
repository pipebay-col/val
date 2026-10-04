/* val-minimal.js — UI MINIMALISTA pura sobre el pipeline original.
 * Simplifica la interfaz del core al lenguaje de la referencia Stitch:
 * - Oculta dock/carritos/agenda/log (demo no los necesita).
 * - Deja: orb central grande, status, chips esenciales y barra de texto.
 * - Chips de PRODUCTO (¿Qué puede hacer Val? / Planes / Instalar).
 * CSS/HTML aditivo — cero JS de voz.
 */
(function () {
  if (window.__valMinimal) return; window.__valMinimal = true;

  const hide = (sel) => document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; });

  // Ocultar componentes del demo que no aplican a la demo de producto
  hide('#holoDock, .holo-dock, #dock, .dock, #drAgenda, #drCart, #drLog, #fabAgenda, #fabCart, #fabLog, .fab, .drawer, #backdrop');

  // Chips nuevos de producto (reemplazan los del core)
  const oldChips = document.getElementById('chips');
  if (oldChips) {
    oldChips.innerHTML = '';
    const nuevo = document.createElement('div');
    nuevo.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;padding:0 14px;';
    const chips = [
      ['¿Qué puede hacer Val?', 'qué puede hacer Val por mi empresa'],
      ['Planes y precios', 'cuánto cuesta el asistente'],
      ['Cómo la instalo', 'cómo instalo Val en mi negocio'],
      ['Agendar una demo', 'quiero agendar una demo de Val'],
    ];
    chips.forEach(([label, prompt]) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = label;
      b.style.cssText = 'background:rgba(17,20,24,.85);border:1px solid rgba(78,222,163,.35);color:#e2e2e5;border-radius:9999px;padding:9px 16px;font-size:12px;backdrop-filter:blur(10px);cursor:pointer;transition:all .2s;';
      b.onmouseenter = () => { b.style.borderColor = '#10B981'; b.style.background = 'rgba(16,185,129,.15)'; };
      b.onmouseleave = () => { b.style.borderColor = 'rgba(78,222,163,.35)'; b.style.background = 'rgba(17,20,24,.85)'; };
      b.onclick = () => {
        window.session = true;
        const st = document.getElementById('start'); st && st.classList.add('hide');
        window.ask && window.ask(prompt);
      };
      nuevo.appendChild(b);
    });
    oldChips.appendChild(nuevo);
  }

  // Título de estado inicial limpio
  const status = document.getElementById('status');
  if (status && !window.session) status.textContent = 'Toca el círculo para hablar con Val';

  console.log('[Val Minimal] UI simplificada: orb + status + chips producto + input');
})();
