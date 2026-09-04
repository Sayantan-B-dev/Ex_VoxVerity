export async function checkAIServiceHealth() {
  const url = process.env.AI_SERVICE_URL;
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
  const url = process.env.AI_SERVICE_URL;
  if (!url) return null;

  try {
    const res = await fetch(`${url}/version`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
