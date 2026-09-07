"use server";

import { auth } from "@/auth";
import { createServiceClient } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function orgContext() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) throw new Error("Unauthorized");
  const supabase = createServiceClient();
  const { data: user } = await supabase.from("app_users").select("id").eq("email", email).single();
  if (!user) throw new Error("Unknown user");
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membership?.organization_id) throw new Error("No organization");
  return { supabase, userId: user.id as string, orgId: membership.organization_id as string };
}

export async function getCalls() {
  try {
    const { supabase, orgId } = await orgContext();
    const { data } = await supabase
      .from("calls")
      .select("*")
      .eq("organization_id", orgId)
      .order("started_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getCallById(id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("calls").select("*").eq("id", id).single();
  return data;
}

export async function createCall(source: string) {
  const { supabase, userId, orgId } = await orgContext();

  const { data, error } = await supabase.from("calls").insert({
    organization_id: orgId,
    user_id: userId,
    source,
    status: "active",
  }).select().single();

  if (error) throw error;

  await supabase.from("audit_events").insert({
    organization_id: orgId,
    action: "call.created",
    resource_type: "call",
    resource_id: data.id,
    details: { app_user_id: userId },
  });

  revalidatePath("/calls");
  revalidatePath("/dashboard");
  return data;
}

export async function updateCallStatus(id: string, status: string) {
  const { supabase, userId, orgId } = await orgContext();

  const updates: Record<string, unknown> = { status };
  if (status === "completed" || status === "failed") {
    updates.ended_at = new Date().toISOString();
  }

  const { error } = await supabase.from("calls").update(updates).eq("id", id).eq("organization_id", orgId);
  if (error) throw error;

  await supabase.from("audit_events").insert({
    organization_id: orgId,
    action: "call.status_updated",
    resource_type: "call",
    resource_id: id,
    details: { status, app_user_id: userId },
  });

  revalidatePath("/calls");
  revalidatePath("/dashboard");
}
