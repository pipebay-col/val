/* val-demo.js — SOLO para el video demo y pruebas locales (NO producción).
 * Intercepts ValSheet.leer() para devolver el fixture DermaLuxe embebido
 * (fixture/*.csv del repo, datos ficticios del documento maestro §0.4).
 * Cargar DESPUÉS de val-sheet.js y ANTES del script del demo.
 */
(function () {
  const FIXTURE = {
    catalogo: [
      { id: 'limp-facial-classic', categoria: 'limpieza', nombre: 'Limpieza Facial Profunda', descripcion: 'Limpieza profunda con vapor, extracción suave y máscara según tu tipo de piel', duracion_min: '50', precio_cop: '180000', activo: 'TRUE' },
      { id: 'botox-frontal', categoria: 'estetica-avanzada', nombre: 'Botox Zona Frontal', descripcion: 'Toxina para frente suave y descansada, efecto natural que dura 3 a 5 meses', duracion_min: '30', precio_cop: '950000', activo: 'TRUE' },
      { id: 'relleno-labios', categoria: 'estetica-avanzada', nombre: 'Relleno de Labios', descripcion: 'Ácido hialurónico con volumen e hidratación natural, incluye control a los 15 días', duracion_min: '45', precio_cop: '850000', activo: 'TRUE' },
      { id: 'laser-full', categoria: 'laser', nombre: 'Láser Depilatorio Full', descripcion: 'Reducción del 80 al 90 por ciento del vello en cuerpo completo, paquete de 6 sesiones', duracion_min: '90', precio_cop: '2400000', activo: 'TRUE' },
      { id: 'peeling-quimico', categoria: 'tratamiento', nombre: 'Peeling Químico', descripcion: 'Renovación de piel para manchas y tono disparejo', duracion_min: '40', precio_cop: '320000', activo: 'TRUE' },
      { id: 'microdermo', categoria: 'tratamiento', nombre: 'Microdermoabrasión', descripcion: 'Pulido de piel con diamante para textura y brillo inmediato', duracion_min: '35', precio_cop: '220000', activo: 'TRUE' },
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
    config: { nombre_clinica: 'DermaLuxe Estética', nombre_asesora: 'Vali', whatsapp: '+573001234567', tono: 'cálido, es-CO', slots_min: '60', max_slots_respuesta: '6' },
    ts: Date.now(),
  };
  // Override: la demo no depende del Sheet ni de Drive
  window.ValSheet.leer = async () => FIXTURE;
})();
