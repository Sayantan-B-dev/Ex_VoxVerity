import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const COMMON_ARGS = [
  "--headless=new",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--window-size=1280,900",
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
  "--autoplay-policy=no-user-gesture-required",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Browser {
  constructor(name, port) {
    this.name = name;
    this.port = port;
    this.profile = path.join(os.tmpdir(), `vv-call-e2e-${name}-${Date.now()}`);
  }
  async launch() {
    this.proc = spawn(CHROME, [...COMMON_ARGS, `--remote-debugging-port=${this.port}`, `--user-data-dir=${this.profile}`, "about:blank"], { stdio: "ignore" });
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json/list`);
        const list = await res.json();
        const page = list.find((t) => t.type === "page");
        if (page) {
          this.ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((res2, rej) => { this.ws.onopen = res2; this.ws.onerror = rej; });
          this.id = 0;
          this.pending = new Map();
          this.ws.onmessage = (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id && this.pending.has(msg.id)) { this.pending.get(msg.id)(msg); this.pending.delete(msg.id); }
          };
          await this.send("Page.enable");
          await this.send("Runtime.enable");
          return;
        }
      } catch { }
      await sleep(400);
    }
    throw new Error(`${this.name}: CDP not reachable`);
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => this.pending.set(id, resolve));
  }
  async evalJs(expression) {
    const res = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) throw new Error(`${this.name} eval error: ${JSON.stringify(res.result.exceptionDetails).slice(0, 300)}`);
    return res.result?.result?.value;
  }
  async waitFor(expr, timeoutMs = 20000, label = expr) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try { const v = await this.evalJs(expr); if (v) return v; } catch { }
      await sleep(400);
    }
    throw new Error(`${this.name}: TIMEOUT waiting for ${label}`);
  }
  async navigate(url) {
    await this.send("Page.navigate", { url });
    await sleep(1200);
  }
  async typeInto(selector, text) {
    await this.waitFor(`document.querySelector(${JSON.stringify(selector)}) !== null`, 15000, `input ${selector}`);
    await this.evalJs(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await this.send("Input.insertText", { text });
  }
  async clickByText(text) {
    const pos = await this.waitFor(
      `(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === ${JSON.stringify(text)}); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
      15000,
      `button "${text}"`
    );
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pos.x, y: pos.y, button: "left", clickCount: 1 });
  }
  async register(email, name) {
    await this.navigate("http://localhost:3000/register");
    await this.typeInto('input[type="text"]', name);
    await this.typeInto('input[type="email"]', email);
    await this.typeInto('input[type="password"]', "CallE2EPass123");
    await this.clickByText("Create account");
    await this.waitFor(`location.pathname === "/dashboard"`, 30000, "dashboard after register");
  }
  async goLive() {
    await this.navigate("http://localhost:3000/live");
    await this.waitFor(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === "Create room")`, 20000, "Live page");
  }
  close() { try { this.ws?.close(); } catch {} try { this.proc?.kill(); } catch {} }
}

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  → " + detail : ""}`); };

const A = new Browser("A", 9411);
const B = new Browser("B", 9412);
const EMAIL_A = `caller-${Date.now()}@example.com`;
const EMAIL_B = `joiner-${Date.now()}@example.com`;

