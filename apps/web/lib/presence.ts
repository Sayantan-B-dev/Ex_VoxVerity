"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface OnlineUser {
  app_user_id: string;
  status: "online" | "in_call";
  last_seen: string;
  name: string;
  email: string;
  role: string;
}

const HEARTBEAT_MS = 15_000;
const STALE_MS = 45_000;

function isStale(lastSeen: string | undefined): boolean {
  if (!lastSeen) return true;
  return Date.now() - new Date(lastSeen).getTime() > STALE_MS;
}

/**
 * Online presence for the signed-in user's org.
 * - Heartbeats POST /api/presence every 15s (server prunes stale rows).
 * - Subscribes to the `presence` table via Supabase Realtime and keeps the
 *   list in sync; rows with last_seen older than 45s are filtered client-side
 *   as a safety net.
 */
export function usePresence(selfUserId?: string) {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Heartbeat
  useEffect(() => {
    const beat = async () => {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch {
        /* server offline - presence list stays as-is */
      }
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    const bye = () => {
      fetch("/api/presence", { method: "DELETE", keepalive: true }).catch(() => undefined);
    };
    window.addEventListener("beforeunload", bye);
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeunload", bye);
      bye();
    };
  }, []);

  // Load + realtime
  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase
        .from("presence")
        .select("app_user_id, status, last_seen, app_users(id, name, email, role)")
        .order("last_seen", { ascending: false });
      const rows = (data ?? []) as Array<{
        app_user_id: string;
        status: string;
        last_seen: string;
        app_users: unknown;
      }>;
      const users = rows.flatMap((r) => {
        const au = (Array.isArray(r.app_users) ? r.app_users[0] : r.app_users) as
          | { id: string; name: string | null; email: string; role: string | null }
          | null
          | undefined;
        if (!au || isStale(r.last_seen)) return [];
        return [
          {
            app_user_id: r.app_user_id,
            status: r.status === "in_call" ? ("in_call" as const) : ("online" as const),
            last_seen: r.last_seen,
            name: au.name ?? au.email.split("@")[0],
            email: au.email,
            role: (au.role ?? "operator").toUpperCase(),
          },
        ];
      });
      setUsers(users);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("vox-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "presence" }, () => load())
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { users, loading };
}