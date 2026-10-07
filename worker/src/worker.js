/* worker.js — Val v2.0 backend serverless (Cloudflare Worker, plan gratis).
 * M1 del PRD v2: POST /api/asr (Groq Whisper) · POST /api/tts (edge-tts) · POST /api/brain (catálogo Sheet).
 * Anti-abuso: CORS solo para dominios de AplicatiBox (val demo/landings).
 */
const ALLOW = [
  'https://pipebay-col.github.io',
  'https://pipebay-col.github.io/val',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const MAX_AUDIO = 2 * 1024 * 1024; // 2 MB
const MAX_TEXT = 900;

function cors(req) {
  const o = req.headers.get('Origin') || '';
  const ok = ALLOW.includes(o);
  return {
    headers: {
      'Access-Control-Allow-Origin': ok ? o : ALLOW[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
      ...(ok ? { Vary: 'Origin' } : {}),
    },
    ok,
  };
}

function json(req, obj, status = 200) {
  const c = cors(req);
  return new Response(JSON.stringify(obj), { status, headers: c.headers });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      const c = cors(request);
      return new Response(null, { status: 204, headers: c.headers });
    }
    const url = new URL(request.url);
    if (request.method !== 'POST') return json(request, { error: 'method_not_allowed' }, 405);
    if (url.pathname === '/api/asr') return asr(request, env);
    if (url.pathname === '/api/tts') return tts(request, env);
    if (url.pathname === '/api/brain') return brain(request, env);
    return json(request, { error: 'not_found' }, 404);
  },
};

/* ===== /api/asr — blob webm/ogg → Groq Whisper → texto (es-CO) ===== */
async function asr(request, env) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return json(request, { error: 'no_file' }, 400);
    if (file.size > MAX_AUDIO) return json(request, { error: 'audio_too_large' }, 413);
    const up = new FormData();
    up.append('file', file, 'audio.webm');
    up.append('model', env.GROQ_ASR_MODEL || 'whisper-large-v3-turbo');
    up.append('language', 'es');
    up.append('temperature', '0');
    up.append('response_format', 'json');
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + (env.GROQ_API_KEY || '') },
      body: up,
    });
    if (!r.ok) {
      const err = await safeErr(r);
      return json(request, { error: 'asr_upstream', detail: err }, 502);
    }
    const data = await r.json();
    return json(request, { text: String(data.text || '').trim() });
  } catch (e) {
    return json(request, { error: 'asr_failed', detail: String(e.message || e) }, 500);
  }
}

/* ===== /api/tts — texto → MP3 (edge-tts vía contenedor, aquí MP3 del TTS de Groq no existe: usamos Google Translate TTS público sin key) ===== */
async function tts(request, env) {
  try {
    const body = await request.json().catch(() => null);
    const text = String((body && body.text) || '').trim();
    if (!text) return json(request, { MP3: '', error: 'no_text' }, 400);
    if (text.length > MAX_TEXT) return json(request, { error: 'text_too_long' }, 413);
    // Google Translate TTS (sin API key, respuesta MP3). Limitado ~300 chars por request.
    const parts = [];
    for (let i = 0; i < text.length; i += 200) parts.push(text.slice(i, i + 200));
    const audios = [];
    for (const p of parts) {
      const u = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es&ttsspeed=1.5&q=' + encodeURIComponent(p);
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) return json(request, { error: 'tts_upstream', detail: 'HTTP ' + r.status }, 502);
      audios.push(await r.arrayBuffer());
    }
    const total = audios.reduce((a, b) => a + b.byteLength, 0);
    const merged = new Uint8Array(total);
    let off = 0;
    for (const ab of audios) { merged.set(new Uint8Array(ab), off); off += ab.byteLength; }
    const c = cors(request);
    return new Response(merged, { headers: { ...c.headers, 'Content-Type': 'audio/mpeg', 'Content-Length': String(total) } });
  } catch (e) {
    return json(request, { error: 'tts_failed', detail: String(e.message || e) }, 500);
  }
}

/* ===== /api/brain — proxy del catálogo del Sheet (cache 5 min en edge) ===== */
async function brain(request, env) {
  try {
    const body = await request.json().catch(() => null);
    const sheetId = String((body && body.sheetId) || env.SHEET_ID || '');
    if (!sheetId) return json(request, { error: 'no_sheet_id' }, 400);
    const data = await fetchSheet(sheetId, env);
    return json(request, { ok: true, data });
  } catch (e) {
    return json(request, { error: 'brain_failed', detail: String(e.message || e) }, 500);
  }
}

async function fetchSheet(sheetId, env) {
  const cache = caches.default;
  const url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/val-sheet-' + sheetId;
  let res = await cache.match(url);
  if (res) return res.json();
  const hojas = ['catalogo', 'horario', 'config'];
  const data = { catalogo: [], horario: [], config: {} };
  for (const h of hojas) {
    const csv = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:csv&sheet=' + h;
    const r = await fetch(csv);
    if (r.ok) data[h] = csvParse(await r.text());
  }
  res = new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  await cache.put(url, res.clone());
  return data;
}

/* CSV parser (mismo de val-sheet.js) */
function csvParse(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const clean = rows.filter(r => r.some(c => String(c).trim() !== ''));
  const head = (clean[0] || []).map(h => String(h).trim().toLowerCase());
  return clean.slice(1).map(r => {
    const o = {};
    head.forEach((h, i) => { o[h] = (r[i] !== undefined ? String(r[i]).trim() : ''); });
    return o;
  });
}

async function safeErr(r) {
  try { return (await r.text()).slice(0, 300); } catch (_) { return 'HTTP ' + r.status; }
}
