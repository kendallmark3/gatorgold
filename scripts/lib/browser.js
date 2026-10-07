// A minimal driver for headless Chrome over the DevTools pipe, with no
// dependencies. Set CHROME to the browser binary if it is not in the default
// macOS location, and PORT if the game is not on 4747.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = `http://localhost:${process.env.PORT || 4747}/`;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Opens a phone-sized page. Screenshots are written to `outDir`.
export async function launchBrowser(outDir) {
  mkdirSync(outDir, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-pipe', '--no-first-run', '--hide-scrollbars',
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'gg-'))}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });

  let nextId = 1;
  const pending = new Map();
  const errors = [];
  let buffer = '';
  chrome.stdio[4].on('data', (chunk) => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const msg = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
      } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        errors.push(`${msg.params.entry.text} ${msg.params.entry.url ?? ''}`);
      }
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    chrome.stdio[3].write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params) => send(method, params, sessionId);
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Log.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

  return {
    errors,
    // Evaluates an expression in the page and returns its value.
    async js(expression) {
      const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async open(query = '') {
      await cdp('Page.navigate', { url: BASE + query });
      await sleep(900);
    },
    async shot(name) {
      const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
    },
    close() {
      chrome.kill();
      process.exit(0);
    },
  };
}
