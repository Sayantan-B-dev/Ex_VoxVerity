import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";

/** GET /api/calls — list org calls. POST — create call/session row. */
export async function GET() {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const { data, error } = await ctx.supabase
    .from("calls")
    .select("id, source, status, risk_score, risk_severity, alert_count, started_at, duration_ms, caller_display, phone_number, synthetic_label, speaker_similarity, outcome")
    .eq("organization_id", ctx.orgId)
    .order("started_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ calls: data });
}

export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const { data, error } = await ctx.supabase
    .from("calls")
    .insert({
      organization_id: ctx.orgId,
      user_id: ctx.userId,
      source: (body.source ?? "microphone").toLowerCase(),
      status: body.status ?? "active",
      caller_display: body.caller_display ?? body.caller ?? null,
      phone_number: body.phone_number ?? body.phone ?? null,
      risk_score: body.risk_score ?? 0,
      risk_severity: body.risk_severity ?? "LOW",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(ctx.supabase, ctx.orgId, ctx.userId, "session_started", "call", data.id, { source: body.source ?? "microphone" });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
