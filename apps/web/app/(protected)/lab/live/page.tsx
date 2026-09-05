"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Role = "caller" | "receiver";
type CallState = "IDLE" | "JOINING" | "WAITING" | "CONNECTING" | "ACTIVE" | "ENDED" | "ERROR";

export default function LabLivePage() {
  const [role, setRole] = useState<Role | null>(null);
  const [callState, setCallState] = useState<CallState>("IDLE");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [remoteAudioActive, setRemoteAudioActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerIdRef = useRef(crypto.randomUUID());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Audio level monitoring for remote audio
  useEffect(() => {
    if (!remoteAudioActive) return;

    const analyser = analyserRef.current as AnalyserNode;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animFrame: number;

    function updateLevel() {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(avg / 255);
      animFrame = requestAnimationFrame(updateLevel);
    }

    updateLevel();
    return () => cancelAnimationFrame(animFrame);
  }, [remoteAudioActive]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "ice_candidate",
          candidate: event.candidate.toJSON(),
        }));
      }
    };

    pc.ontrack = (event) => {
      // Remote audio received
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(() => {});

        // Setup audio context for visualization
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(event.streams[0]);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;

        setRemoteAudioActive(true);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setCallState("ACTIVE");
      } else if (state === "disconnected" || state === "failed") {
        setCallState("ENDED");
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      return stream;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone access denied");
      return null;
    }
  }, []);

  const joinRoom = useCallback(async (selectedRole: Role) => {
    const id = roomId.trim() || `demo-${Math.random().toString(36).slice(2, 8)}`;
    setRoomId(id);
    setRole(selectedRole);
    setCallState("JOINING");
    setError("");

    // Connect signaling WebSocket
    const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
    const wsUrl = aiUrl.replace("http", "ws") + `/v1/webrtc/${id}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        role: selectedRole,
        peer_id: peerIdRef.current,
      }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "joined":
          setCallState("WAITING");
          break;

        case "peer_joined":
          // Peer joined, start WebRTC connection
          if (selectedRole === "caller") {
            await startCallAsCaller();
          }
          break;

        case "offer":
          if (selectedRole === "receiver") {
            await handleOffer(data.sdp);
          }
          break;

        case "answer":
          if (selectedRole === "caller") {
            await handleAnswer(data.sdp);
          }
          break;

        case "ice_candidate":
          if (peerConnectionRef.current && data.candidate) {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          }
          break;

        case "error":
          setError(data.message);
          setCallState("ERROR");
          break;
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection failed");
      setCallState("ERROR");
    };

    ws.onclose = () => {
      if (callState !== "ACTIVE") {
        setCallState("ENDED");
      }
    };
  }, [roomId, callState]);

  const startCallAsCaller = useCallback(async () => {
    const stream = await getLocalStream();
    if (!stream) return;

    setCallState("CONNECTING");
    const pc = createPeerConnection();

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "offer",
        sdp: offer.sdp,
      }));
    }
  }, [getLocalStream, createPeerConnection]);

  const handleOffer = useCallback(async (sdp: string) => {
    setCallState("CONNECTING");
    const pc = createPeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));

    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: "answer",
        sdp: answer.sdp,
      }));
    }
  }, [createPeerConnection]);

  const handleAnswer = useCallback(async (sdp: string) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp })
      );
    }
  }, []);

  const endCall = useCallback(() => {
    // Cleanup
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setCallState("IDLE");
    setRole(null);
    setRemoteAudioActive(false);
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => endCall();
  }, []);

  return (
    <div>
      <div className="page-header"><h1>WebRTC Demo Call</h1></div>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", maxWidth: 640 }}>
        Controlled browser-to-browser WebRTC call for testing the realtime analysis pipeline.
        Use two browser tabs or two devices — one as Caller, one as Receiver.
      </p>

      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />

      {/* Role Selection */}
      {callState === "IDLE" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Join Demo Call</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", marginBottom: "var(--space-1)" }}>
                Room ID (leave blank for random)
              </label>
              <input
                type="text"
                className="input"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g., demo-room-123"
              />
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button className="btn btn-primary" onClick={() => joinRoom("caller")} style={{ flex: 1 }}>
                Join as Caller (send audio)
              </button>
              <button className="btn btn-secondary" onClick={() => joinRoom("receiver")} style={{ flex: 1 }}>
                Join as Receiver (hear & analyze)
              </button>
            </div>
          </div>

          <div style={{ marginTop: "var(--space-4)", padding: "var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)" }}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              <strong>Caller:</strong> Speaks into microphone, sends audio to Receiver.<br />
              <strong>Receiver:</strong> Hears Caller and analyzes the remote audio stream in realtime.
            </p>
          </div>
        </div>
      )}

      {/* Waiting for peer */}
      {callState === "WAITING" && (
        <div className="card">
          <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
            <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-2)" }}>
              Waiting for peer...
            </div>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
              Room: <strong>{roomId}</strong> · Role: <strong>{role}</strong>
            </p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
              Open this page in another tab/device and join as the {role === "caller" ? "Receiver" : "Caller"} with the same Room ID.
            </p>
            <button className="btn btn-secondary" onClick={endCall} style={{ marginTop: "var(--space-4)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Call */}
      {callState === "ACTIVE" && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "var(--color-success)",
              animation: "pulse 2s infinite",
            }} />
            <div>
              <p style={{ fontWeight: "var(--weight-semibold)" }}>Call Active</p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                Room: {roomId} · Role: {role}
              </p>
            </div>
          </div>

          {role === "receiver" && remoteAudioActive && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
                Remote Audio Level
              </p>
              <div style={{
                height: "8px",
                background: "var(--color-bg-secondary)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${audioLevel * 100}%`,
                  background: audioLevel > 0.8 ? "var(--color-danger)" : audioLevel > 0.5 ? "var(--color-warning)" : "var(--color-success)",
                  transition: "width 0.1s",
                }} />
              </div>
            </div>
          )}

          {role === "caller" && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginTop: "var(--space-3)" }}>
              Your microphone is live. Speak into it — the Receiver will hear and analyze your audio.
            </p>
          )}

          <button className="btn btn-danger" onClick={endCall} style={{ marginTop: "var(--space-4)" }}>
            End Call
          </button>
        </div>
      )}

      {/* Connecting */}
      {(callState === "JOINING" || callState === "CONNECTING") && (
        <div className="card">
          <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
            <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" }}>
              {callState === "JOINING" ? "Joining room..." : "Connecting to peer..."}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {callState === "ERROR" && (
        <div className="card">
          <div className="alert alert-danger">
            {error || "An error occurred"}
          </div>
          <button className="btn btn-secondary" onClick={endCall} style={{ marginTop: "var(--space-3)" }}>
            Try Again
          </button>
        </div>
      )}

      {error && callState !== "ERROR" && (
        <div className="alert alert-danger" style={{ marginTop: "var(--space-4)" }}>{error}</div>
      )}

      {/* Instructions */}
      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-3)" }}>How to Test</h3>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p><strong>1.</strong> Open this page in two browser tabs (or two devices)</p>
          <p><strong>2.</strong> Tab 1: Enter a Room ID and click "Join as Caller"</p>
          <p><strong>3.</strong> Tab 2: Enter the same Room ID and click "Join as Receiver"</p>
          <p><strong>4.</strong> The Caller speaks — the Receiver hears and analyzes the audio</p>
          <p><strong>5.</strong> Both tabs can end the call independently</p>
        </div>
      </div>
    </div>
  );
}
