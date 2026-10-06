// E2E del cerebro v2.0 embebido en val-v2.html
const fs = require('fs');
const html = fs.readFileSync('val-v2.html', 'utf-8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
global.window = { open: () => {} };
global.document = {
  getElementById: () => ({ textContent: '', style: {}, className: '', appendChild: () => {}, scrollTop: 0, scrollHeight: 0, querySelector: () => ({ style: {} }), addEventListener: () => {}, focus: () => {}, insertAdjacentHTML: () => {} }),
  querySelectorAll: () => [{ addEventListener: () => {} }],
  createElement: () => ({ className: '', textContent: '', appendChild: () => {} }),
  insertAdjacentHTML: () => {},
};
global.navigator = { mediaDevices: { getUserMedia: async () => { throw new Error('no-mic'); } } };
global.fetch = async () => ({ ok: true, json: async () => ({ text: '' }), blob: async () => ({ size: 1 }) });
global.Audio = class { pause() {} play() { return Promise.resolve(); } };
global.AudioContext = class { createAnalyser() { return {}; } };
global.URL = { createObjectURL: () => '' };
eval('(function(){' + js + '\n;global.pensar = pensar;})()');
let ok = 0, fail = 0;
function t(name, cond) { if (cond) { ok++; console.log('  PASS ' + name); } else { fail++; console.log('  FAIL ' + name); } }
const r1 = pensar('hola, buenos días');
t('1 saludo', r1 && /Val/.test(r1));
const r2 = pensar('cuánto cuesta la limpieza facial clásica');
t('2 precio+servicio', r2 && /120\.000/.test(r2));
const r3 = pensar('qué puede hacer Val por mi empresa');
t('3 qué hace', r3 && /24 horas/.test(r3));
const r4 = pensar('cuánto cuesta el asistente');
t('4 planes', r4 && /99/.test(r4) && /199/.test(r4) && /349/.test(r4));
const r5 = pensar('cómo instalo Val en mi negocio');
t('5 instalar', r5 && /AplicatiBox/.test(r5));
const r6 = pensar('quiero ver el catálogo de ejemplo');
t('6 catálogo', r6 && /catálogo/.test(r6));
const r7 = pensar('me duele mucho, es una urgencia');
t('7 deriva', r7 && /WhatsApp/.test(r7));
const r8 = pensar('dermapen');
t('8 servicio solo', r8 && /320\.000/.test(r8));
const r9 = pensar('kjzzqwyt');
t('9 fallback nunca silencio', r9 && r9.length > 20);
console.log(fail === 0 ? 'E2E 9/9 OK' : 'E2E ' + ok + '/9 — FALLOS: ' + fail);
process.exit(fail === 0 ? 0 : 1);
