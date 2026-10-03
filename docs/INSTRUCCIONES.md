# VAL — DOCUMENTO MAESTRO DE INSTRUCCIONES

Versión: 1.0
Owner: Pipe by Punto Labs
Producto: Val — Asesora de Voz IA para clínicas de estética
Base: demo valeria.html (Vali / DermaLuxe)
Licencia: AGPL-3.0
Estado: v1.0 en preparación para piloto
Repo: github.com/pipebay-col/val (privado hasta v1.0)

---

## 0. Reglas no negociables (aplican a todos)

1. Todo se decide por escrito. Cualquier cambio de alcance, stack o precio se documenta en docs/decisiones.md antes de ejecutarse.
2. No se agrega nada fuera del alcance de la v1.0. Ver §7.
3. Prohibido inventar. Precios, disponibilidad, diagnósticos y promesas médicas solo salen del Sheet del cliente.
4. Prohibido subir datos reales de clientes al repo público. Los ejemplos usan datos ficticios.
5. Prohibido dar soporte gratis ilimitado. Ver §9.

---

## 1. Qué es Val

Una asesora de voz IA para clínicas de estética. Saluda, consulta el catálogo, informa precios y duración, agenda citas y confirma por WhatsApp. Funciona por voz en el navegador.

Frase que vende: "Una recepcionista que no duerme, por menos de lo que cuesta medio salario mínimo."

---

## 2. Usuario objetivo v1.0

Clínicas de estética y spas pequeños en Colombia con:

- 10–40 servicios en catálogo.
- 15+ consultas diarias repetidas (precios, horarios, disponibilidad).
- Atención principal por WhatsApp.
- Sin equipo para atender 24/7.

Vertical de arranque: estética y belleza. No se trabaja otra vertical en v1.0.

---

## 3. Comportamiento obligatorio del agente

### 3.1 Saludo
- Máximo 3 segundos.
- Nombre de la asesora + nombre de la clínica.
- Tono cálido, es-CO.

### 3.2 Conversación
- Usa fillers naturales: "un momentico…", "déjame revisar…".
- Consulta el Sheet antes de responder cualquier precio o disponibilidad.
- Nunca improvisa información que no esté en el Sheet.

### 3.3 Agendamiento
- Confirma 4 datos obligatorios: nombre, servicio, fecha, hora.
- Propone slots solo dentro de la hoja horario.
- Genera link wa.me prellenado con el resumen para el WhatsApp de la clínica.

### 3.4 Derivación a humano
Deriva cuando:
- No sabe la respuesta.
- El cliente se enoja o pide hablar con alguien.
- El servicio no está en el catálogo.
- Hay tema médico, legal o de salud.

### 3.5 Prohibiciones absolutas
- Inventar precios.
- Prometer resultados médicos o estéticos.
- Dar diagnósticos.
- Confirmar disponibilidad no verificada en el Sheet.
- Ofrecer servicios que no estén activos.

---

## 4. Fuente de verdad: Google Sheet

### 4.1 Hoja catalogo

| columna | tipo | obligatorio |
|---|---|---|
| id | string | sí |
| categoria | string | sí |
| nombre | string | sí |
| descripcion | string | sí |
| duracion_min | int | sí |
| precio_cop | int | sí |
| activo | bool | sí |

### 4.2 Hoja horario

| columna | tipo | obligatorio |
|---|---|---|
| dia | string | sí |
| apertura | time | sí |
| cierre | time | sí |
| activo | bool | sí |

### 4.3 Hoja config

| clave | ejemplo |
|---|---|
| nombre_clinica | DermaLuxe |
| nombre_asesora | Vali |
| whatsapp | +57... |
| tono | cálido, es-CO |

### 4.4 Reglas técnicas del Sheet
- Se lee al arranque y se cachea 5 minutos.
- Si falla, usar último cache válido y avisar en logs.
- El Sheet es de la clínica; nosotros solo lo conectamos.
- Documentar en README cómo duplicar la plantilla.

---

## 5. Stack técnico v1.0

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | valeria.html adaptado | No reescribir |
| Voz | Web Speech API | La del navegador, ya funciona |
| Backend | Serverless (Cloudflare Workers o similar) | Solo leer Sheet y registrar uso |
| Persistencia | usage.json local + Sheet | Sin base de datos |
| WhatsApp | Link wa.me prellenado | Sin API todavía |
| Deploy | GitHub + instalación manual | Menos de 30 min |

No se permite en v1.0: panel web, base de datos, login, API de WhatsApp, telefonía, multi-idioma, OpenAI Realtime.

---

## 6. Modelo freemium y banco gratuito

