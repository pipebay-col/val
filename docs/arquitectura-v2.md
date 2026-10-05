# Arquitectura v2.0 — Val con IA, API y pagos (paso 2 del plan de producción)

> **Estado:** PROPUESTA pendiente de aprobación de Felipe (§0.1: todo cambio de alcance/stack se documenta antes de ejecutarse).
> **Base:** v1.0 (main, commit 3e5890b) — frontend 100% estático, cerebro `ValBrain` determinista, Sheet como fuente de verdad, cero backend.
> **Fecha:** 5-oct-2026

---

## 0. Qué cambia y qué no

| Ámbito | v1.0 (hoy, main) | v2.0 (propuesta) |
|---|---|---|
| Frontend | `valeria.html` + módulos JS, estático | Igual — sin cambios visibles para la clínica |
| Datos | Google Sheet (CSV publicado) | Igual: Sheet sigue siendo fuente de verdad |
| Cerebro | Regex/intents determinista (`val-brain.js`) | LLM gratuito (Groq) → fallback automático a ValBrain determinista |
| Voz | Web Speech API (ASR+TTS, probada en Android) | Igual |
| Backend | Ninguno (fetch interceptado por `val-shim.js`) | API serverless mínima (Cloudflare Workers, free tier) |
| Pagos | Ninguno | Stripe Payment Links (sin backend de checkout) |
| Quota | localStorage local | Contador en la API (por origen) + límite local |
| Repo | Público con AGPL-3.0 | Igual |

---

## 1. Principios no negociables (heredados de v1.0)

1. **El Sheet es la única fuente de verdad** — el LLM nunca dictamina precios ni disponibilidad; solo redacta la respuesta con los datos que le pasa el servidor.
2. **Nunca inventar** (§3.5): cualquier dato numérico (precio, duración, slot) sale del Sheet; el LLM solo elige palabras.
3. **Fallback total:** si el LLM falla (rate limit, caída, timeout 5s), la respuesta sale de ValBrain determinista — el cliente nunca ve un error ni silencio.
4. **Cero credenciales en el cliente:** las API keys (Groq, Stripe) viven solo en variables de entorno del Worker (secret manager).
5. **Sin base de datos propia en v2.0:** uso y pagos se registran en el propio Sheet (hoja `uso`) o KV del Worker; nada de Postgres/Mongo.
6. **AGPL-3.0** ya aplicado — v2.0 mantiene licencia y visibilidad pública.

---

## 2. Arquitectura por capas

```
[Clínica]
   │  publica CSV
   ▼
Google Sheet ◄─────── 5 min cache ───────► val-sheet.js (cliente)
   (fuente de verdad)

[Cliente: valeria.html + módulos]
   │ fetch('/api/*') interceptado por val-shim.js
   ▼
[Worker /api/chat]  ──► Groq LLM (llama-3.3-70b, free tier)
   │  system prompt con catálogo + reglas §3       │
   │  timeout 5s / rate limit                       ▼
   │                                         fallback → ValBrain local
   ▼
Respuesta {answer, action, args} — mismo contrato que v1.0
```

- **Contrato idéntico:** el Worker devuelve exactamente `{answer, action, args}` — `val-shim.js` no se reescribe, solo cambia la URL de destino.
- **El LLM es un redactor, no un decisor:** el Worker arma el prompt con el catálogo (leído del Sheet con el mismo parser CSV) y con las reglas (nunca inventar precios, derivar ante queja, pedir 4 datos para agenda). El LLM responde texto; la acción (`derivar`, `confirmar_cita`) la decide el Worker con las mismas regex de ValBrain.

---

## 3. Componentes v2.0

### 3.1 Worker `/api/chat` (Cloudflare Workers, free tier 100k req/día)

