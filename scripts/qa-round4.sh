#!/bin/bash
# Round-4 QA — hosts the dev server inside this command so it stays up for the whole run.
cd /home/z/my-project

echo "=== [1] starting dev server ==="
bun run dev > /tmp/qa-server.log 2>&1 &
SERVER_PID=$!

up=0
for i in $(seq 1 60); do
  sleep 1
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 http://localhost:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then up=1; break; fi
done
if [ "$up" != "1" ]; then echo "FATAL: server never came up"; tail -20 /tmp/qa-server.log; exit 1; fi
echo "server up (pid $SERVER_PID)"

echo "=== [2] API checks ==="
echo -n "GET / -> "; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
echo -n "GET /api/profile -> "; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/profile
echo "GET /api/dreams -> $(curl -s http://localhost:3000/api/dreams | head -c 120)"
CREATED=$(curl -s -X POST http://localhost:3000/api/dreams -H "Content-Type: application/json" -d '{"body":"QA round4 probe dream","mood":"strange"}')
echo "POST /api/dreams -> $(echo $CREATED | head -c 160)"
DREAM_ID=$(echo "$CREATED" | python3 -c "import sys,json; print(json.load(sys.stdin)['dream']['id'])" 2>/dev/null)
echo -n "DELETE /api/dreams -> "; curl -s -X DELETE "http://localhost:3000/api/dreams?id=$DREAM_ID"; echo
echo -n "POST /api/dreams empty -> "; curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/dreams -H "Content-Type: application/json" -d '{"body":""}'

echo "=== [3] browser reload + errors ==="
agent-browser reload
sleep 3
agent-browser errors
echo "console tail:"; agent-browser console 2>&1 | tail -3

echo "=== [4] mixer: play + trim slider + import/export ==="
agent-browser eval "document.body.focus(); document.dispatchEvent(new KeyboardEvent('keydown',{key:'1',bubbles:true})); 'played-rain'"
sleep 2
agent-browser eval "(() => {
  const slider = document.querySelector('#base-trim');
  const label = (document.querySelector('label[for=base-trim]')?.textContent)||'';
  return JSON.stringify({ trimPresent: !!slider, label });
})()"
agent-browser eval "(() => {
  document.querySelector('#mixer')?.scrollIntoView();
  const btns = Array.from(document.querySelectorAll('#mixer button'));
  const imp = btns.find(b => /import mixes/i.test(b.textContent||''));
  imp?.click();
  return 'import-open: ' + !!imp;
})()"
sleep 1
agent-browser eval "(() => {
  const ta = document.querySelector('#preset-import');
  if (!ta) return 'no import textarea';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
  setter.call(ta, JSON.stringify([{name:'QA Imported Mix',base:'ocean',rain:0.3,wind:0.5,fire:0.2},{name:'Bad Row',base:'nope',rain:1,wind:0,fire:0}]));
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  return 'pasted';
})()"
sleep 1
agent-browser eval "(() => {
  const add = Array.from(document.querySelectorAll('#mixer button')).find(b => /add to shelf/i.test(b.textContent||''));
  add?.click();
  return 'added';
})()"
sleep 1.5
agent-browser eval "(() => {
  const t = document.querySelector('#mixer')?.textContent || '';
  const raw = window.localStorage.getItem('luna-drift-player');
  const names = (JSON.parse(raw).state.customPresets||[]).map(p=>p.name).join('|');
  return JSON.stringify({ imported: /QA Imported Mix/.test(t), note: /1 added · 1 skipped/.test(t), lsPresets: names });
})()"

echo "=== [5] journal: night card + sparkline ==="
agent-browser eval "(async () => { await fetch('/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({soundscape:'rain',minutes:45,completed:true})}); window.dispatchEvent(new CustomEvent('luna:session-recorded')); return 'seeded'; })()"
sleep 1.5
agent-browser eval "(() => {
  document.querySelector('#journal')?.scrollIntoView();
  return JSON.stringify({
    spark: !!document.querySelector('#journal svg[role=img]'),
    card: !!Array.from(document.querySelectorAll('#journal button')).find(b=>(b.getAttribute('aria-label')||'').includes('night card')),
    dreamsPanel: /dream notebook/i.test(document.querySelector('#journal')?.textContent||''),
  });
})()"
agent-browser eval "(() => { Array.from(document.querySelectorAll('#journal button')).find(b=>(b.getAttribute('aria-label')||'').includes('night card'))?.click(); return 'card-clicked'; })()"
sleep 1
agent-browser errors

echo "=== [6] dream note via UI ==="
agent-browser eval "(() => {
  const ta = document.querySelector('#dream-text');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
  setter.call(ta,'A train with no engine gliding past a field of lit windows.');
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  return 'typed';
})()"
agent-browser eval "(() => { Array.from(document.querySelectorAll('#journal button')).find(b=>/keep this dream/i.test(b.textContent||''))?.click(); return 'saved'; })()"
sleep 1.5
agent-browser eval "(() => {
  const t = document.querySelector('#journal')?.textContent||'';
  return JSON.stringify({ listed: /train with no engine/.test(t) });
})()"

echo "=== [7] wake light end-to-end (target = now+1min) ==="
agent-browser eval "(() => {
  document.querySelector('#timer')?.scrollIntoView();
  const inp = document.querySelector('input[type=time]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  const t = new Date(Date.now() + 60000);
  const hhmm = [t.getHours(), t.getMinutes()].map(n=>String(n).padStart(2,'0')).join(':');
  setter.call(inp, hhmm);
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  inp.dispatchEvent(new Event('change',{bubbles:true}));
  return 'set to ' + hhmm;
})()"
sleep 1
agent-browser eval "(() => {
  const sw = document.querySelector('#timer button[role=switch]');
  sw?.click();
  return 'switch: ' + !!sw;
})()"
sleep 2
agent-browser eval "(() => {
  const t = document.querySelector('#timer')?.textContent||'';
  const header = document.querySelector('header')?.textContent||'';
  return JSON.stringify({ armed: /armed for/.test(t), headerChip: /\d{2}:\d{2}/.test(header) });
})()"
echo "waiting ~75s for the wake window..."
sleep 75
agent-browser eval "(() => {
  const dlg = document.querySelector('[role=alertdialog]');
  return JSON.stringify({ overlay: !!dlg, text: (dlg?.textContent||'').slice(0,80) });
})()"
agent-browser screenshot /tmp/qa-wakelight.png
agent-browser eval "(() => { Array.from(document.querySelectorAll('[role=alertdialog] button')).find(b=>/awake/i.test(b.textContent||''))?.click(); return 'dismissed'; })()"
sleep 1
agent-browser eval "(() => JSON.stringify({ gone: !document.querySelector('[role=alertdialog]') }))()"

echo "=== [8] screenshots: timer + dream panel ==="
agent-browser eval "document.querySelector('#timer')?.scrollIntoView()"
sleep 1
agent-browser screenshot /tmp/qa-timer.png
agent-browser eval "document.querySelector('#journal')?.scrollIntoView(); window.scrollBy(0, 500)"
sleep 1
agent-browser screenshot /tmp/qa-dreams.png

echo "=== [9] final error sweep ==="
agent-browser errors
echo "QA COMPLETE"
