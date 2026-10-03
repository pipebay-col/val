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
