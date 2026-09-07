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

export async function getIncidents() {
  try {
    const { supabase, orgId } = await orgContext();
    const { data } = await supabase
      .from("incidents")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getIncidentById(id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("incidents").select("*").eq("id", id).single();
  return data;
}

export async function updateIncidentStatus(id: string, status: string) {
  const { supabase, userId, orgId } = await orgContext();

  const { error } = await supabase.from("incidents").update({ status }).eq("id", id).eq("organization_id", orgId);
  if (error) throw error;

  await supabase.from("audit_events").insert({
    organization_id: orgId,
    action: "incident.status_updated",
    resource_type: "incident",
    resource_id: id,
    details: { status, app_user_id: userId },
  });

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
}

export async function createIncident(scope: string) {
  const { supabase, userId, orgId } = await orgContext();

  const { data, error } = await supabase.from("incidents").insert({
    organization_id: orgId,
    scope,
    status: "OPEN",
    owner_id: userId,
  }).select().single();

  if (error) throw error;

  await supabase.from("audit_events").insert({
    organization_id: orgId,
    action: "incident.created",
    resource_type: "incident",
    resource_id: data.id,
    details: { app_user_id: userId },
  });

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  return data;
}
