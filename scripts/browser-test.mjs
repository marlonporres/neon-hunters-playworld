import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

// An isolated test browser. Never attaches to the user's Chrome profile or tabs.
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:5199/';
const output = path.resolve('.qa');
const profile = path.join(output, `chrome-profile-${Date.now()}`);
await mkdir(profile, { recursive: true });
const child = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--window-size=1280,900', '--no-first-run', '--no-default-browser-check',
  ...(process.argv.includes('--in-process-gpu') ? ['--in-process-gpu'] : []),
  '--hide-scrollbars', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let launchError;
child.on('error', (error) => { launchError = error; });
let stderr = '';
child.stderr.on('data', (data) => { stderr += data; });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errors = [];
let browserCDP;
let pageCDP;

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const events = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    } else for (const handler of events.get(message.method) || []) handler(message.params);
  });
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        pending.set(requestId, { resolve, reject, timer });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    on(method, handler) { if (!events.has(method)) events.set(method, []); events.get(method).push(handler); },
    close() { socket.close(); },
  };
}
async function evaluate(expression) {
  const result = await pageCDP.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression, timeout = 15000) {
  const start = Date.now();
  while (!await evaluate(expression)) {
    if (Date.now() - start > timeout) throw new Error(`Browser condition timed out: ${expression}`);
    await wait(150);
  }
}
async function click(selector) {
  const box = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  if (!box) throw new Error(`Missing clickable control ${selector}`);
  await pageCDP.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...box });
  await pageCDP.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...box });
}
async function screenshot(name) {
  const shot = await pageCDP.send('Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(output, name + '.png'), Buffer.from(shot.data, 'base64'));
}

try {
  let portText;
  for (let tries = 0; tries < 100; tries++) {
    if (launchError) throw launchError;
    if (child.exitCode !== null) throw new Error(`Chrome exited: ${child.exitCode}\n${stderr}`);
    try { portText = await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8'); break; } catch { await wait(150); }
  }
  if (!portText) throw new Error(`Chrome did not start\n${stderr}`);
  const [port, browserPath] = portText.trim().split(/\r?\n/);
  browserCDP = await connect(`ws://127.0.0.1:${port}${browserPath}`);
  const created = await browserCDP.send('Target.createTarget', { url: 'about:blank' });
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const tab = tabs.find((candidate) => candidate.id === created.targetId);
  pageCDP = await connect(tab.webSocketDebuggerUrl);
  pageCDP.on('Runtime.exceptionThrown', (event) => errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text));
  pageCDP.on('Runtime.consoleAPICalled', (event) => { if (event.type === 'error') errors.push(event.args.map((arg) => arg.value || arg.description).join(' ')); });
  pageCDP.on('Log.entryAdded', (event) => { if (event.entry.level === 'error') errors.push(event.entry.text); });
  await pageCDP.send('Runtime.enable');
  await pageCDP.send('Page.enable');
  await pageCDP.send('Log.enable');
  await pageCDP.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await pageCDP.send('Page.navigate', { url: baseURL + '?qa=' + (process.argv.includes('--local') ? 'local' : '1') });
  await until('Boolean(window.__STARLIGHT__ && document.querySelector("#qa-start"))');
  await wait(700);
  await screenshot('selection');
  const gpu = await evaluate(`(() => { const gl = document.querySelector('#world').getContext('webgl2'); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return { vendor:ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'unavailable',renderer:ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable',version:gl.getParameter(gl.VERSION)}; })()`);
  console.log('Chrome running:', JSON.stringify(gpu));
  await click('#qa-start');
  let previousProgress = '';
  const started = Date.now();
  while (!await evaluate('Boolean(window.__QA_RESULT__)')) {
    if (Date.now() - started > 100000) throw new Error('Full browser QA exceeded 100 seconds');
    await wait(2000);
    const progress = await evaluate('document.querySelector("#qa-result")?.textContent');
    if (progress !== previousProgress) { console.log(progress?.split('\n').at(-1)); previousProgress = progress; }
  }
  const result = await evaluate('window.__QA_RESULT__');
  result.externalErrors = errors;
  result.gpu = gpu;
  await writeFile(path.join(output, process.argv.includes('--local') ? 'browser-local.json' : 'browser.json'), JSON.stringify(result, null, 2));
  await screenshot('qa-result');
  await evaluate('document.querySelector("#qa-result").remove()');
  await screenshot('world');
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'PASS' || errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  await writeFile(path.join(output, 'launch-error.txt'), String(error) + '\n' + stderr);
} finally {
  pageCDP?.close();
  try { await browserCDP?.send('Browser.close'); } catch { child.kill(); }
  browserCDP?.close();
  await wait(500);
  // Only the unique test profile, whose resolved path is checked, is removed.
  if (profile.startsWith(output + path.sep)) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(() => {});
}
