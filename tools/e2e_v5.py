#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""E2E del motor v5 (mic virtual): click orb, saludo, estados, pregunta por texto."""
import subprocess, time, json, urllib.request, websocket

free_port = 9235
proc = subprocess.Popen([
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    '--headless=new', '--disable-gpu', '--no-sandbox',
    f'--remote-debugging-port={free_port}',
    '--remote-allow-origins=*',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--user-data-dir=C:/Users/Usuario/AppData/Local/Temp/chrome-v5b',
    'file:///C:/Users/Usuario/AppData/Local/hermes/val-repo/val-v5.html'
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

print("=== V5 E2E ===")
print("SR disp:", ev("!!(window.SpeechRecognition||window.webkitSpeechRecognition)"))
ev("document.getElementById('orb').click()")
time.sleep(4)
print("estado:", ev("document.getElementById('estado').textContent"))
print("orb clase:", ev("document.getElementById('orb').className"))
print("dbg:", ev("document.getElementById('dbg').textContent"))
print("msgs:", ev("document.getElementById('chat').children.length"))
print("ultimo:", ev("var c=document.getElementById('chat'); c.children.length ? c.children[c.children.length-1].textContent.slice(0,90) : ''"))

ev("var i=document.getElementById('input'); i.value='que puede hacer val'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));")
time.sleep(3)
print("\ntras pregunta por texto:")
print("estado:", ev("document.getElementById('estado').textContent"))
print("msgs:", ev("document.getElementById('chat').children.length"))
print("todas:", ev("Array.from(document.getElementById('chat').children).map(m=>m.textContent.slice(0,45)).join(' || ')"))

ev("var i=document.getElementById('input'); i.value='cuanto cuesta el asistente'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));")
time.sleep(3)
print("\ntras pregunta planes:")
print("todas:", ev("Array.from(document.getElementById('chat').children).map(m=>m.textContent.slice(0,45)).join(' || ')"))

ws.close(); proc.terminate()
print("\nV5 E2E DONE")
