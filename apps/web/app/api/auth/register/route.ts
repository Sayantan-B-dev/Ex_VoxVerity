import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/db";

/**
 * POST /api/auth/register - real registration (NextAuth DB-only).
 * Body: { email, password, name }. Creates app_users + profile + org membership.
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email ?? "").toLowerCase().trim();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from("app_users")
    .select("id")
    .eq("email", email)
    .single();
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const { data: user, error } = await supabase
    .from("app_users")
    .insert({ email, name, password_hash, role: "operator" })
    .select("id, email, name, role")
    .single();
  if (error || !user) {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }

  // Profile mirror
  const [first, ...rest] = name.split(" ");
  await supabase.from("profiles").insert({
    email,
    name,
    first_name: first,
    last_name: rest.join(" ") || null,
    role: "operator",
    app_user_id: user.id,
  });
  await supabase.from("notification_preferences").insert({ app_user_id: user.id });

  // Default org membership
  let { data: org } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (!org) {
    const { data: created } = await supabase
      .from("organizations")
      .insert({ name: "Acme Corp", plan: "free", status: "Active" })
      .select("id")
      .single();
    org = created;
  }
  if (org) {
    await supabase.from("organization_members").insert({
      organization_id: org.id,
      user_id: user.id,
      role: "operator",
    });
    await supabase.from("profiles").update({ organization_id: org.id }).eq("app_user_id", user.id);
    await supabase.from("login_history").insert({ app_user_id: user.id, email, outcome: "Success" });
  }

  return NextResponse.json({ ok: true, user: { id: user.id, email, name } }, { status: 201 });
}
