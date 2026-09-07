"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Radio,
  Users,
  X,
} from "lucide-react";
import { Card } from "./primitives";
import LiveMonitoring from "./LiveMonitoring";
import { usePresence } from "@/lib/presence";
import { useCall } from "@/lib/call";
import { formatDuration } from "@/lib/format";

function useElapsed(active: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) {
      setS(0);
      return;
    }
    const id = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return s;
}

export default function LivePage() {
  const { data: session } = useSession();
  const selfId = session?.user?.id;
  const { users, loading } = usePresence(selfId);
  const selfName = session?.user?.name ?? session?.user?.email ?? "User";
  const call = useCall(selfId ? { id: selfId, name: selfName } : undefined);
  const audioRef = useRef<HTMLAudioElement>(null);
  const callIdRef = useRef<string | undefined>(undefined);
  callIdRef.current = call.callId;

  // Keep the hidden audio element bound to the remote (caller) stream — the
  // receiver hears the caller; the receiver's own mic is never analyzed.
  useEffect(() => {
    if (audioRef.current && call.remoteStream) audioRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  // Presence reflects call state so others see "in a call".
  useEffect(() => {
    if (!selfId) return;
    fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: call.status === "active" ? "in_call" : "online" }),
    }).catch(() => undefined);
  }, [selfId, call.status]);

  // Every analyzed 3s chunk from the CALLER's mic → server-side risk write-back
  // (persists chunk risk on the calls row + broadcasts the live feed event).
  const onChunk = (msg: Record<string, unknown>) => {
    const callId = callIdRef.current;
    if (!callId) return;
    void fetch("/api/risk-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_id: callId, result: msg }),
    }).catch(() => undefined);
  };

  const elapsed = useElapsed(call.status === "active");
  const busy = call.status !== "idle" && call.status !== "ended" && call.status !== "rejected" && call.status !== "failed";

  return (
    <div className="animate-fade-in space-y-6">
      {/* hidden audio element for the caller's voice on the receiver side */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-tight">
            <Radio className="size-6 text-teal" /> Live Monitor
          </h1>
          <p className="text-[13px] text-text-secondary">
            Who is online right now, and caller-voice integrity analysis in real time.
          </p>
        </div>
        {call.status === "active" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-neon/12 px-3 py-1.5 font-mono text-[12px] font-semibold text-neon">
            <span className="size-2 animate-pulse rounded-full bg-neon" />
            {call.isCaller ? "YOUR VOICE IS BEING ANALYZED" : `CALL WITH ${(call.peer?.name ?? "").toUpperCase()}`} · {formatDuration(elapsed)}
          </span>
        )}
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
            No one is online right now. Presence updates every 15 seconds.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => {
              const isSelf = u.app_user_id === selfId;
              const canCall = !isSelf && u.status === "online" && !busy;
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
                    disabled={!canCall}
                    onClick={() =>
                      call.call({ id: u.app_user_id, name: u.name, email: u.email })
                    }
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-3 py-1.5 text-[12px] font-medium text-teal transition-colors hover:bg-teal/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Phone className="size-3.5" />
                    {isSelf ? "You" : u.status === "in_call" ? "Busy" : busy ? "In call" : "Call"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Incoming call — ring, accept or decline */}
      {call.status === "incoming" && call.incoming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <Card className="w-full max-w-sm p-6 text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-teal/15 text-teal">
              <PhoneIncoming className="size-7" style={{ animation: "pulse-ring 1.2s infinite" }} />
            </div>
            <p className="text-[13px] uppercase tracking-wide text-text-secondary">Incoming call</p>
            <p className="mt-1 text-[22px] font-bold">{call.incoming.caller.name}</p>
            <p className="font-mono text-[12px] text-text-secondary">{call.incoming.caller.email}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={call.reject}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-critical/50 px-4 py-2.5 text-[13px] font-medium text-critical transition-colors hover:bg-critical/10"
              >
                <X className="size-4" /> Decline
              </button>
              <button
                onClick={call.accept}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.02]"
              >
                <Phone className="size-4" /> Accept
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Call status banners */}
      {(call.status === "calling" || call.status === "failed" || call.status === "ended" || call.status === "rejected") && (
        <Card className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            {call.status === "calling" ? (
              <Loader2 className="size-5 animate-spin text-teal" />
            ) : (
              <PhoneOff className="size-5 text-text-secondary" />
            )}
            <div>
              <p className="text-[14px] font-semibold">
                {call.status === "calling" && `Calling ${call.peer?.name ?? ""}…`}
                {call.status === "failed" && (call.error ?? "Call failed")}
                {call.status === "ended" && (call.error ?? "Call ended")}
                {call.status === "rejected" && (call.error ?? "Call declined")}
              </p>
              {call.status === "calling" && (
                <p className="text-[12px] text-text-secondary">Waiting for the other side to answer…</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {call.status === "calling" && (
              <button
                onClick={call.hangup}
                className="inline-flex items-center gap-2 rounded-lg border border-critical/50 px-4 py-2 text-[13px] font-medium text-critical transition-colors hover:bg-critical/10"
              >
                <PhoneOff className="size-4" /> Cancel
              </button>
            )}
            {(call.status === "ended" || call.status === "rejected" || call.status === "failed") && (
              <button
                onClick={call.reset}
                className="rounded-lg bg-teal px-4 py-2 text-[13px] font-semibold text-black transition-transform hover:scale-[1.02]"
              >
                Done
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Active call — hang up + analysis panel */}
      {call.status === "active" && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-teal/15 text-teal">
              <Phone className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">On call with {call.peer?.name ?? "peer"}</p>
              <p className="font-mono text-[12px] text-text-secondary">
                {call.isCaller ? "Your voice streams to the AI service in 3s chunks — the receiver's voice is not analyzed." : "Hearing the caller's voice — your microphone is only used for the call, never analyzed."}
              </p>
            </div>
          </div>
          <button
            onClick={call.hangup}
            className="inline-flex items-center gap-2 rounded-lg border border-critical/50 px-4 py-2 text-[13px] font-medium text-critical transition-colors hover:bg-critical/10"
          >
            <PhoneOff className="size-4" /> Hang up
          </button>
        </Card>
      )}

      {/* Caller-only analysis — only the caller's mic is chunked to the server */}
      {call.isCaller && call.status === "active" && (
        <LiveMonitoring autoStart onChunk={onChunk} />
      )}
    </div>
  );
}