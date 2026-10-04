/* val-demo.js — SOLO para el video demo y pruebas locales (NO producción).
 * Catálogo DermaLuxe = los servicios y precios del Sheet plantilla del documento
 * maestro (docs/sheet-plantilla.md, datos ficticios §0.4). Incluye los PLANES
 * de Val ($99/$199/$349) para que la asesora pueda ofrecerlos al preguntar.
 * Cargar DESPUÉS de val-sheet.js y ANTES del script del demo.
 */
(function () {
  const FIXTURE = {
    catalogo: [
      { id: 'limp-facial-classic', categoria: 'limpieza', nombre: 'Limpieza Facial Clásica', descripcion: 'Limpieza profunda con extracción y máscara hidratante', duracion_min: '60', precio_cop: '120000', activo: 'TRUE' },
      { id: 'limp-facial-deluxe', categoria: 'limpieza', nombre: 'Limpieza Facial Deluxe', descripcion: 'Incluye peeling suave, alta frecuencia y máscara de vitamina C', duracion_min: '75', precio_cop: '180000', activo: 'TRUE' },
      { id: 'dermapen', categoria: 'tratamiento', nombre: 'Dermapen + Activos', descripcion: 'Microneedling con ácido hialurónico para textura y brillo', duracion_min: '60', precio_cop: '320000', activo: 'TRUE' },
      { id: 'laser-dplex', categoria: 'tratamiento', nombre: 'Láser Dplex', descripcion: 'Para manchas y pigmentación, requiere valoración previa', duracion_min: '45', precio_cop: '280000', activo: 'TRUE' },
      { id: 'botox-tercio', categoria: 'estetica-avanzada', nombre: 'Botox Tercio Superior', descripcion: 'Corrección de líneas de expresión frente y patas de gallo', duracion_min: '30', precio_cop: '450000', activo: 'TRUE' },
      { id: 'relleno-labios', categoria: 'estetica-avanzada', nombre: 'Relleno de Labios', descripcion: 'Ácido hialurónico, incluye control a los 15 días', duracion_min: '45', precio_cop: '580000', activo: 'TRUE' },
      { id: 'masaje-relajante', categoria: 'spa', nombre: 'Masaje Relajante Corporal', descripcion: 'Aromaterapia y maniobras suaves, 60 minutos', duracion_min: '60', precio_cop: '140000', activo: 'TRUE' },
    ],
    horario: [
      { dia: 'Lunes', apertura: '09:00', cierre: '18:00', activo: 'TRUE' },
      { dia: 'Martes', apertura: '09:00', cierre: '18:00', activo: 'TRUE' },
      { dia: 'Miercoles', apertura: '09:00', cierre: '18:00', activo: 'TRUE' },
      { dia: 'Jueves', apertura: '09:00', cierre: '18:00', activo: 'TRUE' },
      { dia: 'Viernes', apertura: '09:00', cierre: '18:00', activo: 'TRUE' },
      { dia: 'Sabado', apertura: '09:00', cierre: '14:00', activo: 'TRUE' },
      { dia: 'Domingo', apertura: '12:00', cierre: '16:00', activo: 'FALSE' },
    ],
    config: { nombre_clinica: 'la clínica de ejemplo (DermaLuxe)', nombre_asesora: 'Vali', whatsapp: '+573001234567', tono: 'cálido, es-CO', slots_min: '60', max_slots_respuesta: '4' },
    ts: Date.now(),
  };
  // Override: la demo no depende del Sheet ni de Drive
  window.ValSheet.leer = async () => FIXTURE;

  /* PLANES de Val (§6.3 del documento maestro): la asesora los ofrece al preguntar */
  window.VAL_PLANES = [
    { nombre: 'Starter', precio_usd: 99, incluye: 'conversaciones ilimitadas por web y hasta 30 servicios en el catálogo' },
    { nombre: 'Pro', precio_usd: 199, incluye: 'todo lo de Starter más confirmación por WhatsApp, recordatorios de citas y analítica' },
    { nombre: 'Premium', precio_usd: 349, incluye: 'todo lo de Pro más llamadas telefónicas, multi-sede y soporte prioritario' },
  ];
  // Gancho para el cerebro: cuando pregunten por planes/precio del asistente, Val los lee de aquí
  window.__valPlanesTxt = function () {
    return window.VAL_PLANES.map(function (p) { return p.nombre + ': ' + p.precio_usd + ' dólares al mes — ' + p.incluye; }).join(' ');
  };
})();
