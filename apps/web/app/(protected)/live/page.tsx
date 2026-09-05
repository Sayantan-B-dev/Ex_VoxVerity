"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type CaptureState = "OFF" | "REQUESTING" | "ACTIVE" | "PAUSED" | "DENIED" | "UNSUPPORTED" | "ERROR";

interface AnalysisChunk {
  sequence: number;
  timestamp: string;
  dsp_metrics?: Record<string, number>;
  quality_flags?: Record<string, boolean>;
  human_pattern?: { score: number; label: string; description: string };
  spoof_detection?: { score: number; loaded: boolean; fallback: boolean };
  risk?: { score: number; severity: string; recommendation: string; explanation: string };
}

export default function LivePage() {
  const [captureState, setCaptureState] = useState<CaptureState>("OFF");
  const [connected, setConnected] = useState(false);
  const [currentRisk, setCurrentRisk] = useState<{ score: number; severity: string } | null>(null);
  const [recentChunks, setRecentChunks] = useState<AnalysisChunk[]>([]);
  const [alerts, setAlerts] = useState<{ score: number; severity: string; sequence: number }[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sequenceRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio level monitoring
  useEffect(() => {
    if (captureState !== "ACTIVE") return;

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
  }, [captureState]);

  // Waveform drawing
  useEffect(() => {
    if (captureState !== "ACTIVE") return;

    const analyser = analyserRef.current as AnalyserNode;
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    const context = ctx as CanvasRenderingContext2D;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animFrame: number;

    function draw() {
      analyser.getByteTimeDomainData(dataArray);

      context.fillStyle = "var(--color-bg)";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.lineWidth = 2;
      context.strokeStyle = "var(--color-primary)";
      context.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);

        x += sliceWidth;
      }

      context.lineTo(canvas.width, canvas.height / 2);
      context.stroke();
      animFrame = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, [captureState]);

  const connectWebSocket = useCallback(() => {
    const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";
    const wsUrl = aiUrl.replace("http", "ws") + `/v1/realtime/${sessionId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "hello", session_id: sessionId }));
      ws.send(JSON.stringify({ type: "start_session", source: "microphone" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    };

    ws.onerror = (e) => {
      console.error("WebSocket error:", e);
      setError("WebSocket connection error");
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return ws;
  }, [sessionId]);

  function handleServerMessage(data: Record<string, unknown>) {
    switch (data.type) {
      case "analysis_complete": {
        const result = data.result as Record<string, unknown>;
        const chunk: AnalysisChunk = {
          sequence: result.sequence as number,
          timestamp: new Date().toISOString(),
          dsp_metrics: result.dsp_metrics as Record<string, number>,
          quality_flags: result.quality_flags as Record<string, boolean>,
          human_pattern: result.human_pattern as AnalysisChunk["human_pattern"],
          spoof_detection: result.spoof_detection as AnalysisChunk["spoof_detection"],
          risk: result.risk as AnalysisChunk["risk"],
        };
        setRecentChunks((prev) => [chunk, ...prev].slice(0, 20));
        break;
      }
      case "risk_update": {
        setCurrentRisk({
          score: data.score as number,
          severity: data.severity as string,
        });
        break;
      }
      case "alert_created": {
        const alert = data.alert as Record<string, unknown>;
        setAlerts((prev) => [{
          score: alert.score as number,
          severity: alert.severity as string,
          sequence: alert.sequence as number,
        }, ...prev].slice(0, 10));
        break;
      }
      case "server_error": {
        setError(data.message as string);
        break;
      }
    }
  }

  async function startCapture() {
    setCaptureState("REQUESTING");
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Create audio context for visualization and chunking
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Connect WebSocket
      connectWebSocket();

      setCaptureState("ACTIVE");

      // Start sending chunks every 3 seconds
      chunkIntervalRef.current = setInterval(() => sendAudioChunk(stream), 3000);

    } catch (e) {
      setCaptureState("DENIED");
      setError(e instanceof Error ? e.message : "Microphone access denied");
    }
  }

  async function sendAudioChunk(stream: MediaStream) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      // Record 3 seconds of audio
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        const audioData = new Uint8Array(arrayBuffer);

        // Convert to base64
        const base64 = btoa(String.fromCharCode(...audioData));

        sequenceRef.current += 1;

        ws.send(JSON.stringify({
          type: "audio_chunk",
          sequence: sequenceRef.current,
          captured_at: new Date().toISOString(),
          duration_ms: 3000,
          audio_b64: base64,
        }));

        audioContext.close();
      };

      recorder.start();
      setTimeout(() => recorder.stop(), 3000);

    } catch (e) {
      console.error("Failed to send audio chunk:", e);
    }
  }

  function stopCapture() {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "stop_session" }));
      wsRef.current.close();
      wsRef.current = null;
    }

    setCaptureState("OFF");
    setConnected(false);
    setAudioLevel(0);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, []);

  const riskColor = currentRisk
    ? currentRisk.score <= 25 ? "var(--color-success)"
    : currentRisk.score <= 50 ? "var(--color-warning)"
    : currentRisk.score <= 75 ? "var(--color-danger)"
    : "var(--color-danger)"
    : "var(--color-text-muted)";

  return (
    <div>
      <div className="page-header">
        <h1>Live Monitor</h1>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <span style={{
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "var(--radius-full)",
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-medium)",
            background: connected ? "var(--color-success-bg)" : "var(--color-bg-secondary)",
            color: connected ? "var(--color-success)" : "var(--color-text-muted)",
            border: `1px solid ${connected ? "var(--color-success-border)" : "var(--color-border)"}`,
          }}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Capture Controls */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <div style={{ flex: 1 }}>
            <h3 className="card-title" style={{ marginBottom: "var(--space-2)" }}>Audio Capture</h3>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              State: <strong>{captureState}</strong>
              {captureState === "ACTIVE" && " · Sending chunks every 3 seconds"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {captureState === "OFF" || captureState === "DENIED" || captureState === "ERROR" ? (
              <button className="btn btn-primary" onClick={startCapture}>
                Start Capture
              </button>
            ) : captureState === "ACTIVE" ? (
              <button className="btn btn-danger" onClick={stopCapture}>
                Stop Capture
              </button>
            ) : null}
          </div>
        </div>

        {error && <div className="alert alert-danger" style={{ marginTop: "var(--space-3)" }}>{error}</div>}

        {/* Audio Level Meter */}
        {captureState === "ACTIVE" && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
              Audio Level
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

        {/* Waveform Canvas */}
        {captureState === "ACTIVE" && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <canvas
              ref={canvasRef}
              width={800}
              height={100}
              style={{ width: "100%", height: "100px", borderRadius: "var(--radius-sm)" }}
            />
          </div>
        )}
      </div>

      {/* Current Risk */}
      {currentRisk && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{
              fontSize: "var(--text-4xl)",
              fontWeight: "var(--weight-bold)",
              fontFamily: "var(--font-mono)",
              color: riskColor,
            }}>
              {currentRisk.score}/100
            </div>
            <div>
              <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" }}>
                {currentRisk.severity}
              </p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                Current Risk Assessment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-3)" }}>Alerts</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {alerts.map((alert, i) => (
              <div key={i} className="alert alert-danger" style={{ padding: "var(--space-2) var(--space-3)" }}>
                <strong>Chunk #{alert.sequence}</strong> — Risk {alert.score}/100 ({alert.severity})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Chunks */}
      {recentChunks.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-3)" }}>Recent Analysis Chunks</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {recentChunks.map((chunk) => (
              <div key={chunk.sequence} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-2)",
                background: "var(--color-bg-secondary)",
                borderRadius: "var(--radius-sm)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)" }}>
                    #{chunk.sequence}
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                    {new Date(chunk.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "var(--text-sm)" }}>
                  {chunk.human_pattern && (
                    <span>Acoustic: {chunk.human_pattern.score}/100</span>
                  )}
                  {chunk.spoof_detection && (
                    <span>Spoof: {chunk.spoof_detection.score.toFixed(2)}</span>
                  )}
                  {chunk.risk && (
                    <span style={{
                      fontWeight: "var(--weight-semibold)",
                      color: chunk.risk.score <= 25 ? "var(--color-success)"
                        : chunk.risk.score <= 50 ? "var(--color-warning)"
                        : "var(--color-danger)",
                    }}>
                      Risk: {chunk.risk.score}/100 ({chunk.risk.severity})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
