/* val-quota.js — Banco gratuito de Val (§6 del documento maestro).
 * 100 conversaciones o 60 minutos de voz, lo que se agote primero (§6.1).
 * Contador LOCAL en localStorage (usage.json equivalente browser, §5).
 * Al agotar: modo free_exhausted — máximo 3 mensajes por sesión + CTA (§6.2).
 */
(function () {
  const LS_KEY = 'val_usage_v1';
  const C = () => window.VAL_CONFIG || {};
  const MAX_MSG_EXHAUSTED = 3; // §6.2

  function usage() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (_) { return {}; }
  }
  function save(u) { localStorage.setItem(LS_KEY, JSON.stringify(u)); }

  function leer() {
    const u = usage();
    u.conv = u.conv || 0;          // conversaciones iniciadas
    u.segundos_voz = u.segundos_voz || 0; // tiempo de voz acumulado
    u.msgs_sesion = u.msgs_sesion || 0;   // mensajes en la sesión actual
    return u;
  }

  function agotado() {
    const u = leer();
    const maxC = C().FREE_QUOTA_CONVERSACIONES || 100;
    const maxMin = C().FREE_QUOTA_MINUTOS || 60;
    if (u.conv >= maxC) return 'conversaciones';
    if (u.segundos_voz >= maxMin * 60) return 'minutos';
    return null;
  }

  // una "conversación" se cuenta cuando el usuario hace su PRIMER mensaje de una sesión
  function registrarMensaje() {
    const u = leer();
    if (u.msgs_sesion === 0) u.conv += 1;
    u.msgs_sesion += 1;
    save(u);
    return {
      exhausted: agotado(),
      msgs_en_sesion: u.msgs_sesion,
    };
  }

  function registrarVoz(segundos) {
    const u = leer();
    u.segundos_voz = Math.max(0, (u.segundos_voz || 0) + Math.round(segundos));
    save(u);
    return { exhausted: agotado() };
  }

  function nuevaSesion() {
    const u = leer();
    u.msgs_sesion = 0;
    save(u);
  }

  // §6.2: en modo free_exhausted el asistente responde máximo 3 mensajes por sesión
  function limiteSesionAlcanzado() {
    const u = leer();
    return agotado() !== null && u.msgs_sesion >= MAX_MSG_EXHAUSTED;
  }

  function ctaTexto() {
    const razon = agotado() === 'minutos'
      ? 'tus ' + (C().FREE_QUOTA_MINUTOS || 60) + ' minutos de voz'
      : 'tus ' + (C().FREE_QUOTA_CONVERSACIONES || 100) + ' conversaciones';
    return `Se agotó tu prueba gratuita (${razon}). Activa Val Pro para uso ilimitado.`;
  }
  function ctaUrl() { return C().PLANES_URL || '#'; }

  window.ValQuota = { leer, agotado, registrarMensaje, registrarVoz, nuevaSesion, limiteSesionAlcanzado, ctaTexto, ctaUrl, MAX_MSG_EXHAUSTED };
})();
