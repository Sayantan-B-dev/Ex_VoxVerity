"use server";

import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getIncidents() {
  const session = await auth();
  if (!session?.user?.email) return [];

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("email", session.user.email).single();

  if (!profile?.organization_id) return [];

  const { data } = await supabase
    .from("incidents")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getIncidentById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("incidents").select("*").eq("id", id).single();
  return data;
}

export async function updateIncidentStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("id, organization_id").eq("email", session.user.email).single();

  if (!profile) throw new Error("Profile not found");

  const { error } = await supabase.from("incidents").update({ status }).eq("id", id);
  if (error) throw error;

  await supabase.from("audit_events").insert({
    organization_id: profile.organization_id,
    user_id: profile.id,
    action: "incident.status_updated",
    resource_type: "incident",
    resource_id: id,
    details: { status },
  });

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
}

export async function createIncident(scope: string) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("id, organization_id").eq("email", session.user.email).single();

  if (!profile) throw new Error("Profile not found");

  const { data, error } = await supabase.from("incidents").insert({
    organization_id: profile.organization_id,
    scope,
    status: "OPEN",
  }).select().single();

  if (error) throw error;

  await supabase.from("audit_events").insert({
    organization_id: profile.organization_id,
    user_id: profile.id,
    action: "incident.created",
    resource_type: "incident",
    resource_id: data.id,
  });

  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  return data;
}
