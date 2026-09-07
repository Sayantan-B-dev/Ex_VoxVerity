import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/db";

/** Resolve NextAuth session → { userId, email, orgId }. 401/403 on failure. */
export async function requireOrg() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as NextResponse };
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return { error: NextResponse.json({ error: "Database not configured" }, { status: 500 }) as NextResponse };
  }
  const { data: user } = await supabase.from("app_users").select("id").eq("email", email).single();
  if (!user) return { error: NextResponse.json({ error: "Unknown user" }, { status: 403 }) as NextResponse };
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membership?.organization_id) {
    return { error: NextResponse.json({ error: "No organization" }, { status: 403 }) as NextResponse };
  }
  return { supabase, userId: user.id as string, email, orgId: membership.organization_id as string };
}

export async function audit(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  userId: string,
  action: string,
  resource_type: string,
  resource_id: string | null,
  details: Record<string, unknown> = {}
) {
  try {
    await supabase.from("audit_events").insert({
      organization_id: orgId,
      user_id: null,
      action,
      resource_type,
      resource_id,
      details: { ...details, app_user_id: userId },
    });
  } catch {
    /* audit must not break the request */
  }
}
