#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fusiona la UI Stitch (visual) con el voice core original (voz real).
Resultado: valeria.html con diseño Stitch + speechSynthesis + SpeechRecognition.
"""
import re, urllib.request

# 1. Descargar ambos HTML
stitch_html = urllib.request.urlopen("https://pipebay-col.github.io/val/valeria.html").read().decode('utf-8')
original_html = urllib.request.urlopen("https://raw.githubusercontent.com/pipebay-col/val/main/valeria.html").read().decode('utf-8')

# 2. Extraer voice core original (script completo funcional)
script_match = re.search(r'<script>([\s\S]*?)</script>\s*</body>', original_html)
voice_core = script_match.group(1) if script_match else ""

# 3. Extraer Stitch head y body (sin su script dummy)
head_match = re.search(r'<head>([\s\S]*?)</head>', stitch_html)
stitch_head = head_match.group(1) if head_match else ""
body_match = re.search(r'<body[^>]*>([\s\S]*?)</body>', stitch_html)
stitch_body = body_match.group(1) if body_match else ""
stitch_body_clean = re.sub(r'<script>[\s\S]*?</script>\s*$', '', stitch_body)

# 4. Adaptador: mapea IDs Stitch -> IDs del voice core original
adapter = """
<script>
/* ====== ADAPTER: Stitch UI + Voice Core Original ====== */
(function() {
  // Elementos del voice core original que el script espera encontrar por getElementById.
  // El voice core hace sus propios getElementById, asi que creamos elementos fantasma
  // y conectamos los reales del Stitch donde corresponde.
  function ghost(id, tag) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement(tag || 'div'); el.id = id; el.style.display = 'none'; document.body.appendChild(el); }
    return el;
  }
  // chat: el voice core le agrega mensajes — lo creamos oculto (Stitch usa status-title)
  // GHOSTS COMPLETOS: el voice core hace getElementById de 25 IDs al cargar.
  // Si alguno es null, el script muere en la primera linea y NADA funciona.
  // Creamos TODOS los que no existen en la UI Stitch.
  var NEED = ['chat','viz','chips','start','startBtn','status','orbWrap',
              'holoStart','holoDock','stars','backdrop',
              'fabAgenda','drAgenda','agendaBody','fabCart','drCart','cartBody','cartBadge',
              'fabLog','drLog','logBody','citaMsg','waNombre','waTel','textInput'];
  NEED.forEach(function(id){ ghost(id, id==='viz'?'canvas':(id==='textInput'?'input':'div')); });
  // Referencias reales de Stitch que el adapter usa mas abajo:
  var fab = document.getElementById('main-fab');
  var sb = document.getElementById('startBtn');
  var stitchChips = document.getElementById('chips-container');

  // Tras cargar el voice core, enganchar el FAB y chips reales de Stitch:
  window.addEventListener('load', function() {
    // FAB = orbWrap: click = barge-in / empezar a escuchar / iniciar sesion
    if (fab) {
      fab.addEventListener('click', function() {
        if (!window.session) { sb.click(); return; }
        if (window.recording) { window.stopRecording && window.stopRecording(); }
        else if (!window.busy && !window.micBlocked) { window.listen && window.listen(); }
      });
    }
    // Estado del voice core -> actualizar Stitch status-title/subtitle + orb
    const statusTitle = document.getElementById('status-title');
    const statusSubtitle = document.getElementById('status-subtitle');
    const lastTitle = { t: '' };
    const syncStatus = setInterval(function() {
      if (window.statusEl && window.statusEl.textContent !== lastTitle.t) {
        lastTitle.t = window.statusEl.textContent;
        if (statusTitle) statusTitle.textContent = lastTitle.t;
        // Mapear modo visual del voice core al orb de Stitch
        const s = window.orbWrap ? (window.orbWrap.dataset.mode || window.orbWrap.className.match(/(idle|listening|thinking|speaking)/) || [])[0] : '';
        if (s && window.setVoiceState) window.setVoiceState(s);
      }
      if (statusSubtitle && window.session) {
        statusSubtitle.textContent = window.busy ? 'Consultando...' : 'Te escucho cada vez que hables';
      }
    }, 400);
    // Chips de Stitch -> prompts reales al cerebro
    const chipMap = {
      'Precio botox': 'Hola, ¿cuánto vale el botox de la frente?',
      'Agendar cita': 'Quiero agendar una cita',
      'Tratamientos': '¿Qué tratamientos tienen?',
      'Horarios': 'Horarios y disponibilidad',
    };
    document.querySelectorAll('#chips-container .chip, #chips-container button').forEach(function(el) {
      var txt = (el.textContent || '').trim();
      for (var k in chipMap) { if (txt.indexOf(k) >= 0) { el.dataset.prompt = chipMap[k]; break; } }
    });
    if (stitchChips) {
      stitchChips.addEventListener('click', function(e) {
        var chip = e.target.closest('[data-prompt]');
        if (chip) {
          if (!window.session) { sb.click(); setTimeout(function(){ window.ask && window.ask(chip.dataset.prompt); }, 500); }
          else { window.ask && window.ask(chip.dataset.prompt); }
          // Colapsar el sheet como pide el diseño
          var sheet = document.getElementById('bottom-sheet');
          if (sheet) sheet.classList.add('collapsed');
        }
      });
    }
    console.log('[Val Fusion] Stitch UI + voz real conectadas');
  });
})();
</script>
"""

# 4b. Inyectar los modulos val-*.js ANTES del adapter (el shim intercepta /api/tts y /api/asr)
modulos = """<script src="val-config.js"></script>
<script src="val-sheet.js"></script>
<script src="val-quota.js"></script>
<script src="val-brain.js"></script>
<script src="val-shim.js"></script>
<script src="val-demo.js"></script>
"""

# 4c. Parche de UX de voz (post-core): anti-eco, VAD móvil, saludo único, estados sincronizados
patch_ref = """<script src="val-ux-patch.js"></script>
"""

# 5. HTML final fusionado
parts = []
parts.append('<!DOCTYPE html>\n<html lang="es">\n<head>\n' + stitch_head + '\n</head>\n<body>\n')
parts.append(stitch_body_clean)
parts.append(modulos)
parts.append(adapter)
parts.append('<script>\n' + voice_core + '\n</script>\n')
parts.append(patch_ref)
parts.append('</body>\n</html>')
fused = '\n'.join(parts)

out = r'C:\Users\Usuario\AppData\Local\hermes\val-repo\valeria.html'
with open(out, 'w', encoding='utf-8') as f:
    f.write(fused)

print("FUSED OK:", len(fused), "chars ->", out)