try {
  await A.launch();
  await B.launch();
  console.log("Registering caller…");
  await A.register(EMAIL_A, "Caller Alice");
  console.log("Registering joiner…");
  await B.register(EMAIL_B, "Joiner Bob");

  await A.goLive();
  await A.clickByText("Create room");
  const code = await A.waitFor(`document.querySelector('p.font-mono')?.textContent ?? null`, 20000, "room code");
  check("A created a room and got a 6-char code", /^[A-Z0-9]{6}$/.test(code ?? ""), String(code));

  await B.goLive();
  await B.typeInto('input[placeholder="K7F2P9"]', code);
  await B.clickByText("Join");

  const aActive = await A.waitFor(`document.body.innerText.includes("ANALYZING") || document.body.innerText.includes("On call with")`, 30000, "A active");
  const bActive = await B.waitFor(`document.body.innerText.includes("YOUR VOICE IS BEING ANALYZED") || document.body.innerText.includes("On call with")`, 30000, "B active");
  check("A reached active call state", aActive === true);
  check("B reached active call state", bActive === true);

  // The creator's dashboard must show it is analyzing the JOINED person's voice
  // (remote WebRTC stream), not its own mic.
  const aAnalyzingPeer = await A.waitFor(`document.body.innerText.includes("ANALYZING JOINER BOB'S VOICE")`, 15000, "A analyzing peer voice");
  check("A dashboard analyzes the joined person's voice", aAnalyzingPeer === true);
  const bToldAnalyzed = await B.waitFor(`document.body.innerText.includes("YOUR VOICE IS BEING ANALYZED")`, 15000, "B told voice is analyzed");
  check("B is told its voice is being analyzed", bToldAnalyzed === true);

  // Creator auto-starts analysis of the joined person's voice → wait for ≥2 analyzed chunks
  console.log("Waiting for real analysis chunks (3s cadence)…");
  await A.waitFor(`document.querySelectorAll('tbody tr').length >= 2`, 60000, "≥2 chunk rows");
  const rows = await A.evalJs(`Array.from(document.querySelectorAll('tbody tr')).map(r => Array.from(r.cells).map(c => c.textContent.trim()))`);
  console.log("chunk rows:", JSON.stringify(rows.slice(0, 3)));
  const latestRow = rows[0];
  check("Risk value present in chunk table", latestRow?.[2] !== undefined && latestRow[2] !== "—", latestRow?.[2]);
  check("Spoof score populated (not —)", latestRow?.[3] !== "—", latestRow?.[3]);
  check("Acoustic anomaly populated", latestRow?.[4] !== "—", latestRow?.[4]);
  check("Human pattern populated", latestRow?.[5] !== "—", latestRow?.[5]);
  check("RMS populated", latestRow?.[6] !== "—", latestRow?.[6]);
  check("Spectral centroid populated", latestRow?.[7] !== "—", latestRow?.[7]);

  // Real waveform: bars should have varied heights (real amplitudes), not flat
  const waveHeights = await A.evalJs(`Array.from(document.querySelectorAll('.rounded-full')).map(b => b.style.height).filter(h => h).slice(0, 96)`);
  const distinct = new Set(waveHeights).size;
  check("Waveform has real varying amplitudes", distinct > 3, `${distinct} distinct heights`);

  // Mic mute on caller side
  await A.clickByText("Mute mic");
  const mutedUi = await A.waitFor(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === "Unmute mic")`, 10000, "Unmute button appears");
  check("Caller mic mute toggles UI", mutedUi === true);
  await A.clickByText("Unmute mic");
  const unmutedUi = await A.waitFor(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === "Mute mic")`, 10000, "Mute button back");
  check("Caller mic unmute toggles UI", unmutedUi === true);

  // Receiver side mute
  await B.waitFor(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === "Mute mic")`, 10000, "B mute button");
  await B.clickByText("Mute mic");
  const bMuted = await B.waitFor(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === "Unmute mic")`, 10000, "B unmute button");
  check("Receiver mic mute toggles UI", bMuted === true);

  // Audio flowing both ways — sample A over time to catch late track arrival
  console.log("Sampling audio state over 12s…");
  let aSamples = [];
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    const s = await A.evalJs(`(() => {
      const a = document.querySelector('audio');
      const t = a?.srcObject?.getAudioTracks?.()[0];
      const activeCard = document.body.innerText.includes("On call with");
      return { t: t ? { readyState: t.readyState, enabled: t.enabled } : null, activeCard };
    })()`);
    aSamples.push(s);
    if (s?.t?.readyState === "live") break;
  }
  console.log("A audio timeline:", JSON.stringify(aSamples));
  const aLive = aSamples.find((s) => s?.t?.readyState === "live");
  check("A receives remote audio (live)", Boolean(aLive), JSON.stringify(aLive?.t ?? aSamples[aSamples.length - 1]));

  const bAudio = await B.evalJs(`(() => { const a = document.querySelector('audio'); const t = a?.srcObject?.getAudioTracks?.()[0]; return t ? { readyState: t.readyState, enabled: t.enabled } : null; })()`);
  check("B receives remote audio (live)", bAudio?.readyState === "live", JSON.stringify(bAudio));
} catch (err) {
  console.log("ERROR:", err.message);
} finally {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  A.close();
  B.close();
  process.exit(failed > 0 ? 1 : 0);
}