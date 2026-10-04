# Decisiones documentadas — Val

Regla §0.1: todo cambio de alcance, stack o precio se documenta aquí ANTES de ejecutarse.

---

## D-001 · 3-oct-2026 · Repo y visibilidad
- **Decisión:** el código vive en `github.com/pipebay-col/val` (privado) hasta v1.0.
- **Motivo:** el documento maestro dice "Repo: github.com/punto-labs/val", pero la org `punto-labs` NO existe en GitHub (verificado: `gh api orgs/punto-labs/repos` → 404). El owner GitHub real es `pipebay-col` (donde ya vive `aplicatibox-landings`). Se usa el usuario existente en vez de crear una org nueva.
- **Visibilidad:** privado mientras no exista el sheet plantilla con datos ficticios y el README — para cumplir §0.4 (nunca datos reales en repo público). Al cumplir §8 se evalúa hacerlo público con la licencia AGPL-3.0.

## D-002 · 3-oct-2026 · Punto de partida del código
- **Decisión:** partir de `ppline-dashboard/public/demo/valeria.html` (Vali/DermaLuxe) SIN reescribir (§5).
- **Motivo:** es la base declarada por el owner; ya funciona con Web Speech API.

## D-003 · 3-oct-2026 · Anexo Sheet plantilla
- **Decisión:** se publica `docs/sheet-plantilla.md` (y CSV de ejemplo con datos FICTICIOS de DermaLuxe) como primer entregable — es la dependencia de todo (§12.1).
- **Motivo:** §8 exige "Sheet plantilla publicada y documentada"; el agente Amo no puede arrancar sin el formato exacto.

## D-004 · 3-oct-2026 · Arquitectura de la v1.0 self-hosted (sin backend Next)
- **Decisión:** el `valeria.html` del repo se adapta con UNA capa de compatibilidad inline (`val-config.js` + parches quirúrgicos), sin reescribir el demo. Las 4 llamadas `fetch('/api/...')` del demo original se interceptan y redirigen:
  - `/api/tts` → Web Speech API (`speechSynthesis`, voz es-CO, fallback ya existente en el demo).
  - `/api/asr` → `webkitSpeechRecognition` (Web Speech API, es-CO, continuo).
  - `/api/voice-assistant` → cerebro local `ValBrain` (JS puro): catálogo del Sheet + intents (consulta/agendar/derivación) + reglas §3 del documento maestro. Cero LLM en v1.0 (§5: serverless "solo leer Sheet y registrar uso"; no hay presupuesto LLM en el tier Free).
  - `/api/bookings` → genera link `wa.me` prellenado con los 4 datos (§3.3) y marca el uso.
- **Motivo:** §5 fija Web Speech API como voz y prohíbe base de datos/panel/API WhatsApp en v1.0; el demo dependía de 4 rutas del dashboard Next (tts/asr/voice-assistant/bookings con edge-tts y LLM Python) que no existen en una instalación self-hosted desde GitHub. Documentado según §0.1 antes de ejecutar.
- **Regla respetada:** §5 "Frontend: valeria.html adaptado. No reescribir" — los parches son aditivos (override de `fetch` + inyección de módulos), el núcleo visual/orb/agenda del demo queda intacto.
