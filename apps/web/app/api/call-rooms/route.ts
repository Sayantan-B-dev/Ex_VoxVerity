import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireOrg, audit } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/db";
import { finalizeCallEvidence } from "@/lib/evidence";

/**
 * POST /api/call-rooms - create a protected call room.
 *   Returns { call_id, room_code } - the creator shares the 6-char code;
 *   call_id (UUID) doubles as the WebRTC signaling room id.
 *
 * PATCH /api/call-rooms - end a call.
 *   Body: { call_id }  → marks the call completed + finalizes evidence
 *   (idempotent: only ends calls that are still active).
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function generateRoomCode(): string {
  const bytes = crypto.randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

async function reserveRoomCode(
  supabase: ReturnType<typeof createServiceClient>
): Promise<string | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase.from("calls").select("id").eq("room_code", code).maybeSingle();
    if (error) return null;
    if (!data) return code;
  }
  return null;
}

export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;

  const room_code = await reserveRoomCode(ctx.supabase);
  if (!room_code) {
    return NextResponse.json({ error: "Could not generate a room code. Try again." }, { status: 500 });
  }

  // Caller display name for the join screen.
  const { data: me } = await ctx.supabase
    .from("app_users")
    .select("name")
    .eq("id", ctx.userId)
    .single();

  const { data: call, error } = await ctx.supabase
    .from("calls")
    .insert({
      organization_id: ctx.orgId,
      user_id: ctx.userId,
      source: "webrtc",
      status: "active",
      room_code,
      caller_display: me?.name ?? ctx.email,
      risk_score: 0,
      risk_severity: "LOW",
    })
    .select("id, room_code")
    .single();

  if (error || !call) {
    return NextResponse.json({ error: "Could not create the room. Try again." }, { status: 500 });
  }

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "call.room_created", "call", call.id, { room_code });
  return NextResponse.json({ ok: true, call_id: call.id, room_code: call.room_code }, { status: 201 });
}

export async function PATCH(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const callId = (body.call_id as string) ?? "";
  if (!callId) {
    return NextResponse.json({ error: "call_id required" }, { status: 400 });
  }

  const { data: call } = await ctx.supabase
    .from("calls")
    .select("id, status, organization_id")
    .eq("id", callId)
    .single();
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  // Idempotent: only the party that ends an active call triggers finalization.
  if (call.status === "active") {
    await ctx.supabase
      .from("calls")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", callId);
    await finalizeCallEvidence(ctx, callId);
  }

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "call.room_ended", "call", callId, {});
  return NextResponse.json({ ok: true });
}