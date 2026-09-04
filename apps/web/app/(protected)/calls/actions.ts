"use server";

import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getCalls() {
  const session = await auth();
  if (!session?.user?.email) return [];

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("email", session.user.email).single();

  if (!profile?.organization_id) return [];

  const { data } = await supabase
    .from("calls")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("started_at", { ascending: false });

  return data ?? [];
}

export async function getCallById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("calls").select("*").eq("id", id).single();
  return data;
}

export async function createCall(source: string) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("id, organization_id").eq("email", session.user.email).single();

  if (!profile) throw new Error("Profile not found");

  const { data, error } = await supabase.from("calls").insert({
    organization_id: profile.organization_id,
    user_id: profile.id,
    source,
    status: "active",
  }).select().single();

  if (error) throw error;

  // Audit event
  await supabase.from("audit_events").insert({
    organization_id: profile.organization_id,
    user_id: profile.id,
    action: "call.created",
    resource_type: "call",
    resource_id: data.id,
  });

  revalidatePath("/calls");
  revalidatePath("/dashboard");
  return data;
}

export async function updateCallStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles").select("id, organization_id").eq("email", session.user.email).single();

  const updates: Record<string, unknown> = { status };
  if (status === "completed" || status === "failed") {
    updates.ended_at = new Date().toISOString();
  }

  const { error } = await supabase.from("calls").update(updates).eq("id", id);
  if (error) throw error;

  if (profile) {
    await supabase.from("audit_events").insert({
      organization_id: profile.organization_id,
      user_id: profile.id,
      action: "call.status_updated",
      resource_type: "call",
      resource_id: id,
      details: { status },
    });
  }

  revalidatePath("/calls");
  revalidatePath("/dashboard");
}
