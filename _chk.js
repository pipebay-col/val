
/* =====================================================================
   VAL — MOTOR DE VOZ v5 (RECONSTRUCCIÓN DESDE CERO)
   ARQUITECTURA: UN SOLO SpeechRecognition continuo. NADA MÁS.
   - Sin MediaRecorder. Sin VAD. Sin getUserMedia duplicado. Sin dobles capturas.
   - Estados: idle → listening (hablas) → thinking (procesa) → speaking (responde)
   - Anti-eco: mic CERRADO mientras Val habla. Reanuda 800ms tras terminar.
   - Barge-in táctil: tocar el orb mientras Val habla la corta y escucha.
   - Ventana ciega 1.5s al reabrir (eco del altavoz de Android).
   ===================================================================== */

const orb = document.getElementById('orb');
const estadoEl = document.getElementById('estado');
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const dbg = document.getElementById('dbg');
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let rec = null;
let escuchando = false;
let valHablandoFlag = false;
let ciegoHasta = 0;
let presentada = false;

/* ---------- utilidades UI ---------- */
function setDbg(t, c) { dbg.textContent = t; dbg.style.color = c || '#64748b'; }
function modo(m) {
  orb.className = m;
  const svg = orb.querySelector('svg');
  const colores = { idle:'#4edea3', listening:'#10B981', thinking:'#F59E0B', speaking:'#38BDF8' };
  if (svg) svg.style.color = colores[m] || colores.idle;
  const textos = {
    idle: presentada ? 'Escuchándote — pregúntame lo que quieras' : 'Toca el círculo para empezar',
    listening: 'Te escucho… habla normal',
    thinking: 'Pensando…',
    speaking: 'Val hablando… (toca el círculo para interrumpir)',
  };
  estadoEl.textContent = textos[m];
}
function addMsg(texto, quien) {
  const d = document.createElement('div');
  d.className = 'msg ' + quien;
  d.textContent = texto;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

/* ---------- CANCELACIÓN DE ECO ---------- */
let ultimaFraseVal = '';   // lo último que Val dijo (para detectar eco)
function esEcoDeVal(dicho) {
  if (!ultimaFraseVal) return false;
  const nrm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(Boolean);
  const wVal = nrm(ultimaFraseVal);
  const wDicho = nrm(dicho);
  if (!wDicho.length) return true;
  // ¿cuántas palabras de lo dicho están en la frase de Val?
  let dentro = 0;
  for (const w of wDicho) { if (w.length > 3 && wVal.includes(w)) dentro++; }
  const ratio = dentro / wDicho.length;
  // si >=60% de las palabras provienen del mensaje de Val → eco
  if (ratio >= 0.6) return true;
  // coincidencia literal por trozos (el eco suele ser un fragmento contiguo)
  const tVal = wVal.join(' ');
  const tDic = wDicho.join(' ');
  if (tDic.length > 8 && tVal.includes(tDic)) return true;
  return false;
}

/* ---------- TTS ---------- */
async function hablar(texto) {
  valHablandoFlag = true;
  ultimaFraseVal = texto; // registrar para el detector de eco (protección extra)
  modo('speaking');
  cerrar(); // mic CERRADO mientras Val habla: el eco jamás se procesa
  addMsg(texto, 'bot');
  try {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-CO'; u.rate = 1.02;
    await new Promise(res => {
      u.onend = res; u.onerror = res;
      speechSynthesis.speak(u);
    });
  } catch (_) {}
  valHablandoFlag = false;
  modo('idle');
  setTimeout(function(){ if (presentada) abrir(); }, 600); // reanudar escucha
}

/* ---------- CEREBRO (embebido, sin fetch) ---------- */
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const fmt = n => '$' + Number(n).toLocaleString('es-CO');

const CATALOGO = [
  { nombre:'Limpieza Facial Clásica', precio:120000, dur:60, desc:'Limpieza profunda con extracción y máscara hidratante' },
  { nombre:'Limpieza Facial Deluxe', precio:180000, dur:75, desc:'Peeling suave, alta frecuencia y máscara de vitamina C' },
  { nombre:'Dermapen + Activos', precio:320000, dur:60, desc:'Microneedling con ácido hialurónico' },
  { nombre:'Láser Dplex', precio:280000, dur:45, desc:'Manchas y pigmentación' },
  { nombre:'Botox Tercio Superior', precio:450000, dur:30, desc:'Líneas de expresión frente y patas de gallo' },
  { nombre:'Relleno de Labios', precio:580000, dur:45, desc:'Ácido hialurónico con control a los 15 días' },
  { nombre:'Masaje Relajante', precio:140000, dur:60, desc:'Aromaterapia y maniobras suaves' },
];

const PLANES = 'Starter 99 dólares al mes (conversaciones ilimitadas web, 30 servicios), Pro 199 dólares (más WhatsApp, recordatorios y analítica), y Premium 349 dólares (más llamadas, multi-sede y soporte prioritario).';

const RX = {
  saludar: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que mas|que tal)/,
  agendar: /(agendar|agendo|cita|reservar|reserva|apartar|disponibilidad|horario|turno)/,
  precio: /(precio|precios|cuanto|valor|tarifa|cuesta)/,
  servicios: /(servicios|tratamientos|catalogo|opciones|que tienen|que hacen|demo)/,
  planes: /(planes|cuanto (cuesta|vale) (el|la|tu) (asistente|sistema|val)|suscripcion|mensualidad|contratar)/,
  instalar: /(como (instalo|instalo|obtengo|consigo)|instalar|instalacion|gratis|open source|github|quiero una|la quiero|me interesa)/,
  quehace: /(que puede hacer|que haces|como funciona|para que sirves|capacidades|como me ayudas|servicios para mi empresa)/,
  whatsapp: /(whatsapp|contacto|hablar con alguien|asesor|humano)/,
  derivar: /(reclamo|queja|demanda|urgencia|me duele|emergencia)/,
};

