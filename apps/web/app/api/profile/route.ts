import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/api-auth";

/** GET /api/profile — app user + profile + prefs. PATCH — update profile/prefs. */
export async function GET() {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const [userRes, profileRes, prefsRes, sessionsRes, mfaRes] = await Promise.all([
    ctx.supabase.from("app_users").select("id, email, name, role, image, created_at").eq("id", ctx.userId).single(),
    ctx.supabase.from("profiles").select("*").eq("app_user_id", ctx.userId).single(),
    ctx.supabase.from("notification_preferences").select("*").eq("app_user_id", ctx.userId).limit(1).single(),
    ctx.supabase.from("user_sessions").select("id, device, browser, ip, location, last_seen").eq("app_user_id", ctx.userId).order("last_seen", { ascending: false }).limit(5),
    ctx.supabase.from("mfa_factors").select("method, enabled, enrolled_at").eq("app_user_id", ctx.userId).single(),
  ]);
  return NextResponse.json({
    user: userRes.data,
    profile: profileRes.data,
    preferences: prefsRes.data,
    sessions: sessionsRes.data ?? [],
    mfa: mfaRes.data ?? { enabled: false },
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireOrg();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  if (body.name !== undefined || body.image !== undefined) {
    await ctx.supabase.from("app_users").update({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.image !== undefined ? { image: body.image } : {}),
    }).eq("id", ctx.userId);
  }
  const profilePatch: Record<string, unknown> = {};
  for (const k of ["phone", "first_name", "last_name", "department", "job_title", "location", "avatar_url", "language", "timezone", "theme"]) {
    if (body[k] !== undefined) profilePatch[k] = body[k];
  }
  if (body.name && !body.first_name) {
    const [first, ...rest] = (body.name as string).split(" ");
    profilePatch.first_name = first;
    profilePatch.last_name = rest.join(" ") || null;
    profilePatch.name = body.name;
  }
  if (Object.keys(profilePatch).length) {
    await ctx.supabase.from("profiles").update(profilePatch).eq("app_user_id", ctx.userId);
  }
  if (body.preferences) {
    await ctx.supabase.from("notification_preferences").upsert({ app_user_id: ctx.userId, ...body.preferences }, { onConflict: "app_user_id,organization_id" });
  }
  return NextResponse.json({ ok: true });
}
