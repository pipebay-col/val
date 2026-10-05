#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Auditoría FINAL del flujo con traza completa (mic virtual)."""
import subprocess, time, json, urllib.request, websocket

free_port = 9233
proc = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new', '--disable-gpu', '--no-sandbox',
    f'--remote-debugging-port={free_port}',
    '--remote-allow-origins=*',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--user-data-dir=C:/Users/Usuario/AppData/Local/Temp/chrome-val-final2',
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

print("=== TRAZA COMPLETA ===")
ev("""
window.__traza = [];
(function(){
  var ol=window.listen; if(ol) window.listen=function(){window.__traza.push('listen');return ol.apply(this,arguments)};
  var ot=window.transcribe; if(ot) window.transcribe=function(){window.__traza.push('transcribe');return ot&&ot.apply(this,arguments)};
  var oa=window.ask; if(oa) window.ask=function(t){window.__traza.push('ask:'+(t||'').slice(0,25));return oa.apply(this,arguments)};
  var os=window.speak; if(os) window.speak=function(t){window.__traza.push('speak');return os.apply(this,arguments)};
})();
""")
ev("document.getElementById('startBtn').click()")
print("click dado")
time.sleep(6)
print("traza:", ev("JSON.stringify(window.__traza)"))
print("debug:", ev("(document.getElementById('val-sr-debug')||{}).textContent"))
print("status:", ev("(document.getElementById('status')||{}).textContent"))
print("orb:", ev("(document.getElementById('orbWrap')||{}).className"))
print("stream core:", ev("!!window.stream"))
time.sleep(8)
print("\n=== TRAS 14s ===")
print("traza:", ev("JSON.stringify(window.__traza)"))
print("debug:", ev("(document.getElementById('val-sr-debug')||{}).textContent"))
print("stream core:", ev("!!window.stream"))
print("chat:", ev("var c=document.getElementById('chat'); c? c.children.length : -1"))

ws.close(); proc.terminate()
print("AUDIT FINAL DONE")