function buscarServicio(t) {
  let mejor = null, mejorLen = 0;
  for (const s of CATALOGO) {
    const n = norm(s.nombre);
    if (n.length > 2 && t.includes(n)) { if (n.length > mejorLen) { mejor = s; mejorLen = n.length; } }
    for (const w of n.split(' ')) {
      if (w.length > 4 && t.includes(w) && w.length > mejorLen) { mejor = s; mejorLen = w.length; }
    }
  }
  return mejor;
}

function pensar(textoBruto) {
  const t = norm(textoBruto);
  if (!t || t.length < 2) return null;

  if (RX.saludar.test(t)) {
    return '¡Hola! Soy Val, la asistente de voz de AplicatiBox. Conmigo tu empresa responde a sus clientes por voz a toda hora. Pregúntame qué puedo hacer, los planes, o pide el catálogo de ejemplo.';
  }
  if (RX.derivar.test(t)) {
    window.open('https://wa.me/573001234567?text=' + encodeURIComponent('Hola, vengo de la página de Val y quiero hablar con un asesor.'), '_blank');
    return 'Te paso directo con un asesor humano por WhatsApp. Enseguida te atienden.';
  }
  if (RX.quehace.test(t)) {
    return 'Conmigo tu empresa atiende por voz las 24 horas: respondo preguntas de tus clientes, doy precios e información de tus servicios, agendo citas y las paso a tu WhatsApp. No descansa y atiende a varios a la vez. ¿Quieres ver el catálogo de ejemplo o prefieres que un asesor te contacte?';
  }
  if (RX.planes.test(t)) {
    return 'Con gusto. Val tiene tres planes: ' + PLANES + ' El Starter es el más popular para empezar. ¿Quieres que un asesor te contacte para activarla en tu negocio?';
  }
  if (RX.instalar.test(t)) {
    return 'Te cuento: Val es un proyecto abierto y gratuito — el código está disponible para todos. Si la quieres funcionando en tu negocio con tus servicios, precios y horario, la instalación la hace nuestro equipo de AplicatiBox. ¿Te pongo con un asesor?';
  }
  if (RX.agendar.test(t)) {
    return '¡Claro que te agendo! Para la demo usa este catálogo de ejemplo. Dime tu nombre y el servicio que te interesa, y te paso la confirmación por WhatsApp.';
  }
  const s = buscarServicio(t);
  if (s && RX.precio.test(t)) {
    return 'En este catálogo de ejemplo, ' + s.nombre + ' son ' + fmt(s.precio) + ' y dura ' + s.dur + ' minutos. Así es como yo le daría la información de TU empresa a tus clientes. ¿Otra cosa?';
  }
  if (s) {
    return s.nombre + ': ' + s.desc + '. Son ' + fmt(s.precio) + ' por ' + s.dur + ' minutos. ¿Quieres ver más del catálogo o te explico los planes?';
  }
  if (RX.servicios.test(t)) {
    mostrarCatalogo();
    return 'Este es el catálogo de ejemplo con el que estoy demostrando. Con tu empresa usaría TUS servicios, precios y horarios. ¿Te cuento los planes o pides un servicio concreto?';
  }
  if (RX.whatsapp.test(t)) {
    window.open('https://wa.me/573001234567?text=' + encodeURIComponent('Hola, vengo de la página de Val y quiero información.'), '_blank');
    return 'Listo, te abrí el WhatsApp de AplicatiBox. Un asesor te atiende enseguida.';
  }
  if (RX.precio.test(t)) {
    return 'Con gusto. ¿Buscas el precio de algún servicio del catálogo de ejemplo, o el precio de los planes de Val? Toca el chip que te interese.';
  }
  // fallback: nunca silencio
  return 'Cuéntame un poquito más: ¿quieres saber qué puedo hacer por tu empresa, ver los planes, el catálogo de ejemplo, o que te ponga con un asesor?';
}

