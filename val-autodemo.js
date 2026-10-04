/* val-autodemo.js — Modo auto-demo para el video (60s).
 * Carga DESPUÉS de todos los módulos (antes del script del demo).
 * Ejecuta una conversación GUIONIZADA sobre el cerebro REAL (ValBrain):
 * saludo → precio → agendar → 4 datos → confirmación → wa.me.
 * Se activa con ?demo=1 en la URL. Uso exclusivo del video §8.
 */
(function () {
  if (!/[?&]demo=1/.test(location.search)) return;
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  // ?demo=1&stop=N → ejecuta solo las primeras N frases del guion (para capturar frames del video)
  const m = location.search.match(/[?&]stop=(\d+)/);
  const STOP = m ? parseInt(m[1], 10) : 99;

  async function auto() {
    for (let i = 0; i < 40 && !document.getElementById('startBtn'); i++) await esperar(250);
    const btn = document.getElementById('startBtn');
    if (!btn) return;
    btn.click();
    await esperar(3000); // saludo hablado

    const guion = [
      'Hola, ¿cuánto vale el botox de la frente?',
      'Perfecto. Quiero agendarme una cita',
      'María Gómez',
      'Botox Zona Frontal',
      'este viernes por favor',
      'a las 9 de la mañana',
      'sí, confirmo',
    ];
    for (const frase of guion.slice(0, STOP)) {
      const inp = document.getElementById('textInput');
      if (inp) { inp.value = frase; inp.dispatchEvent(new Event('input', { bubbles: true })); }
      await esperar(700);
      window.ask(frase);           // mismo camino que la voz: cerebro real
      await esperar(4200);          // respuesta hablada (speechSynthesis)
    }
  }
  window.addEventListener('load', () => setTimeout(auto, 500));
})();
