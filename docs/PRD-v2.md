# PRD v2.0 — Val: Asistente de Voz IA para Empresas
**Producto:** Val — Asistente de voz que atiende a los clientes de un negocio 24/7
**Owner:** Pipe (Punto Labs) · **Orquestador:** Amo (Hermes) · **Fecha:** 5-oct-2026
**Reemplaza:** PRD v1 (3-oct) y todas las iteraciones de la demo web
**Documento maestro vigente:** `docs/INSTRUCCIONES.md` (reglas §0-§13 siguen aplicando)

---

## 0. Por qué este PRD v2 (lecciones del 5-oct, ~15 iteraciones fallidas)

| # | Lección aprendida (con la marca del error) |
|---|---|
| L1 | **El SpeechRecognition del navegador NO es suficiente** en Android: emite fragmentos por micro-pausa, se atasca tras el primer final, se pausa con audio saliente, y el eco del altavoz genera órdenes fantasma. Evidencia: 8 versiones (v5.0-v5.7) con síntomas distintos del mismo motor. |
| L2 | **El pipeline de grabación (MediaRecorder+VAD) SÍ es estable** en Android — era la mitad que siempre funcionó. Lo que faltaba es transcripción real (el shim la sustituía por otro SR defectuoso). |
| L3 | **GitHub Pages no tiene backend.** Cualquier arquitectura que requiera procesar audio en el servidor necesita un backend — sin él, la web solo puede "demostrar", no "funcionar". |
| L4 | **Nunca publicar sin probar en el dispositivo real.** Cada versión se publicó sin verificar en el Android de Felipe primero. Regla nueva: staging → Felipe prueba → recién entonces producción. |
| L5 | **Cambios de UNA variable a la vez.** Las v5.6/v5.7 metieron 3 cambios simultáneos — imposible saber cuál rompió. |
| L6 | **Barge-in por voz en la web móvil es inviable sin cancelación de eco por hardware.** El estándar real es el botón táctil de corte. |

---

## 1. Visión del producto

Una empresa (clínica, spa, salón, consultorio, barbería, tienda) instala **Val** en su web con SUS servicios, precios y horarios. Desde ese momento, sus clientes son atendidos por voz las 24 horas: Val responde preguntas, da precios, explica servicios y agenda citas — y las pasa al WhatsApp del negocio.

**Frase de venta:** *"Una recepcionista que no duerme, por menos de lo que cuesta medio salario mínimo."*

---

## 2. Usuario objetivo

- **Usuario final (quién habla):** cliente del negocio, móvil Android/iOS, Chrome/Safari, prefiere hablar antes que escribir.
- **Comprador (quién paga):** dueño/gerente del negocio. 10-40 servicios, atiende por WhatsApp, sin capacidad 24/7.
- **Vertical v1:** estética y salud (clínicas, spas, salones). La demo muestra este caso; el producto sirve a cualquier negocio con catálogo y citas.

---

## 3. La DEMO de ventas (este PRD) vs el PRODUCTO (v2.1+)

**Alcance de ESTE PRD (v2.0):** la demo que AplicatiBox usa para VENDER el producto a empresas. Debe funcionar impecablemente en el celular del prospecto SIN instalar nada.

**Fuera de alcance (v2.1+):** multi-idioma, llamadas telefónicas entrantes, panel de administración con login, analítica avanzada, recordatorios automáticos. Todo §7.2 del documento maestro original.

---

## 4. Arquitectura v2.0 (la corrección de fondo)

```
┌── MÓVIL (Chrome Android) ─────────────────────────────┐
│  1. getUserMedia + MediaRecorder (estable, probado)   │
│  2. VAD por silencio: 1.3s callado = frase terminada   │
│  3. audio blob (webm/ogg) ──► POST al endpoint          │
└──────────────┬─────────────────────────────────────────┘
               ▼
┌── BACKEND SERVERLESS (Cloudflare Worker, plan gratis) ─┐
│  4. POST /api/asr  → Groq Whisper API (transcribe)      │
│     POST /api/tts  → TTS real (edge-tts o API)          │
│     POST /api/brain→ cerebro (catálogo del Sheet)        │
└──────────────┬──────────────────────────────────────────┘
               ▼
┌── MÓVIL ────────────────────────────────────────────────┐
│  5. respuesta en audio MP3 → reproducir                 │
│  6. mic cerrado durante reproducción (anti-eco)          │
│  7. reanudar escucha al terminar                         │
└──────────────────────────────────────────────────────────┘
```

**Por qué esta arquitectura y no otra:**
- El **mic del navegador** (L2) es la parte estable probada en Android.
- **Groq Whisper** transcribe el audio completo de una vez: sin fragmentos, sin atascos, sin eco (la transcripción ocurre en el servidor, no en el mic durante el TTS). Coste: gratis en tier inicial / centavos por minuto.
- **TTS del servidor** (MP3) en vez de speechSynthesis: sin el bug del eco del altavoz + voz consistente de "Val" en todos los dispositivos.
- **Cloudflare Workers**: plan gratis suficiente para la demo (100k requests/día), ya contemplado en el documento maestro §5.

