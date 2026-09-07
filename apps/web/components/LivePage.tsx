"use client";

import { useSession } from "next-auth/react";
import { Phone, Radio, Users } from "lucide-react";
import { Card } from "./primitives";
import LiveMonitoring from "./LiveMonitoring";
import { usePresence } from "@/lib/presence";

export default function LivePage() {
  const { data: session } = useSession();
  const { users, loading } = usePresence();
  const selfId = session?.user?.id;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-tight">
          <Radio className="size-6 text-teal" /> Live Monitor
        </h1>
        <p className="text-[13px] text-text-secondary">
          Who is online right now, and caller-voice integrity analysis in real time.
        </p>
      </div>

      {/* Who's online */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-teal" />
            <h2 className="text-[17px] font-semibold">Online now</h2>
            <span className="inline-flex items-center gap-1 rounded bg-neon/15 px-1.5 py-0.5 text-[10px] font-semibold text-neon">
              <span className="size-1.5 rounded-full bg-neon" style={{ animation: "pulse-ring 1.5s infinite" }} />
              {users.length} online
            </span>
          </div>
        </div>

        {loading ? (
          <p className="text-[12px] text-text-secondary">Checking presence…</p>
        ) : users.length === 0 ? (
          <p className="text-[12px] text-text-secondary">
            No one else is online right now. Presence updates every 15 seconds.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => {
              const isSelf = u.app_user_id === selfId;
              const initial = (u.name[0] ?? "?").toUpperCase();
              return (
                <div
                  key={u.app_user_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-elev p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative">
                      <div className="grid size-10 place-items-center rounded-full border border-teal/40 bg-teal/15 text-sm font-bold text-teal">
                        {initial}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${
                          u.status === "in_call" ? "bg-warn" : "bg-neon"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">
                        {u.name} {isSelf && <span className="text-[11px] font-normal text-text-disabled">(you)</span>}
                      </p>
                      <p className="truncate text-[11px] text-text-secondary">
                        {u.role} · {u.status === "in_call" ? "in a call" : "available"}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={isSelf || u.status === "in_call"}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-3 py-1.5 text-[12px] font-medium text-teal transition-colors hover:bg-teal/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Phone className="size-3.5" /> Call
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Caller-voice analysis (mic → 3s chunks → AI service) */}
      <LiveMonitoring />
    </div>
  );
}