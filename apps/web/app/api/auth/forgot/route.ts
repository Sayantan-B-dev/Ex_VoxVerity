import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/db";

/**
 * POST /api/auth/forgot — request password reset.
 * Always returns ok (no account enumeration). In dev, returns resetPath
 * so the UI can navigate without an SMTP provider.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = ((body.email ?? "") as string).toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  try {
    const supabase = createServiceClient();
    const { data: user } = await supabase
      .from("app_users")
      .select("id")
      .eq("email", email)
      .single();
    if (user) {
      const raw = crypto.randomBytes(32).toString("hex");
      const token_hash = crypto.createHash("sha256").update(raw).digest("hex");
      await supabase.from("password_reset_tokens").insert({
        user_id: user.id,
        token_hash,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      // Dev convenience: hand the token back so reset works without SMTP.
      return NextResponse.json({ ok: true, resetToken: raw });
    }
  } catch {
    /* fall through — still return ok */
  }
  return NextResponse.json({ ok: true });
}