**Alternativa degradada sin backend (solo si Groq no disponible):** input de texto siempre visible — la demo conversa por escrito con TTS del navegador. NUNCA volver al SR del navegador como motor principal.

---

## 5. Flujo conversacional (canónico)

1. **Bienvenida** (≤3s): "¡Hola! Soy Val, la asistente de voz de [Negocio]. ¿En qué te puedo ayudar?"
2. **Consulta**: usuario habla → VAD corta al silencio → transcribe → cerebro.
3. **Cerebro** (mismo del v1, probado):
   - Precio de servicio → del catálogo (Sheet) + ofrecer agenda.
   - "Qué puede hacer Val / planes" → tiers $99/$199/$349 (§6.3 doc maestro).
   - "Cómo la instalo" → proyecto abierto + equipo AplicatiBox instala.
   - Agenda: 4 datos (nombre, servicio, fecha, hora) → confirmación → wa.me del negocio.
   - Queja/urgencia → deriva a WhatsApp inmediato (§3.4).
4. **Respuesta**: MP3 del servidor → reproducir → reanudar mic (600ms + ventana ciega 800ms).
5. **Interrumpir**: tocar el círculo (barge-in táctil — L6). NUNCA por voz en v2.0.

---

## 6. Plan de desarrollo v2.0 (hitos verificables)

### M1 — Backend serverless (día 1)
- [ ] Cloudflare Worker con `POST /api/asr` (recibe blob → Groq Whisper → texto).
- [ ] `POST /api/tts` (texto → edge-tts/Groq TTS → MP3).
- [ ] Cerebro reutilizado del v1 (`val-brain.js` — E2E 9/9 ya probado).
- [ ] **Verificación M1:** curl con audio real → JSON con texto correcto.

### M2 — Frontend reconstruido sobre el pipeline estable (día 1-2)
- [ ] `val.html` autocontenida: getUserMedia + MediaRecorder + VAD (código del pipeline original — probado en Android).
- [ ] Reemplazar el shim: los `/api/*` ahora apuntan al Worker real.
- [ ] UI minimalista (del v5: orb con estados, chat, chips producto, input texto).
- [ ] Anti-eco: mic cerrado durante reproducción MP3 (sin speechSynthesis).
- [ ] **Verificación M2:** en desktop con mic — frase completa → transcripción correcta → respuesta hablada.

### M3 — Prueba en dispositivo REAL (día 2) — GATE OBLIGATORIO
- [ ] Deploy a staging (URL aparte, NO producción).
- [ ] **Felipe prueba en su Android** y aprueba explícitamente.
- [ ] Criterios de aprobación M3 (todos):
  1. Frase de 8+ palabras transcrita COMPLETA (2 pruebas).
  2. Respuesta con contexto correcto (2 preguntas del catálogo).
  3. Sin auto-respuestas ni loops (3 minutos de conversación).
  4. Integridad: interrumpir tocando el círculo funciona.
- [ ] **SOLO con M3 aprobado:** merge a producción (misma URL).

### M4 — Deploy producción + video (día 3)
- [ ] Verificación byte a byte en Pages + cache-busting.
- [ ] Video demo 60s (frames de conversación REAL — no guion).
- [ ] README actualizado (instalación <30 min con Worker).

### Reglas de proceso (L4, L5 — obligatorias en cada hito):
1. Un cambio por commit, mensaje claro del porqué.
2. Todo pasa por staging → Felipe → producción. Sin excepciones.
3. Si algo falla en el Android: diagnóstico con lupa antes de tocar código (screenshot/log/auditoría CDP), no adivinar.

---

## 7. Métricas de éxito (demo)

| Métrica | Meta |
|---|---|
| Transcripción de frase completa (8+ palabras) | ≥95% en pruebas de Felipe |
| Respuesta correcta con contexto | 100% en flujo canónico |
| Latencia total (hablas → respuesta inicia) | ≤3s |
| Auto-respuestas / loops | 0 en conversación de 5 min |
| Tasa de interés tras probar demo (prospects que piden info de planes) | medir desde el CRM |

---

## 8. Lo que NO se toca de aquí en adelante

- El documento maestro (`docs/INSTRUCCIONES.md`): reglas §0-§13, Sheet como fuente de verdad, planes/tiers, política de soporte.
- El cerebro `val-brain.js` (probado E2E 9/9).
- El pipeline de grabación MediaRecorder+VAD (probado estable en Android).
- La identidad de producto: "Val, asistente de voz de AplicatiBox" (demo de venta multi-negocio).

---

## 9. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Coste Groq excede gratis | Límite por banco gratuito (§6.1): contador en el Worker; fallback a texto+TTS del navegador |
| Cloudflare Tunnel/Worker caído | URL del Worker en config; monitoreo simple (ping cada hora desde cron) |
| Calidad de Whisper en ruido | Audio webm del MediaRecorder ya probado aceptable; prompt es-CO al modelo |
| Felipe no disponible para M3 | M3 es el gate — sin su aprobación no hay merge. La demo no sale hasta que él diga "funciona" |

---

**Aprobación:** este PRD requiere el "sí" explícito de Pipe (Felipe) antes de escribir UNA línea de código. Cualquier cambio de arquitectura posterior se documenta en `docs/decisiones.md` antes de ejecutarse (regla §0.1).
