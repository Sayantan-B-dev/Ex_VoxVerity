"use server";

import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAlerts() {
  const session = await auth();
  if (!session?.user?.email) return [];

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("email", session.user.email).single();

  if (!profile?.organization_id) return [];

  const { data } = await supabase
    .from("alerts")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getAlertById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("alerts").select("*").eq("id", id).single();
  return data;
}

export async function acknowledgeAlert(id: string) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("id, organization_id").eq("email", session.user.email).single();

  if (!profile) throw new Error("Profile not found");

  const { error } = await supabase.from("alerts").update({
    acknowledged: true,
    acknowledged_by: profile.id,
    acknowledged_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw error;

  await supabase.from("audit_events").insert({
    organization_id: profile.organization_id,
    user_id: profile.id,
    action: "alert.acknowledged",
    resource_type: "alert",
    resource_id: id,
  });

  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function createIncidentFromAlert(alertId: string) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("id, organization_id").eq("email", session.user.email).single();

  if (!profile) throw new Error("Profile not found");

  // Get alert details
  const { data: alert } = await supabase.from("alerts").select("*").eq("id", alertId).single();
  if (!alert) throw new Error("Alert not found");

  // Create incident
  const { data: incident, error: incError } = await supabase.from("incidents").insert({
    organization_id: profile.organization_id,
    scope: alert.message,
    risk_score: 0,
    risk_severity: alert.severity,
    status: "OPEN",
  }).select().single();

  if (incError) throw incError;

  // Link alert to incident
  await supabase.from("alerts").update({ incident_id: incident.id }).eq("id", alertId);

  await supabase.from("audit_events").insert({
    organization_id: profile.organization_id,
    user_id: profile.id,
    action: "incident.created_from_alert",
    resource_type: "incident",
    resource_id: incident.id,
    details: { alert_id: alertId },
  });

  revalidatePath("/alerts");
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  return incident;
}
