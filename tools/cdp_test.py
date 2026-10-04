#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prueba interactiva CDP: click real en el orb + observación de estados."""
import subprocess, time, json, urllib.request, websocket

free_port = 9227
proc = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new', '--disable-gpu', '--no-sandbox',
    f'--remote-debugging-port={free_port}',
    '--remote-allow-origins=*',
    '--user-data-dir=C:/Users/Usuario/AppData/Local/Temp/chrome-val-test4',
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
    r = json.loads(ws.recv())
    return r.get('result',{}).get('result',{}).get('value')

ev("""
window.__dbg = {listen_calls:0, mode_hist:[]};
(function(){
  const orig = window.listen;
  window.listen = function(){ window.__dbg.listen_calls++; return orig && orig.apply(this, arguments); };
  const om = window.setMode;
  window.setMode = function(m){ window.__dbg.mode_hist.push(m); return om && om.apply(this, arguments); };
})();
""")
print("inicial — session:", ev("window.session"))

ev("document.getElementById('orb-core').click()")
time.sleep(4)
print("tras click — session:", ev("window.session"))
print("listen() calls:", ev("window.__dbg.listen_calls"))
print("mode_hist:", ev("JSON.stringify(window.__dbg.mode_hist)"))
print("orbCore className:", ev("document.getElementById('orb-core').className"))
print("statusSubtitle:", ev("(document.getElementById('status-subtitle')||{}).textContent"))
print("statusTitle:", ev("(document.getElementById('status-title')||{}).textContent"))
print("micSvg color:", ev("(document.getElementById('val-mic-svg')||{}).style ? document.getElementById('val-mic-svg').style.color : 'no-svg'"))
print("TTS speaking:", ev("window.speechSynthesis && window.speechSynthesis.speaking"))
time.sleep(3)
print("mode_hist final:", ev("JSON.stringify(window.__dbg.mode_hist)"))
print("SR errors (headless sin mic es normal):", ev("window.__dbg.sr_errors || 'n/a'"))

ws.close()
proc.terminate()
print("TEST DONE")
