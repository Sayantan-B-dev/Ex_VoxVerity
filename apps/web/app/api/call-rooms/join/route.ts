import { NextResponse } from "next/server";
import { requireOrg, audit } from "@/lib/api-auth";

/**
 * POST /api/call-rooms/join — join a room with its 6-character code.
 *   Body: { room_code }
 *   Returns { call_id, room_code, creator_name } for an active room.
 *   The code is the access control: any signed-in user with a valid code can
 *   join, across organizations.
 */
export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => ({}));
  const room_code = ((body.room_code as string) ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(room_code)) {
    return NextResponse.json({ error: "Enter a valid 6-character room code." }, { status: 400 });
  }

  const { data: call } = await ctx.supabase
    .from("calls")
    .select("id, room_code, caller_display")
    .eq("room_code", room_code)
    .eq("status", "active")
    .maybeSingle();

  if (!call) {
    return NextResponse.json({ error: "Room not found or already ended." }, { status: 404 });
  }

  await audit(ctx.supabase, ctx.orgId, ctx.userId, "call.room_joined", "call", call.id, { room_code });
  return NextResponse.json({
    ok: true,
    call_id: call.id,
    room_code: call.room_code,
    creator_name: call.caller_display,
  });
}