### 6.1 Banco gratuito (toda instalación arranca así)
- 100 conversaciones o 60 minutos de voz, lo que se agote primero.
- Sin tarjeta. Sin registro obligatorio.
- Contador local en usage.json.

### 6.2 Al agotar el banco
- Modo free_exhausted.
- Responde máximo 3 mensajes por sesión.
- Muestra: "Se agotó tu prueba gratuita. Activa Val Pro para uso ilimitado."
- CTA a la página de planes.
- El demo público no se bloquea, solo la instancia self-hosted.

### 6.3 Tiers (no modificar sin aprobación)

| Tier | Precio USD/mes | Incluye |
|---|---|---|
| Free | 0 | 100 conversaciones, catálogo básico, voz web |
| Starter | 99 | Ilimitado web, hasta 30 servicios |
| Pro | 199 | + WhatsApp, + recordatorios, + analítica |
| Premium | 349+ | + llamadas, + multi-sede, + SLA |
| Instalación | cotización | Setup, Sheet, WhatsApp, capacitación |

### 6.4 Pilotos
A las 3 clínicas candidatas (Spa Buena Vista, Casa 33, Centro Estética Dental) se les ofrece 3 meses a 99 USD "precio fundador" a cambio de:
- Caso de éxito publicado.
- Testimonio en video.
- 2 referidos.

---

## 7. Alcance de la v1.0

### 7.1 Incluye
- Lectura de catálogo desde Google Sheet.
- Voz web vía navegador.
- Agendamiento con slots reales del horario.
- Confirmación por link wa.me.
- Banco gratuito con CTA de upgrade.
- README, .env.example, SUPPORT.md, video demo.

### 7.2 NO incluye
- Panel de administración.
- API de WhatsApp.
- Llamadas telefónicas.
- Multi-idioma.
- Login o cuentas.
- Analítica avanzada.
- Reescribir el demo.

Todo lo de §7.2 es v1.1+ y solo si un cliente paga.

---

## 8. Entregables obligatorios

- [ ] valeria.html adaptado para leer Google Sheet.
- [ ] Sheet plantilla publicada y documentada.
- [ ] Banco gratuito (100 conv / 60 min) funcionando.
- [ ] CTA de upgrade al agotar banco.
- [ ] README.md completo (qué es, instalar, duplicar Sheet, límites free).
- [ ] .env.example con SHEET_ID, WHATSAPP, FREE_QUOTA=100.
- [ ] SUPPORT.md con política de soporte.
- [ ] docs/decisiones.md con decisiones tomadas.
- [ ] Video demo de 60 seg grabado y publicado.

---

## 9. Política de soporte

- Gratis: solo issues en GitHub. Sin DMs, sin soporte de instalación por chat.
- Pago: instalación guiada, conexión de Sheet, WhatsApp, capacitación, soporte mensual.
- Issues sin plantilla: se cierran automáticamente.
- Comunidad (Discord/Telegram): entre pares, sin soporte oficial.
- Soporte pago: canal separado y claramente identificado.

---

## 10. Reglas de seguridad y datos

- .env en .gitignore. Nunca subir secretos.
- .env.example sin valores reales.
- Ejemplos con datos ficticios.
- Nunca subir catálogos, precios o clientes reales.
- Modo local garantiza que el conocimiento de la clínica no sale del servidor.

---

## 11. Criterios de "listo" (v1.0)

La v1.0 está lista cuando:

1. Una clínica real edita su Sheet y el demo lo refleja sin ayuda técnica.
2. El banco gratuito se agota y aparece el CTA de upgrade.
3. Instalar desde GitHub toma menos de 30 minutos (cronometrado).
4. El video demo está grabado y publicado en el canal.

---

## 12. Proceso de trabajo

1. Amo arranca por el Sheet (dependencia de todo).
2. Reporta avance por entregable (§8).
3. Si algo del demo choca con este documento, prioriza este documento y documenta la decisión en docs/decisiones.md.
4. Cada release se etiqueta en GitHub (v1.0.0, v1.0.1).

---

## 13. Contacto y responsabilidades

| Rol | Persona | Responsabilidad |
|---|---|---|
| Owner / negocio | Pipe (Punto Labs) | Decisiones de producto y precio |
| Orquestador técnico | Amo | Construcción y entrega v1.0 |
| Canal | El lado oculto de la IA | Distribución y comunidad |
| Repo | github.com/pipebay-col/val | Código y releases |

---

Firma de conformidad: todo el que trabaje en Val debe leer este documento completo antes de tocar el código. Cualquier duda se resuelve por escrito en el repo, no por chat.
