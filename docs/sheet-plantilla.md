# Anexo A — Google Sheet plantilla (DermaLuxe, datos FICTICIOS)

Este es el Sheet que Val lee como fuente de verdad (§4 del documento maestro).
Duplicar: Archivo → Hacer una copia → compartir como "Cualquier persona con el enlace (Lector)" → copiar el ID de la URL.
El SHEET_ID va en .env. Datos de ejemplo ficticios — NUNCA subir precios reales al repo (§0.4).

## Hoja 1: catalogo

| id | categoria | nombre | descripcion | duracion_min | precio_cop | activo |
|---|---|---|---|---|---|---|
| limp-facial-classic | limpieza | Limpieza Facial Clásica | Limpieza profunda con extracción y máscara hidratante | 60 | 120000 | TRUE |
| limp-facial-deluxe | limpieza | Limpieza Facial Deluxe | Incluye peeling suave, alta frecuencia y máscara de vitamina C | 75 | 180000 | TRUE |
| dermapen | tratamiento | Dermapen + Activos | Microneedling con ácido hialurónico para textura y brillo | 60 | 320000 | TRUE |
| laser-dplex | tratamiento | Láser Dplex | Para manchas y pigmentación, requiere valoración previa | 45 | 280000 | TRUE |
| botox-tercio | estetica-avanzada | Botox Tercio Superior | Corrección de líneas de expresión frente y patas de gallo | 30 | 450000 | TRUE |
| relleno-labios | estetica-avanzada | Relleno de Labios | Ácido hialurónico, incluye control a los 15 días | 45 | 580000 | TRUE |
| masaje-relajante | spa | Masaje Relajante Corporal | Aromaterapia y maniobras suaves, 60 minutos | 60 | 140000 | TRUE |
| paquete-novia | paquete | Paquete Novia | Limpieza + dermapen + diseño de cejas, 3 sesiones | 180 | 750000 | FALSE |

Nota: `paquete-novia` está activo=FALSE de ejemplo — Val NUNCA lo ofrece (§3.5).

## Hoja 2: horario

| dia | apertura | cierre | activo |
|---|---|---|---|
| Lunes | 09:00 | 18:00 | TRUE |
| Martes | 09:00 | 18:00 | TRUE |
| Miércoles | 09:00 | 18:00 | TRUE |
| Jueves | 09:00 | 18:00 | TRUE |
| Viernes | 09:00 | 18:00 | TRUE |
| Sábado | 09:00 | 14:00 | TRUE |
| Domingo | 12:00 | 16:00 | FALSE |

## Hoja 3: config

| clave | valor |
|---|---|
| nombre_clinica | DermaLuxe Estética |
| nombre_asesora | Vali |
| whatsapp | +573001234567 |
| tono | cálido, es-CO |
| slots_min | 60 |
| max_slots_respuesta | 4 |

## Reglas de lectura (§4.4)
- Se lee al arranque + caché de 5 minutos (TTL 300s).
- Fallo de lectura → último cache válido + warning en logs.
- Filas con activo=FALSE no se ofrecen ni se mencionan.
- Precio se lee SIEMPRE del Sheet en vivo; si el cache está vencido y falla el fetch, responder "déjame confirmar ese dato con la clínica" — nunca dar precio del cache >5min para citas nuevas.
