#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Auditoría CON LUPA del pipeline de voz completo con micrófono virtual."""
import subprocess, time, json, urllib.request, websocket

free_port = 9231
proc = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new', '--disable-gpu', '--no-sandbox',
    f'--remote-debugging-port={free_port}',
    '--remote-allow-origins=*',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--user-data-dir=C:/Users/Usuario/AppData/Local/Temp/chrome-val-audit2',
    'file:///C:/Users/Usuario/AppData/Local/hermes/val-repo/valeria.html'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(6)

info = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{free_port}/json').read().decode())
page = [t for t in info if t['type'] == 'page'][0]

ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=15)
mid = [0]
def ev(expr):
    mid[0] += 1
    ws.send(json.dumps({"id":mid[0],"method":"Runtime.evaluate","params":{"expression":expr,"returnByValue":True}}))
    return json.loads(ws.recv()).get('result',{}).get('result',{}).get('value')

print("=== INICIAL ===")
print("session:", ev("window.session"))
print("SR disp:", ev("!!(window.SpeechRecognition||window.webkitSpeechRecognition)"))
print("debug:", ev("(document.getElementById('val-sr-debug')||{}).textContent"))

ev("""
window.__audit = {listen:0, transcribe:0, ask:0, speak:0, setMode:[]};
(function(){
  var ol = window.listen; if (ol) window.listen = function(){ window.__audit.listen++; return ol.apply(this, arguments); };
  var ot = window.transcribe; if (ot) window.transcribe = function(){ window.__audit.transcribe++; return ot && ot.apply(this, arguments); };
  var oa = window.ask; if (oa) window.ask = function(){ window.__audit.ask++; return oa.apply(this, arguments); };
  var os = window.speak; if (os) window.speak = function(){ window.__audit.speak++; return os.apply(this, arguments); };
  var om = window.setMode; if (om) window.setMode = function(m){ window.__audit.setMode.push(m); return om.apply(this, arguments); };
})();
""")

print("\n=== CLICK EMPEZAR ===")
ev("document.getElementById('startBtn').click()")
time.sleep(5)
print("session:", ev("window.session"))
print("debug:", ev("(document.getElementById('val-sr-debug')||{}).textContent"))
print("audit:", ev("JSON.stringify(window.__audit)"))
print("status:", ev("(document.getElementById('status')||{}).textContent"))
print("orb:", ev("(document.getElementById('orbWrap')||{}).className"))

time.sleep(8)
print("\n=== TRAS 13s ===")
print("audit:", ev("JSON.stringify(window.__audit)"))
print("debug:", ev("(document.getElementById('val-sr-debug')||{}).textContent"))
print("chat msgs:", ev("(document.getElementById('chat')||{children:[]}).children.length"))
print("ultimo:", ev("var c=document.getElementById('chat'); c&&c.children.length? c.children[c.children.length-1].textContent.slice(0,120) : 'sin msgs'"))
print("micBlocked:", ev("window.micBlocked"))

ws.close(); proc.terminate()
print("AUDIT DONE")
