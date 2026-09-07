"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CallPeer {
  id: string;
  name: string;
  email: string;
}

export interface IncomingInvite {
  id: string;
  room_id: string;
  call_id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  caller: CallPeer;
}

export type CallStatus = "idle" | "calling" | "incoming" | "active" | "ended" | "rejected" | "failed";

interface InviteRow {
  id: string;
  room_id: string;
  call_id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  caller?:
    | { id: string; name: string | null; email: string }
    | Array<{ id: string; name: string | null; email: string }>;
}

function signalingUrl(roomId: string): string {
  const http = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
  return `${http.replace(/^http/, "ws")}/v1/webrtc/${roomId}`;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function callerOf(row: InviteRow): CallPeer | null {
  const c = Array.isArray(row.caller) ? row.caller[0] : row.caller;
  if (!c) return null;
  return { id: c.id, name: c.name ?? c.email.split("@")[0], email: c.email };
}

/**
 * Browser-to-browser call state machine for the Live Monitor:
 *   idle → calling (caller) / incoming (receiver) → active → ended
 * Call invites travel through Supabase (call_invites + Realtime); the WebRTC
 * handshake (offer/answer/ICE + hangup) goes through the AI-service signaling
 * socket. Only the CALLER's microphone is ever sent for AI analysis — the
 * receiver's mic only feeds the peer call and is never chunked to the server.
 */
export function useCall(self: { id: string; name: string } | null | undefined) {
  const selfId = self?.id;
  const selfName = self?.name;

  const [status, setStatus] = useState<CallStatus>("idle");
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [roomId, setRoomId] = useState<string | undefined>();
  const [callId, setCallId] = useState<string | undefined>();
  const [incoming, setIncoming] = useState<IncomingInvite | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const statusRef = useRef<CallStatus>("idle");
  const isCallerRef = useRef(false);
  const inviteIdRef = useRef<string | null>(null);
  const ringTimerRef = useRef<number | null>(null);

  statusRef.current = status;
  isCallerRef.current = isCaller;

  const cleanup = useCallback(() => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    try {
      wsRef.current?.close();
    } catch {
      /* noop */
    }
    try {
      pcRef.current?.close();
    } catch {
      /* noop */
    }
    try {
      localRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* noop */
    }
    remoteRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current = null;
    pcRef.current = null;
    localRef.current = null;
    remoteRef.current = null;
    setRemoteStream(null);
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStatus("idle");
    setPeer(null);
    setIsCaller(false);
    setRoomId(undefined);
    setCallId(undefined);
    setIncoming(null);
    setError(null);
    inviteIdRef.current = null;
  }, [cleanup]);

  // ── Watch invites: incoming (callee) + outcome (caller) ───────────────────
  useEffect(() => {
    if (!selfId) return;
    const supabase = createClient();
    const loadRinging = async () => {
      const { data } = await supabase
        .from("call_invites")
        .select("id, room_id, call_id, caller_id, callee_id, status, caller:caller_id(id, name, email)")
        .eq("callee_id", selfId)
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1);
      const row = (data ?? [])[0] as InviteRow | undefined;
      if (row && statusRef.current === "idle") {
        const caller = callerOf(row);
        if (caller) {
          setIncoming({
            id: row.id,
            room_id: row.room_id,
            call_id: row.call_id,
            caller_id: row.caller_id,
            callee_id: row.callee_id,
            status: row.status,
            caller,
          });
        }
      }
    };
    loadRinging();

    const channel = supabase
      .channel("vox-call-invites")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_invites" }, (payload) => {
        const row = payload.new as InviteRow;
        if (row.callee_id === selfId && row.status === "ringing" && statusRef.current === "idle") {
          loadRinging();
        }
        // Caller side: my ringing invite was rejected/ended by the callee.
        if (row.caller_id === selfId && statusRef.current === "calling" && isCallerRef.current) {
          if (row.status === "rejected") {
            setError("Call declined");
            setStatus("rejected");
            cleanup();
          } else if (row.status === "ended") {
            setStatus("ended");
            cleanup();
          }
        }
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [selfId, cleanup]);

  // ── Signaling + WebRTC ────────────────────────────────────────────────────
  async function startRtc(role: "caller" | "receiver") {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate) wsRef.current?.send(JSON.stringify({ type: "ice_candidate", candidate: e.candidate.toJSON() }));
    };
    pc.ontrack = (e) => {
      if (!remoteRef.current) {
        remoteRef.current = new MediaStream();
        setRemoteStream(remoteRef.current);
      }
      remoteRef.current.addTrack(e.track);
    };
    const local = await navigator.mediaDevices.getUserMedia({ audio: true });
    localRef.current = local;
    local.getTracks().forEach((t) => pc.addTrack(t, local));
    if (role === "caller") {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsRef.current?.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
    }
    return pc;
  }

  async function handleOffer(sdp: string) {
    const pc = pcRef.current ?? (await startRtc("receiver"));
    await pc.setRemoteDescription({ type: "offer", sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    wsRef.current?.send(JSON.stringify({ type: "answer", sdp: answer.sdp }));
  }

  const openSignaling = useCallback(
    (room: string, role: "caller" | "receiver", other: CallPeer) => {
      const ws = new WebSocket(signalingUrl(room));
      wsRef.current = ws;
      void other;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", role, peer_id: selfId, peer_name: selfName ?? "User" }));
      };
      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        switch (msg.type) {
          case "peer_joined":
            setStatus("active");
            void startRtc(role);
            break;
          case "call_started":
            setStatus("active");
            void startRtc(role);
            break;
          case "offer":
            void handleOffer(msg.sdp as string);
            break;
          case "answer":
            void pcRef.current?.setRemoteDescription({ type: "answer", sdp: msg.sdp as string });
            break;
          case "ice_candidate":
            if (msg.candidate) {
              void pcRef.current?.addIceCandidate(msg.candidate as RTCIceCandidateInit).catch(() => undefined);
            }
            break;
          case "hangup":
          case "peer_left":
            setStatus("ended");
            cleanup();
            break;
          case "error":
            setError((msg.message as string) ?? "Call error");
            setStatus("failed");
            cleanup();
            break;
        }
      };
      ws.onerror = () => {
        setError("Signaling server unreachable — is the AI service running on :8000?");
        setStatus("failed");
        cleanup();
      };
      ws.onclose = () => {
        if (statusRef.current === "active" || statusRef.current === "calling") {
          setStatus("ended");
          cleanup();
        }
      };
    },
    [selfId, selfName, cleanup]
  );

  // ── Public actions ────────────────────────────────────────────────────────
  async function call(target: CallPeer) {
    if (!selfId) return;
    setError(null);
    try {
      const res = await fetch("/api/call-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callee_id: target.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.invite) throw new Error(data.error ?? "Could not start call");
      const inv = data.invite as InviteRow;
      inviteIdRef.current = inv.id;
      setPeer(target);
      setIsCaller(true);
      setRoomId(inv.room_id);
      setCallId(inv.call_id);
      setStatus("calling");
      openSignaling(inv.room_id, "caller", target);

      ringTimerRef.current = window.setTimeout(() => {
        if (statusRef.current === "calling") {
          setError("No answer");
          setStatus("ended");
          cleanup();
          void fetch("/api/call-invites", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invite_id: inviteIdRef.current, action: "end" }),
          });
        }
      }, 30_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start call");
      setStatus("failed");
    }
  }

  async function accept() {
    if (!incoming || !selfId) return;
    const inv = incoming;
    inviteIdRef.current = inv.id;
    const other: CallPeer = { id: inv.caller_id, name: inv.caller.name, email: inv.caller.email };
    setPeer(other);
    setIsCaller(false);
    setRoomId(inv.room_id);
    setCallId(inv.call_id);
    setIncoming(null);
    setStatus("calling"); // waiting for the caller's WebRTC offer
    void fetch("/api/call-invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inv.id, action: "accept" }),
    });
    openSignaling(inv.room_id, "receiver", other);
  }

  async function reject() {
    if (!incoming) return;
    void fetch("/api/call-invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: incoming.id, action: "reject" }),
    });
    setIncoming(null);
  }

  async function hangup() {
    try {
      wsRef.current?.send(JSON.stringify({ type: "hangup" }));
    } catch {
      /* noop */
    }
    if (inviteIdRef.current && (isCallerRef.current || statusRef.current === "active")) {
      void fetch("/api/call-invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteIdRef.current, action: "end" }),
      });
    }
    setStatus("ended");
    cleanup();
  }

  return {
    status,
    peer,
    isCaller,
    roomId,
    callId,
    incoming,
    remoteStream,
    error,
    call,
    accept,
    reject,
    hangup,
    reset,
  };
}