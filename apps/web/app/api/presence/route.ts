import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/api-auth";

/**
 * POST /api/presence — heartbeat: mark the signed-in user online for their org.
 *   Body (optional): { status: "online" | "in_call" }
 * DELETE /api/presence — sign out of presence (offline).
 * Stale rows (last_seen older than 45s) are pruned on each heartbeat so the
 * online list stays honest even if a tab is closed without a clean exit.
 */
export async function POST(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const status = body.status === "in_call" ? "in_call" : "online";

  await ctx.supabase
    .from("presence")
    .upsert(
      { organization_id: ctx.orgId, app_user_id: ctx.userId, status, last_seen: new Date().toISOString() },
      { onConflict: "organization_id,app_user_id" }
    );

  // Prune rows that went stale (heartbeat stop — tab closed, network lost).
  const staleBefore = new Date(Date.now() - 45_000).toISOString();
  await ctx.supabase.from("presence").delete().eq("organization_id", ctx.orgId).lt("last_seen", staleBefore);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  await ctx.supabase.from("presence").delete().eq("organization_id", ctx.orgId).eq("app_user_id", ctx.userId);
  return NextResponse.json({ ok: true });
}