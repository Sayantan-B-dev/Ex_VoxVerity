import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/db";

/**
 * POST /api/auth/reset — set new password with reset token.
 * Body: { token, password }.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = (body.token ?? "") as string;
  const password = (body.password ?? "") as string;
  if (!token || password.length < 8) {
    return NextResponse.json({ error: "Invalid token or password too short." }, { status: 400 });
  }
  const token_hash = crypto.createHash("sha256").update(token).digest("hex");
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }
  const { data: row } = await supabase
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", token_hash)
    .single();
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 });
  }
  const password_hash = await bcrypt.hash(password, 12);
  await supabase.from("app_users").update({ password_hash }).eq("id", row.user_id);
  await supabase.from("password_reset_tokens").update({ used_at: new Date().toISOString() }).eq("id", row.id);
  return NextResponse.json({ ok: true });
}
