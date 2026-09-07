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

export async function getAlerts() {
  try {
    const { supabase, orgId } = await orgContext();
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getAlertById(id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("alerts").select("*").eq("id", id).single();
  return data;
}

export async function acknowledgeAlert(id: string) {
  const { supabase, userId, orgId } = await orgContext();

  const { error } = await supabase.from("alerts").update({
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
    status: "Acknowledged",
  }).eq("id", id).eq("organization_id", orgId);

  if (error) throw error;

  await supabase.from("audit_events").insert({
    organization_id: orgId,
    action: "alert.acknowledged",
    resource_type: "alert",
    resource_id: id,
    details: { app_user_id: userId },
  });

  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function createIncidentFromAlert(alertId: string) {
  const { supabase, userId, orgId } = await orgContext();

  const { data: alert } = await supabase.from("alerts").select("*").eq("id", alertId).eq("organization_id", orgId).single();
  if (!alert) throw new Error("Alert not found");

  const { data: incident, error: incError } = await supabase.from("incidents").insert({
    organization_id: orgId,
    scope: alert.message,
    risk_score: alert.risk_score ?? 0,
    risk_severity: alert.severity,
    status: "OPEN",
    owner_id: userId,
  }).select().single();

  if (incError) throw incError;

  await supabase.from("alerts").update({ incident_id: incident.id }).eq("id", alertId);

  await supabase.from("audit_events").insert({
    organization_id: orgId,
    action: "incident.created_from_alert",
    resource_type: "incident",
    resource_id: incident.id,
    details: { alert_id: alertId, app_user_id: userId },
  });

  revalidatePath("/alerts");
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  return incident;
}
