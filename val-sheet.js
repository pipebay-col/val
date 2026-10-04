/* val-sheet.js — Lee el Google Sheet fuente de verdad (§4) con caché 5 min.
 * Publicación CSV: Archivo → Compartir → Publicar en la web → CSV (por hoja).
 * Sin backend: fetch directo al CSV publicado (solo lectura, sin API key).
 * Si falla → usa último cache válido en localStorage + warning en consola (§4.4).
 */
(function () {
  const TTL_MS = 5 * 60 * 1000; // §4.4 caché 5 minutos
  const LS_KEY = 'val_sheet_cache_v1';

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

  async function fetchHoja(nombre) {
    const id = window.VAL_CONFIG.SHEET_ID;
    if (!id || id === 'COLOCA_TU_SHEET_ID') throw new Error('SHEET_ID sin configurar');
    const url = 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(nombre);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Sheet HTTP ' + res.status);
    return csvParse(await res.text());
  }

  async function leer() {
    const cache = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    const fresco = cache && (Date.now() - cache.ts) < TTL_MS;
    if (fresco) return cache.data;
    try {
      const [catalogo, horario, config] = await Promise.all([fetchHoja('catalogo'), fetchHoja('horario'), fetchHoja('config')]);
      const data = {
        catalogo: catalogo.filter(r => String(r.activo).toUpperCase().startsWith('T') || r.activo === '1' || r.activo === 'true'),
        horario: horario.filter(r => String(r.activo).toUpperCase().startsWith('T') || r.activo === '1' || r.activo === 'true'),
        config: Object.fromEntries(config.map(r => [String(r.clave || '').trim(), String(r.valor !== undefined ? r.valor : (r['' ] || '')).trim()])),
        ts: Date.now(),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn('[Val] Sheet falló, uso último cache válido:', e.message); // §4.4
      if (cache) return cache.data;
      throw e;
    }
  }

  window.ValSheet = { leer };
})();