function mostrarCatalogo() {
  let html = '';
  CATALOGO.forEach(s => {
    html += '<div class="msg bot" style="display:flex;justify-content:space-between;gap:10px;"><span>' + s.nombre + '<br><small style="color:#94a3b8">' + s.dur + ' min</small></span><b style="color:#4edea3">' + fmt(s.precio) + '</b></div>';
  });
  chat.insertAdjacentHTML('beforeend', html);
  chat.scrollTop = chat.scrollHeight;
}

/* ---------- RESPONDER (voz o texto) ---------- */
async function responder(texto) {
  addMsg(texto, 'user');
  modo('thinking');
  const respuesta = pensar(texto);
  if (!respuesta) { modo(presentada ? 'idle' : 'idle'); abrir(); return; }
  await hablar(respuesta);
  modo('idle');
}

/* ---------- MOTOR ÚNICO: SpeechRecognition ---------- */
function abrir() {
  if (!SR) { setDbg('sin SR — escribe abajo', '#F59E0B'); return; }
  if (escuchando || valHablandoFlag) return;
  try {
    rec = new SR();
    rec.lang = 'es-CO';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let acumulado = '';

    rec.onresult = function (e) {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) acumulado += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      // ==== ANTI-ECO ABSOLUTO: mientras Val habla NO se procesa NADA del mic ====
      // El altavoz de Android devuelve la voz de Val al mic (eco) y ningún filtro
      // de texto es 100% fiable (ruido/fragmentos). Solución sin ambigüedad:
      // escucha CERRADA durante el TTS. Para interrumpir a Val: toca el círculo.
      if (valHablandoFlag) { acumulado = ''; return; }
      if (Date.now() < ciegoHasta) { acumulado = ''; return; } // ventana ciega al (re)iniciar
      const dicho = (interim + ' ' + acumulado).trim();
      // doble protección: si aún es eco de la última frase, descartar
      if (dicho.length > 2 && esEcoDeVal(dicho)) { acumulado = ''; return; }
      if (acumulado.trim()) {
        const texto = acumulado.trim();
        acumulado = '';
        // filtro anti-ruido
        const nrm = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z\s]/g,'').trim();
        if (!nrm || nrm.length < 3) return;
        cerrar();
        responder(texto);
      }
    };

    rec.onerror = function (e) {
      setDbg('err: ' + e.error, '#F59E0B');
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setDbg('sin permiso — candado', '#ef4444');
        hablar('Necesito permiso del micrófono. Toca el candado de la barra de dirección, permite el micrófono y recarga la página.');
      }
    };

    rec.onend = function () {
      escuchando = false;
      if (presentada && !valHablandoFlag) setTimeout(abrir, 700);
    };

    rec.start();
    escuchando = true;
    ciegoHasta = Date.now() + 1500; // ventana ciega 1.5s
    setDbg('SR: escuchando', '#10B981');
    modo('listening');
  } catch (e) {
    escuchando = false;
    setDbg('reintentando…', '#64748b');
    setTimeout(abrir, 1500);
  }
}

function cerrar() {
  if (rec && escuchando) { try { rec.stop(); } catch (_) {} }
  escuchando = false;
}

/* ---------- ARRANQUE ---------- */
async function empezar() {
  if (presentada) { abrir(); return; }
  presentada = true;
  document.getElementById('titulo').textContent = 'Val — Asistente de Voz de AplicatiBox';
  await hablar('Hola! Soy Val, la asistente de voz de AplicatiBox. Conmigo, tu empresa responde a sus clientes por voz a toda hora: información, precios y reservas. Habla normal, te escucho.');
  modo('idle');
  abrir();
}

orb.addEventListener('click', () => {
  if (valHablandoFlag) { // barge-in táctil: cortar a Val
    try { speechSynthesis.cancel(); } catch (_) {}
    valHablandoFlag = false;
    abrir();
  } else if (!presentada) {
    empezar();
  } else {
    abrir();
  }
});

/* chips */
document.querySelectorAll('.chip').forEach(c => {
  c.addEventListener('click', () => {
    if (!presentada) { empezar(); }
    responder(c.dataset.q);
  });
});

/* input de texto */
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && input.value.trim()) {
    const v = input.value.trim(); input.value = '';
    if (!presentada) { presentada = true; }
    cerrar();
    responder(v);
  }
});

modo('idle');
console.log('[Val v5] motor único desde cero — un SpeechRecognition, cero dobles capturas');