- Lee la configuración desde `VAL_CONFIG` en vars del Worker (SHEET_ID, QUOTAS, PLANES_URL).
- Input: `{texto, historia}` → Output: `{answer, action, args}` (contrato v1.0).
- Prompt al LLM: catálogo + horario del Sheet (cache 5 min en KV del Worker) + reglas §3 + los últimos 6 turnos de historia.
- **Rate limit y seguridad:** máx 1 req/s por IP; máximo 30 turnos por conversación; validar texto ≤500 chars; responder `429` con CTA a PLANES_URL cuando el banco esté agotado.
- **Fallback en cadena:** LLM → ValBrain (misma lógica del cliente, importada como módulo) → mensaje fijo de derivación. Tres capas, nunca silencio.

### 3.2 Groq (LLM gratuito)

- Modelo: `llama-3.3-70b-versatile` (free tier: ~6k req/día) — español excelente.
- El Worker cachea la respuesta 24h en KV para preguntas frecuentes (hola, precios top) — reduce el burn del free tier.
- Si Groq responde 429 (rate limit), el fallback es inmediato — el usuario no percibe la caída.

### 3.3 Pagos — Stripe Payment Links

- Planes Starter/Pro/Premium con Payment Links estáticos (sin backend de checkout en v2.0).
- Página `/planes` en el mismo sitio estático con los 3 links.
- Tras pagar, la activación es manual v2.0 (Felipe recibe el mail de Stripe y edita una fila del Sheet `config`: `plan=pro`, `plan_vence=...`). **Sin webhook en v2.0** — documentado como deuda técnica aceptada.
- Las quotas del Worker leen el plan desde el Sheet `config` — la clínica puede gestionar su propio plan.

### 3.4 Registro de uso (quota server-side)

- Worker cuenta conversaciones/minutos por `plan` (Sheet `config`) en KV: clave = hash(SHEET_ID+fecha), TTL 24h.
- El cliente sigue con su contador local v1.0 — doble capa: agotamiento local → CTA planes; agotamiento server → 429 + CTA planes.

---

## 4. Costos v2.0 (todo free tier)

| Servicio | Tier gratuito | Riesgo |
|---|---|---|
| Cloudflare Workers | 100k req/día | Ninguno |
| Groq | ~6k req/día | Rate limit → fallback cubre |
| Stripe | Solo cobro por transacción | Ninguno |
| GitHub Pages | Ilimitado estático | Ninguno |
| Google Sheets | Gratis | Ya resuelto en v1.0 |

**Costo fijo total: $0.** Monetización: planes $99/$199/$349 (pricing de memoria, $349 puede subir a $399 por precio de mercado).

---

## 5. Plan de ejecución v2.0 (orden)

1. **S-1:** Worker `/api/chat` + env vars + importar ValBrain como fallback — probar con curl, sin tocar el cliente.
2. **S-2:** Parche en `val-shim.js`: switch producción (`/api/chat`) ↔ local (shim actual) según `VAL_CONFIG.MODO`.
2. **S-3:** Página `/planes` + 3 Stripe Payment Links + fila `plan` en Sheet config.
4. **S-4:** QA Android real: voz → LLM → agenda → wa.me, y fallback forzado (apagar Groq en dev) — screenshot antes de "listo".
5. **S-5:** Commit a main + actualizar README (sección "Planes y IA").

Deuda técnica aceptada: activación de plan manual (S-3), sin webhook Stripe; sin ASR/TTS en servidor (Web Speech API sigue siendo la voz).

---

## 6. Decisión D-005 (a registrar en decisiones.md)

**D-005 · 5-oct-2026 · Backend e IA para v2.0**
- **Decisión:** v2.0 agrega Worker Cloudflare `/api/chat` con LLM Groq free tier y fallback a ValBrain; pagos con Stripe Payment Links; quota server-side en KV. Sheet sigue como única fuente de verdad; contrato cliente `{answer, action, args}` intacto.
- **Motivo:** paso 2 del plan de producción (repo público + arquitectura IA/pagos) requiere IA real y monetización, sin costo fijo ($0) y sin romper lo que funciona (§5: no reescribir el demo).
- **Alternativas descartadas:** Next API routes (requiere hosting Node = costo fijo); OpenAI (no free tier para chat); Supabase (base de datos = fuera de alcance v2.0).
