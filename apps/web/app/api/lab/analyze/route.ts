import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireOrg, audit } from "@/lib/api-auth";

/**
 * POST /api/lab/analyze — browser uploads WAV → proxied to AI service
 * (keeps AI_SERVICE_API_KEY server-side), then persists lab file + analysis row.
 */
export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!/wav/i.test(file.type) && !file.name.toLowerCase().endsWith(".wav")) {
    return NextResponse.json({ error: "Only WAV (PCM) files are supported." }, { status: 400 });
  }
  const base = (process.env.AI_SERVICE_URL ?? process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "").replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "AI service not configured" }, { status: 503 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const upstream = new FormData();
  upstream.append("file", new Blob([bytes as unknown as ArrayBuffer], { type: "audio/wav" }), file.name);
  const headers: Record<string, string> = {};
  if (process.env.AI_SERVICE_API_KEY) headers.Authorization = `Bearer ${process.env.AI_SERVICE_API_KEY}`;
  const res = await fetch(`${base}/v1/analyze/file`, { method: "POST", headers, body: upstream });
  if (!res.ok) return NextResponse.json({ error: `AI service HTTP ${res.status}` }, { status: 502 });
  const result = await res.json();

  // Persist lab file + analysis result for history pages.
  const { data: labFile } = await ctx.supabase
    .from("lab_audio_files")
    .insert({
      organization_id: ctx.orgId,
      app_user_id: ctx.userId,
      name: file.name,
      duration_sec: Math.round((result.dsp_metrics?.duration_s ?? 0) as number) || 0,
      sample_rate: 16000,
      channels: 1,
      size_kb: Math.round(bytes.length / 1024),
      analyzed: result.status === "analyzed",
    })
    .select("id")
    .single();

  let analysisId: string | null = null;
  if (result.status === "analyzed" && labFile) {
    const risk = result.risk ?? {};
    const analysis = result.analysis ?? {};
    const { data: row } = await ctx.supabase
      .from("analysis_results")
      .insert({
        organization_id: ctx.orgId,
        file_id: labFile.id,
        risk_score: risk.score ?? analysis.risk_score ?? 0,
        risk_severity: risk.severity ?? analysis.risk_severity ?? "LOW",
        spoof_score: result.spoof_detection?.score ?? result.spoof_detection?.bonafide_score ?? null,
        speaker_similarity: null,
        acoustic_anomaly: result.human_pattern?.acoustic_anomaly ?? null,
        prosody_anomaly: result.human_pattern?.prosody_anomaly ?? null,
        dsp_metrics: result.dsp_metrics ?? {},
        quality_flags: result.quality_flags ?? {},
        model_versions: { aasist_l: "v1.0", analyzed_at: new Date().toISOString() },
        notes: `Lab analysis of ${file.name}`,
      })
      .select("id")
      .single();
    analysisId = row?.id ?? null;
  }

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "lab.analyze", "analysis", analysisId, { filename: file.name });
  return NextResponse.json({ ok: true, result, labFileId: labFile?.id ?? null, analysisId });
}

/** GET /api/lab/analyze — recent lab history (files + analyses). */
export async function GET() {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const [files, analyses] = await Promise.all([
    ctx.supabase.from("lab_audio_files").select("*").eq("organization_id", ctx.orgId).order("uploaded_at", { ascending: false }).limit(30),
    ctx.supabase.from("analysis_results").select("*").eq("organization_id", ctx.orgId).order("created_at", { ascending: false }).limit(30),
  ]);
  return NextResponse.json({ files: files.data ?? [], analyses: analyses.data ?? [] });
}
