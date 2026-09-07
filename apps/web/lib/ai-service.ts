/* VoxVerity AI-service client (server + browser safe).
 * Server uses AI_SERVICE_URL; browser uses NEXT_PUBLIC_AI_SERVICE_URL.
 * All calls include AI_SERVICE_API_KEY as Bearer when set (server only).
 */

function baseUrlServer() {
  return (
    process.env.AI_SERVICE_URL ?? process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? ""
  ).replace(/\/$/, "");
}

export function aiServiceBrowserUrl() {
  return (process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const key = process.env.AI_SERVICE_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function getJson(path: string) {
  const base = baseUrlServer();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { ...authHeaders() },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function checkAIServiceHealth() {
  const url = process.env.AI_SERVICE_URL ?? process.env.NEXT_PUBLIC_AI_SERVICE_URL;
  if (!url) return { status: "not_configured" as const, message: "AI_SERVICE_URL not set" };

  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { status: "error" as const, message: `HTTP ${res.status}` };
    const data = await res.json();
    return { status: "online" as const, message: data.status };
  } catch (e) {
    return { status: "offline" as const, message: e instanceof Error ? e.message : "Connection failed" };
  }
}

export async function checkAIServiceVersion() {
  const url = process.env.AI_SERVICE_URL ?? process.env.NEXT_PUBLIC_AI_SERVICE_URL;
  if (!url) return null;

  try {
    const res = await fetch(`${url}/version`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getAiModels() {
  return getJson("/v1/models");
}

export async function getAiAnalyticsDashboard() {
  return getJson("/v1/analytics/dashboard");
}

export async function getAiAnalyticsTrends(hours = 24) {
  return getJson(`/v1/analytics/trends?hours=${hours}`);
}

export async function getAiAnalyticsSources() {
  return getJson("/v1/analytics/sources");
}

export async function getAiPerformance() {
  return getJson("/v1/performance");
}

export async function getAiLanguages() {
  return getJson("/v1/languages");
}

export async function getAiConfig() {
  return getJson("/v1/config");
}

// ── Realtime WebSocket protocol (browser) ─────────────────────────────
// Server: services/ai-service/app/realtime/routes.py + manager.py
// Messages out: {type:'hello'} {type:'start_session',source} {type:'audio_chunk',sequence,audio_b64,encoding}
// Messages in: hello ack, session_started, ack, analysis_complete (+risk), risk_update, alert_created, session_stopped

export interface RealtimeRisk {
  score: number;
  severity: string;
  factors?: unknown;
}

export interface RealtimeAnalysis {
  sequence: number;
  risk?: RealtimeRisk;
  dsp_metrics?: Record<string, number>;
  spoof_detection?: Record<string, unknown>;
  human_pattern?: Record<string, unknown>;
  source?: string;
}

export function aiRealtimeWsUrl(sessionId: string, token?: string): string {
  const http = aiServiceBrowserUrl();
  const ws = http.replace(/^http/, "ws");
  const base = `${ws}/v1/realtime/${sessionId}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export function floatToPcm16Base64(float32: Float32Array): string {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
