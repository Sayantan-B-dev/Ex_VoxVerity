import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireOrg, audit } from "@/lib/api-auth";
import {
  registerEvidenceOnChain,
  BLOCKCHAIN_NETWORK,
  BLOCKCHAIN_CHAIN_ID,
} from "@/lib/blockchain";

/**
 * POST /api/call-invites — caller rings a callee.
 *   Body: { callee_id }
 *   Creates the calls row (status=active, source=webrtc) + call_invites row
 *   (status=ringing) and returns the invite (room_id + call_id). The callee
 *   sees it via Supabase Realtime and accepts/rejects over the WebSocket.
 *
 * PATCH /api/call-invites — update invite state.
 *   Body: { invite_id, action: "accept" | "reject" | "end" }
 */
export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  if (!body.callee_id) return NextResponse.json({ error: "callee_id required" }, { status: 400 });

  // Callee must belong to the same org.
  const { data: membership } = await ctx.supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", ctx.orgId)
    .eq("user_id", body.callee_id)
    .single();
  if (!membership) return NextResponse.json({ error: "Callee not in your organization" }, { status: 400 });

  // Caller display name for the calls row.
  const { data: callerUser } = await ctx.supabase.from("app_users").select("name, email").eq("id", ctx.userId).single();

  const { default: crypto } = await import("crypto");
  const room_id = crypto.randomUUID();

  const { data: call, error: callErr } = await ctx.supabase
    .from("calls")
    .insert({
      organization_id: ctx.orgId,
      user_id: ctx.userId,
      source: "webrtc",
      status: "active",
      caller_display: callerUser?.name ?? ctx.email,
      risk_score: 0,
      risk_severity: "LOW",
    })
    .select("id")
    .single();
  if (callErr || !call) return NextResponse.json({ error: "Could not create call session" }, { status: 500 });

  const { data: invite, error } = await ctx.supabase
    .from("call_invites")
    .insert({
      organization_id: ctx.orgId,
      room_id,
      call_id: call.id,
      caller_id: ctx.userId,
      callee_id: body.callee_id,
      status: "ringing",
    })
    .select("*")
    .single();
  if (error || !invite) return NextResponse.json({ error: "Could not create invite" }, { status: 500 });

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "call.invite", "call", call.id, { callee_id: body.callee_id });
  return NextResponse.json({ ok: true, invite }, { status: 201 });
}

export async function PATCH(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  if (!body.invite_id || !["accept", "reject", "end"].includes(action)) {
    return NextResponse.json({ error: "invite_id and action (accept|reject|end) required" }, { status: 400 });
  }

  const { data: invite } = await ctx.supabase
    .from("call_invites")
    .select("id, organization_id, call_id")
    .eq("id", body.invite_id)
    .eq("organization_id", ctx.orgId)
    .single();
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  const status = action === "accept" ? "accepted" : action === "reject" ? "rejected" : "ended";
  const { error } = await ctx.supabase.from("call_invites").update({ status, updated_at: new Date().toISOString() }).eq("id", invite.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Auto-fingerprint: when the call ends, package evidence + register the
  // SHA-256 hash on-chain (fail-soft if the chain isn't configured).
  if (status === "ended") {
    await finalizeCallEvidence(ctx, invite.call_id);
  }

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "call.invite_update", "call", invite.call_id, { status });
  return NextResponse.json({ ok: true });
}

/** Narrowed requireOrg result (the success branch with supabase). */
type OrgCtx = Exclude<Awaited<ReturnType<typeof requireOrg>>, { error: NextResponse }>;

/** Close the call row and create its evidence fingerprint (hash + on-chain). */
async function finalizeCallEvidence(
  ctx: OrgCtx,
  callId: string
) {
  const { data: call } = await ctx.supabase
    .from("calls")
    .select("id, organization_id, risk_score, risk_severity, caller_display, started_at")
    .eq("id", callId)
    .single();
  if (!call) return;

  await ctx.supabase.from("calls").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", callId);

  const manifest = {
    call_id: call.id,
    risk_score: call.risk_score ?? 0,
    risk_severity: call.risk_severity ?? "LOW",
    created_by: ctx.email,
    created_at: new Date().toISOString(),
    model_versions: { risk_engine: "v1.0.0", aasist_l: "v1.0", ecapa_tdnn: "v1.0" },
  };
  const evidence_hash = crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
  const { data: evidence } = await ctx.supabase
    .from("evidence_records")
    .insert({
      organization_id: call.organization_id,
      call_id: call.id,
      manifest,
      evidence_hash,
      hash_algorithm: "SHA-256",
      blockchain_network: BLOCKCHAIN_NETWORK,
      caller_display: call.caller_display ?? null,
    })
    .select("id, evidence_hash")
    .single();
  if (!evidence) return;

  const chain = await registerEvidenceOnChain(evidence.evidence_hash, evidence.id, new Date());
  const chainStatus = chain.ok ? "confirmed" : chain.status;
  if (chain.ok) {
    await ctx.supabase.from("blockchain_registrations").insert({
      organization_id: call.organization_id,
      evidence_id: evidence.id,
      network: BLOCKCHAIN_NETWORK,
      chain_id: BLOCKCHAIN_CHAIN_ID,
      contract_address: chain.contract_address,
      tx_hash: chain.tx_hash,
      block_number: chain.block_number ?? null,
      status: "confirmed",
    });
    await ctx.supabase.from("evidence_records").update({ blockchain_tx: chain.tx_hash, verified: true }).eq("id", evidence.id);
  } else {
    await ctx.supabase.from("blockchain_registrations").insert({
      organization_id: call.organization_id,
      evidence_id: evidence.id,
      network: BLOCKCHAIN_NETWORK,
      chain_id: BLOCKCHAIN_CHAIN_ID,
      status: chain.status,
    });
  }

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "evidence.auto_register", "call", call.id, {
    evidence_id: evidence.id,
    blockchain: chainStatus,
  });
}