/* val-brain.js — Cerebro local de Val v1.0 (§3 del documento maestro).
 * Sin LLM en v1.0 (decisión D-004): intents deterministas sobre el Sheet.
 * Reglas no negociables: nunca inventa precios/disponibilidad (§3.5);
 * deriva a humano ante queja/médico/desconocido (§3.4);
 * agenda confirmando 4 datos y entrega link wa.me (§3.3).
 */
(function () {
  const C = () => window.VAL_CONFIG || {};
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fmt = n => '$' + Number(n).toLocaleString('es-CO');
  let DATA = null; // catálogo cargado del Sheet

  async function cargar() {
    if (!DATA) DATA = await window.ValSheet.leer();
    return DATA;
  }

  function findServicio(q) {
    const t = norm(q);
    let best = null, bestLen = 0;
    for (const s of DATA.catalogo) {
      const n = norm(s.nombre);
      if (n.length > 2 && t.includes(n)) {
        if (n.length > bestLen) { best = s; bestLen = n.length; }
      }
      // match parcial por palabra clave significativa
      const words = n.split(/\s+/).filter(w => w.length > 4);
      for (const w of words) {
        if (t.includes(w) && w.length > bestLen) { best = s; bestLen = w.length; }
      }
    }
    return best;
  }

  function deriva(t) {
    const words = C().DERIVAR_PALABRAS || [];
    return words.some(w => t.includes(norm(w)));
  }

  const AGENDAR_RX = /(agendar|agendo|cita|reservar|reserva|apartar|disponibilidad|horario|horarios|cuando (puedo|puedas)|libre|turno)/;
  const SALUDO_RX = /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que mas|que tal)/;
  const PRECIO_RX = /(precio|precios|cuanto|cuanto vale|cuanto cuesta|valor|tarifa|tarifas)/;
  const SERVICIOS_RX = /(servicios|tratamientos|que tienen|que hacen|catalogo|menu|opciones)/;
  const PLANES_RX = /(cuanto (cuesta|vale) (el|la|tu) (asistente|sistema|val|asesora|app|aplicacion)|planes|suscripcion|contratar (el|la|a) (asistente|sistema|val)|precio (del|de el|de la) (asistente|sistema|val)|mensualidad|licencia)/;

  // Estado de agenda en curso
  let agenda = null; // {nombre, servicio, fecha, hora, fase}

  async function responder(texto, history) {
    await cargar();
    const t = norm(texto);
    const cfg = DATA.config || {};
    const nombreClinica = cfg.nombre_clinica || 'la clínica';
    const nombreAsesora = cfg.nombre_asesora || 'Vali';

    // §3.4 derivación a humano
    if (deriva(t)) {
      return { answer: 'Con mucho gusto te comunico con un asesor humano de ' + nombreClinica + '. Te dejo el WhatsApp directo aquí para que te atiendan enseguida.', action: 'derivar', args: {} };
    }

    // Flujo de agendamiento en curso (máquina de estados de 4 datos §3.3)
    if (agenda) {
      return flujoAgenda(texto, t);
    }

    // Planes del asistente (§6.3): cuando preguntan por el precio de Val/suscripción
    if (PLANES_RX.test(t)) {
      const txt = window.__valPlanesTxt ? window.__valPlanesTxt() : 'Starter 99, Pro 199 y Premium 349 dólares al mes.';
      return { answer: `Con gusto te cuento. Val es la asistente que atiende tu negocio por voz las 24 horas, y tiene tres planes: ${txt}. El plan Starter es con el que la mayoría empieza. ¿Quieres que un asesor te contacte para activarla en tu negocio?`, action: null, args: {} };
    }

    // Intención de agendar
    if (AGENDAR_RX.test(t)) {
      const s = findServicio(t);
      agenda = { fase: 'nombre', servicio: s || null, fecha: null, hora: null, nombre: null };
      if (s) agenda.fase = 'nombre';
      return { answer: '¡Claro que sí! Te agendo con gusto. ¿Me confirmas tu nombre completo?', action: null, args: {} };
    }

    const s = findServicio(t);
    if (s && PRECIO_RX.test(t)) {
      return { answer: `El ${s.nombre} son ${fmt(s.precio_cop)} y dura ${s.duracion_min} min. ${s.descripcion} ¿Te cuento cómo es el proceso o prefieres que miremos disponibilidad para agendar?`, action: null, args: {} };
    }
    if (s) {
      return { answer: `${s.nombre}: ${s.descripcion}. Dura ${s.duracion_min} minutos y su valor es ${fmt(s.precio_cop)}. ¿Quieres que te lo agende?`, action: null, args: {} };
    }
    if (PRECIO_RX.test(t) && !s) {
      const activos = DATA.catalogo.slice(0, 3).map(x => x.nombre).join(', ');
      return { answer: 'Con gusto te cuento. Hoy manejamos ' + activos + (DATA.catalogo.length > 3 ? ', entre otros' : '') + '. ¿Sobre cuál quieres saber el precio?', action: null, args: {} };
    }
    if (SERVICIOS_RX.test(t)) {
      const lista = DATA.catalogo.slice(0, 5).map(x => '• ' + x.nombre).join('\n');
      return { answer: `Tenemos varias opciones: ${lista.replace(/\n• /g, ', ')}. ¿Hay alguno que te llame la atención o te cuento más de alguno en particular?`, action: null, args: {} };
    }
    if (SALUDO_RX.test(t)) {
      return { answer: `¡Hola, qué gusto! Soy ${nombreAsesora}, de ${nombreClinica}. Te cuento tratamientos, precios y te agendo tu cita cuando quieras. ¿En qué te ayudo?`, action: null, args: {} };
    }

    // §3.4 reformulado: no abre WhatsApp directo — pregunta primero qué necesita
    return { answer: 'Claro que te ayudo. Cuéntame un poquito más: ¿buscas precio de algún tratamiento, quieres agendar una cita o prefieres que te ponga en contacto con la clínica?', action: null, args: {} };
  }

  function flujoAgenda(texto, t) {
    const cfg = DATA.config || {};
    const nombreClinica = cfg.nombre_clinica || 'la clínica';
    if (agenda.fase === 'nombre') {
      agenda.nombre = texto.trim().slice(0, 60);
      agenda.fase = 'servicio';
      if (agenda.servicio) {
        agenda.fase = 'fecha';
        return { answer: `Listo, ${agenda.nombre.split(' ')[0]}. ¿Para qué día te sirve? Estamos abiertos ` + resumenHorario(), action: null, args: {} };
      }
      return { answer: 'Gracias. ¿Cuál servicio quieres agendarte?', action: null, args: {} };
    }
    if (agenda.fase === 'servicio') {
      const s = findServicio(texto);
      if (!s) return { answer: 'Ese servicio no lo tengo en el catálogo activo. ¿Cuál de estos te interesa: ' + DATA.catalogo.slice(0, 4).map(x => x.nombre).join(', ') + '?', action: null, args: {} };
      agenda.servicio = s;
      agenda.fase = 'fecha';
      return { answer: 'Perfecto. ¿Para qué día te sirve? Estamos abiertos ' + resumenHorario(), action: null, args: {} };
    }
    if (agenda.fase === 'fecha') {
      const fecha = parseDia(t);
      if (!fecha) return { answer: '¿Me confirmas el día? Por ejemplo: "este viernes" o "martes que viene". Abrimos ' + resumenHorario() + '.', action: null, args: {} };
      agenda.fecha = fecha;
      agenda.fase = 'hora';
      return { answer: `Listo, ${fecha.label}. Tenemos estos horarios disponibles: ${slotsDelDia(fecha).join(', ')}. ¿Cuál te sirve?`, action: null, args: {} };
    }
    if (agenda.fase === 'hora') {
      const hora = parseHora(t);
      if (!hora) return { answer: '¿Me confirmas la hora? Espacios disponibles: ' + slotsDelDia(agenda.fecha).join(', ') + '.', action: null, args: {} };
      agenda.hora = hora;
      agenda.fase = 'confirmar';
      const s = agenda.servicio;
      return {
        answer: `Te confirmo tu cita, ${agenda.nombre.split(' ')[0]}: ${s.nombre} el ${agenda.fecha.label} a las ${hora}, valor ${fmt(s.precio_cop)}. ¿Te confirmo?`,
        action: null, args: {},
      };
    }
    if (agenda.fase === 'confirmar') {
      if (/^(si|sí|confirmo|listo|dale|ok|acepto|perfecto)/.test(t.trim())) {
        const a = agenda; agenda = null;
        const msg = `Hola, soy ${a.nombre}. Confirmé esta cita con ${cfg.nombre_asesora || 'Vali'}:\n• Servicio: ${a.servicio.nombre}\n• Fecha: ${a.fecha.label}\n• Hora: ${a.hora}\n• Valor: ${fmt(a.servicio.precio_cop)}\n¡Nos vemos!`;
        return { answer: '¡Listo! Tu cita quedó registrada. Te abro WhatsApp para que la clínica te confirme al instante.', action: 'confirmar_cita', args: { mensaje: msg } };
      }
      if (/^(no|cambia|cancela|otro)/.test(t.trim())) {
        agenda.fase = 'fecha';
        return { answer: 'Claro, sin problema. ¿Para qué día la agendamos entonces? Abrimos ' + resumenHorario() + '.', action: null, args: {} };
      }
      return { answer: '¿Te confirmo la cita? Sí para confirmar, o dime qué cambiamos.', action: null, args: {} };
    }
    agenda = null;
    return { answer: '¿En qué te puedo ayudar?', action: null, args: {} };
  }

  // ===== utilidades horario (solo del Sheet §3.5: nunca inventar) =====
  const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const DIAS_LABEL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function horarioDe(diaIdx) {
    if (!DATA) return null;
    const fila = DATA.horario.find(h => {
      const n = norm(h.dia);
      return n === norm(DIAS[diaIdx]) || n.startsWith(DIAS[diaIdx].slice(0, 4)) || norm(DIAS_LABEL[diaIdx]) === n;
    });
    return fila || null;
  }

  function resumenHorario() {
    const abiertos = [];
    for (let i = 1; i <= 6; i++) {
      const h = horarioDe(i);
      if (h) abiertos.push(`${DIAS_LABEL[i]} ${h.apertura}–${h.cierre}`);
    }
    return abiertos.join(', ') || 'según nuestro horario';
  }

  function parseDia(t) {
    const hoy = new Date();
    for (let offset = 1; offset <= 14; offset++) {
      const d = new Date(hoy.getTime() + offset * 864e5);
      const nombre = DIAS[d.getDay()];
      const label = `${DIAS_LABEL[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
      const rx = new RegExp(nombre.slice(0, 4));
      if (rx.test(t)) {
        if (horarioDe(d.getDay())) return { date: d, label };
        return null; // día cerrado — no agendar (§3.5)
      }
    }
    if (/(hoy|manana|mañana)/.test(t)) {
      const d = /(hoy)/.test(t) ? hoy : new Date(hoy.getTime() + 864e5);
      if (horarioDe(d.getDay())) return { date: d, label: `${DIAS_LABEL[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}` };
      return null;
    }
    return null;
  }

  function slotsDelDia(fecha) {
    const h = horarioDe(fecha.date.getDay());
    if (!h) return []; // §3.5: sin horario en Sheet no se ofrecen slots
    const out = [];
    let hh = parseInt(String(h.apertura).split(':')[0], 10);
    const cierreHH = parseInt(String(h.cierre).split(':')[0], 10);
    const paso = parseInt((DATA.config || {}).slots_min || '60', 10) / 60;
    while (hh < cierreHH) {
      out.push(hh <= 12 ? `${hh}:00` : `${hh - 12}:00`);
      hh += Math.max(1, Math.round(paso));
    }
    return out.slice(0, parseInt((DATA.config || {}).max_slots_respuesta || '6', 10));
  }

  function parseHora(t) {
    const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la manana|de la tarde)?/);
    if (!m) return null;
    let hh = parseInt(m[1], 10);
    const suf = m[3] || '';
    if (/pm|tarde/.test(suf) && hh < 12) hh += 12;
    if (/am|manana/.test(suf) && hh === 12) hh = 0;
    if (hh > 23) return null;
    const disp = slotsDelDia(agenda.fecha);
    const label = hh <= 12 ? `${hh}:00` : `${hh - 12}:00`;
    const label24 = `${hh}:00`;
    if (disp.includes(label) || disp.includes(label24)) return label24;
    return null; // fuera de slots reales §3.5
  }

  function reset() { DATA = null; agenda = null; }

  window.ValBrain = { responder, cargar, reset };
})();
