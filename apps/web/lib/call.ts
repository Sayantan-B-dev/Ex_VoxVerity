"use client";

import { useCallback, useRef, useState } from "react";

export interface CallPeer {
  id: string;
  name: string;
  email: string;
}

export type CallStatus = "idle" | "calling" | "active" | "ended" | "failed";

interface CallStartedPeer {
  id?: string;
  name?: string;
}

function signalingUrl(roomId: string, token?: string): string {
  const http = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
  const base = `${http.replace(/^http/, "ws")}/v1/webrtc/${roomId}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/**
 * Browser-to-browser call state machine for the Live Monitor, room-code model:
 *
 *   idle → createRoom()/joinRoom(code) → calling (waiting for peer)
 *        → active (WebRTC established) → ended
 *
 * The room code is the access control — the code lives on the calls row and
 * call.id (a UUID) is the WebRTC signaling room id, so both parties reach the
 * same signaling room. Both mics feed the peer call. The CREATOR (caller) has
 * the dashboard, and it analyzes the JOINED person's voice — the joined
 * person's audio arrives at the creator as the remote WebRTC stream, which the
 * dashboard chunks to the AI service. The creator's own mic is never analyzed.
 */
export function useCall(self: { id: string; name: string } | null | undefined) {
  const selfId = self?.id;
  const selfName = self?.name;

  const [status, setStatus] = useState<CallStatus>("idle");
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [roomCode, setRoomCode] = useState<string | undefined>();
  const [callId, setCallId] = useState<string | undefined>();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const statusRef = useRef<CallStatus>("idle");
  const isCallerRef = useRef(false);
  const callIdRef = useRef<string | undefined>(undefined);
  const mutedRef = useRef(false);

  statusRef.current = status;
  isCallerRef.current = isCaller;
  callIdRef.current = callId;

  const cleanup = useCallback(() => {
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
    setRoomCode(undefined);
    setCallId(undefined);
    setMuted(false);
    mutedRef.current = false;
    setError(null);
  }, [cleanup]);

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
    async (room: string, role: "caller" | "receiver") => {
      // Fetch a short-lived WS auth token from the Next.js server.
      let wsToken = "";
      try {
        const tokRes = await fetch("/api/ws-token", { method: "POST" });
        if (tokRes.ok) {
          const tokData = await tokRes.json();
          wsToken = tokData.token ?? "";
        }
      } catch {
        // Token fetch failed — connect without token (dev mode fallback).
      }
      const ws = new WebSocket(signalingUrl(room, wsToken));
      wsRef.current = ws;

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
          case "call_started": {
            const p = msg.peer as CallStartedPeer | undefined;
            if (p?.name) {
              setPeer((cur) => cur ?? { id: p.id ?? "", name: p.name ?? "", email: "" });
            }
            setStatus("active");
            void startRtc(role);
            break;
          }
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
  /** Creator: spin up a room and get the shareable 6-char code. */
  async function createRoom(): Promise<string | null> {
    if (!selfId) return null;
    setError(null);
    try {
      const res = await fetch("/api/call-rooms", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.call_id || !data.room_code) {
        throw new Error(data.error ?? "Could not create a room");
      }
      setCallId(data.call_id as string);
      setRoomCode(data.room_code as string);
      setIsCaller(true);
      setStatus("calling");
      void openSignaling(data.call_id as string, "caller");
      return data.room_code as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a room");
      setStatus("failed");
      return null;
    }
  }

  /** Joiner: resolve a 6-char code to the room and connect as receiver. */
  async function joinRoom(code: string): Promise<boolean> {
    if (!selfId) return false;
    setError(null);
    const normalized = code.trim().toUpperCase();
    try {
      const res = await fetch("/api/call-rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_code: normalized }),
      });
      const data = await res.json();
      if (!res.ok || !data.call_id) {
        throw new Error(data.error ?? "Could not join the room");
      }
      setCallId(data.call_id as string);
      setRoomCode(data.room_code as string);
      setIsCaller(false);
      setPeer({
        id: "",
        name: (data.creator_name as string) ?? "Room creator",
        email: "",
      });
      setStatus("calling");
      void openSignaling(data.call_id as string, "receiver");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join the room");
      setStatus("failed");
      return false;
    }
  }

  /** Mute/unmute your own microphone for the peer (both caller and receiver). */
  function toggleMute(): boolean {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    try {
      localRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
    } catch {
      /* noop */
    }
    return next;
  }

  async function hangup() {
    try {
      wsRef.current?.send(JSON.stringify({ type: "hangup" }));
    } catch {
      /* noop */
    }
    if (callIdRef.current) {
      void fetch("/api/call-rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id: callIdRef.current }),
      });
    }
    setStatus("ended");
    cleanup();
  }

  return {
    status,
    peer,
    isCaller,
    roomCode,
    callId,
    remoteStream,
    error,
    createRoom,
    joinRoom,
    hangup,
    toggleMute,
    muted,
    reset,
  };
}