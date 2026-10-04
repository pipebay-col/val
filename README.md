# Val — Asesora de Voz IA para clínicas de estética

Una recepcionista que no duerme, por menos de lo que cuesta medio salario mínimo.

Val atiende por voz en el navegador: saluda, consulta el catálogo, informa precios y duración, agenda citas y confirma por WhatsApp. Todo el conocimiento de tu clínica vive en **tu Google Sheet** — Val nunca inventa un precio.

> Antes de instalar o modificar algo, lee [`docs/INSTRUCCIONES.md`](docs/INSTRUCCIONES.md) completo. Es el documento maestro.

## Instalación en menos de 30 minutos

### Requisitos
- Un navegador basado en Chromium (Chrome o Edge) — la voz usa la Web Speech API del navegador.
- Un Google Sheet (la plantilla se entrega al contratar o se duplica de `docs/sheet-plantilla.md`).
- El WhatsApp de la clínica.

### Paso 1 — Duplica el Sheet plantilla (5 min)
1. Crea un Google Sheet con 3 hojas: `catalogo`, `horario`, `config` (formato exacto en `docs/sheet-plantilla.md`).
2. Llena tus servicios, precios y horarios reales.
3. **Publica el Sheet**: Archivo → Compartir → **Publicar en la web** → selecciona cada hoja como CSV → Publicar.
4. Copia el `SHEET_ID` de la URL: `https://docs.google.com/spreadsheets/d/`**`ESTE_ID`**`/edit`

### Paso 2 — Descarga y configura (10 min)
```bash
git clone https://github.com/pipebay-col/val.git
cd val
```
Abre `val-config.js` y edita solo 2 valores:
```js
SHEET_ID: 'PEGA_AQUI_TU_SHEET_ID',
WHATSAPP: '+573001234567',  // WhatsApp de tu clínica
```

### Paso 3 — Pruébala localmente (5 min)
Los navegadores bloquean `fetch` sobre `file://`, así que sirve la carpeta con cualquier servidor estático:
```bash
# opción 1: npx
npx serve .
# opción 2: python
python -m http.server 8080
```
Abre `http://localhost:8080/valeria.html`, permite el micrófono y habla.

### Paso 4 — Publícala (10 min)
Sube la carpeta a cualquier hosting estático (GitHub Pages, Netlify, Cloudflare Pages) o pídela instalada con el plan de instalación.

## Límites del plan gratuito
- 100 conversaciones **o** 60 minutos de voz, lo que se agote primero.
- Contador local en tu navegador (sin registro, sin tarjeta).
- Al agotarse: Val responde máximo 3 mensajes por sesión y muestra el enlace a planes.

## Preguntas rápidas
- **No habla / no escucha:** usa Chrome o Edge y permite el micrófono. La voz sale del navegador (Web Speech API).
- **Dice que el catálogo no está conectado:** revisa que el Sheet esté **publicado en la web** (no basta compartirlo) y que el SHEET_ID esté bien.
- **No abre WhatsApp al confirmar la cita:** revisa el número en `val-config.js` (con indicativo de país, solo dígitos tras el `+`).
- **Los precios salen rareros o viejos:** el Sheet se cachea 5 minutos; espera o recarga. Val NUNCA inventa precios (§3.5 del documento maestro).

## Estructura del repo
```
valeria.html    — demo base adaptado (no reescribir, §5)
val-config.js   — TU configuración (SHEET_ID, WhatsApp, cuotas)
val-sheet.js    — lector del Sheet con caché 5 min
val-brain.js    — cerebro local: intents, agenda, derivación
val-quota.js    — banco gratuito (100 conv / 60 min)
val-shim.js     — capa self-hosted: intercepta las llamadas del demo
docs/           — documento maestro, decisiones, plantilla Sheet
```

## Licencia
AGPL-3.0. Consulta `docs/INSTRUCCIONES.md` §0 antes de cualquier uso comercial.
