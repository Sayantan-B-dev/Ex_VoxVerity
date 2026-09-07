import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";
import { evaluateRisk, type RiskResult, type RiskSignals } from "@/lib/risk-engine";

/**
 * POST /api/risk-events - server-side risk write-back for live calls.
 *   Body: { call_id, result }
 *   `result` is one AI-service per-chunk analysis (from the realtime WebSocket
 *   `analysis_complete` payload). This route:
 *     1. Recomputes the 0-100 risk score deterministically (TS risk engine).
 *     2. Persists the chunk as an `analysis_results` row (drives the dashboard
 *        live feed via Supabase Realtime).
 *     3. Rolls the risk into the `calls` row (latest + worst + alert count).
 *     4. Opens an alert when a chunk crosses HIGH/CRITICAL (one open alert per
 *        call per severity).
 */
export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const callId = body.call_id as string | undefined;
  const result = body.result as Record<string, unknown> | undefined;
  if (!callId || !result || typeof result !== "object") {
    return NextResponse.json({ error: "call_id and result required" }, { status: 400 });
  }

  // The call must belong to this org.
  const { data: call } = await ctx.supabase
    .from("calls")
    .select("id, organization_id, risk_score, risk_severity, alert_count, caller_display")
    .eq("id", callId)
    .eq("organization_id", ctx.orgId)
    .single();
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  // ── 1. Recompute risk from the AI service's per-signal fields ────────────
  const risk = result.risk as Partial<RiskResult> | undefined;
  const signals: RiskSignals = {
    no_speech: result.no_speech === true,
    spoof_detection: (result.spoof_detection as RiskSignals["spoof_detection"]) ?? {
      normalized_score: risk?.score !== undefined ? 100 - risk.score : undefined,
      fallback: true,
    },
    human_pattern: result.human_pattern as RiskSignals["human_pattern"],
    speaker_verification: result.speaker_verification as RiskSignals["speaker_verification"],
    dsp_metrics: result.dsp_metrics as Record<string, number> | undefined,
    quality_flags: (result.quality_flags ?? result.quality) as Record<string, boolean | number | string> | undefined,
  };
  const evaluated: RiskResult & { adjustments?: string[] } = evaluateRisk(signals);
  const score = evaluated.score;
  const severity = evaluated.severity;

  const sequence =
    typeof result.sequence === "number"
      ? result.sequence
      : ((result.chunk_sequence as number | undefined) ?? undefined);
  const dsp = (signals.dsp_metrics ?? {}) as Record<string, number>;
  const spoof = signals.spoof_detection;
  const spk = signals.speaker_verification;

  // ── 2. Persist the chunk ─────────────────────────────────────────────────
  const { data: analysis, error: insertErr } = await ctx.supabase
    .from("analysis_results")
    .insert({
      call_id: callId,
      organization_id: ctx.orgId,
      chunk_sequence: sequence,
      risk_score: score,
      risk_severity: severity,
      spoof_score: spoof?.normalized_score != null ? Number((spoof.normalized_score / 100).toFixed(4)) : null,
      speaker_similarity: spk?.similarity != null ? Number(spk.similarity.toFixed(4)) : null,
      acoustic_anomaly: dsp.acoustic_anomaly != null ? Number(dsp.acoustic_anomaly.toFixed(4)) : null,
      dsp_metrics: dsp,
      quality_flags: (signals.quality_flags ?? {}) as Record<string, unknown>,
      model_versions: evaluated.model_versions,
      notes: evaluated.explanation,
    })
    .select("id")
    .single();
  if (insertErr || !analysis) {
    return NextResponse.json({ error: "Could not persist chunk analysis" }, { status: 500 });
  }

  // ── 3. Roll risk into the call (latest + worst + alert count) ────────────
  const worst = Math.max(call.risk_score ?? 0, score);
  const worstSeverity = worst >= 76 ? "CRITICAL" : worst >= 51 ? "HIGH" : worst >= 26 ? "MEDIUM" : "LOW";
  const { error: callErr } = await ctx.supabase
    .from("calls")
    .update({
      risk_score: worst,
      risk_severity: worstSeverity,
      alert_count: (call.alert_count ?? 0) + (score >= 51 ? 1 : 0),
    })
    .eq("id", callId);
  if (callErr) {
    return NextResponse.json({ error: "Could not update call risk" }, { status: 500 });
  }

  // ── 4. Open an alert when a chunk crosses HIGH/CRITICAL ──────────────────
  if (score >= 51) {
    const { data: openAlert } = await ctx.supabase
      .from("alerts")
      .select("id")
      .eq("call_id", callId)
      .eq("severity", severity)
      .in("status", ["Investigating", "Open"])
      .limit(1)
      .maybeSingle();
    if (!openAlert) {
      const callerName = (result.caller_display as string | undefined) ?? call.caller_display ?? "caller";
      await ctx.supabase.from("alerts").insert({
        organization_id: ctx.orgId,
        call_id: callId,
        severity,
        message: `Live voice risk ${score}/100 (${severity}) on ${callerName}'s call`,
        trigger_rules: evaluated.rule_triggers,
        contributing_signals: evaluated.contributing_factors,
        recommended_action: evaluated.recommendation,
        threat_title: `${severity} Voice Fraud Risk`,
        caller_display: callerName,
        risk_score: score,
        status: "Investigating",
      });
    }
  }

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "risk.chunk_written", "call", callId, {
    chunk_sequence: sequence ?? null,
    risk_score: score,
    risk_severity: severity,
  });

  return NextResponse.json({ ok: true, risk: evaluated });
}