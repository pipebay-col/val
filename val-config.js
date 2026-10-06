/* val-config.js — Config de instalación de Val (v1.0)
 * Cargado ANTES que el script del demo. Define la fuente de verdad (§4)
 * y la capa de compatibilidad self-hosted (decisión D-004).
 * Editar este archivo (o usar .env en el serverless) — NO tocar valeria.html.
 */

window.VAL_CONFIG = {
  // SHEET_ID: de la URL del Google Sheet plantilla (docs/sheet-plantilla.md)
  SHEET_ID: 'COLOCA_TU_SHEET_ID',
  // WhatsApp de la clínica con indicativo país, solo dígitos y +
  WHATSAPP: '+573001234567',
  // Banco gratuito (§6.1): 100 conversaciones o 60 minutos de voz
  FREE_QUOTA_CONVERSACIONES: 100,
  FREE_QUOTA_MINUTOS: 60,
  // URL de la página de planes (CTA de upgrade §6.2)
  PLANES_URL: 'https://pipebay-col.github.io/val/planes',
  // Gatillos de derivación a humano (§3.4) — frases que la clinic puede ajustar
  DERIVAR_PALABRAS: ['reclamo', 'queja', 'demanda', 'abogado', 'doctor humano', 'hablar con alguien', 'enfadada', 'enferma', 'dolor fuerte', 'urgencia'],
};
