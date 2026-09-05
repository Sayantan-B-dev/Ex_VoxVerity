"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type CaptureState = "OFF" | "REQUESTING" | "ACTIVE" | "PAUSED" | "DENIED" | "UNSUPPORTED" | "ERROR";

interface DspMetrics {
  duration_s: number;
  rms_energy: number;
  dbfs: number;
  peak_amplitude: number;
  clipping_ratio: number;
  zero_crossing_rate: number;
  silence_ratio: number;
  spectral_centroid_hz: number;
  crest_factor: number;
  dynamic_range_db: number;
}

interface AnalysisChunk {
  sequence: number;
  timestamp: string;
  dsp_metrics?: DspMetrics;
  quality_flags?: Record<string, boolean>;
  human_pattern?: { score: number; label: string; description: string };
  spoof_detection?: { score: number; loaded: boolean; fallback: boolean; normalized_score?: number; severity?: string };
  risk?: { score: number; severity: string; recommendation: string; explanation: string; rule_triggers?: string[] };
}

interface RiskTrend {
  sequence: number;
  score: number;
  timestamp: number;
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
  const [riskTrend, setRiskTrend] = useState<RiskTrend[]>([]);
  const [latestDsp, setLatestDsp] = useState<DspMetrics | null>(null);
  const [latestQuality, setLatestQuality] = useState<Record<string, boolean>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sequenceRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);

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

      context.fillStyle = "#1a1a2e";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.lineWidth = 2;
      context.strokeStyle = "#6c63ff";
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

  // Frequency spectrum drawing
  useEffect(() => {
    if (captureState !== "ACTIVE") return;

    const analyser = analyserRef.current as AnalyserNode;
    const canvas = freqCanvasRef.current as HTMLCanvasElement;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    const context = ctx as CanvasRenderingContext2D;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animFrame: number;

    function draw() {
      analyser.getByteFrequencyData(dataArray);

      context.fillStyle = "#1a1a2e";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const hue = (i / bufferLength) * 120;
        context.fillStyle = `hsl(${hue + 200}, 70%, 60%)`;
        context.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
        if (x > canvas.width) break;
      }

      animFrame = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, [captureState]);

  // Risk trend chart drawing
  useEffect(() => {
    const canvas = document.getElementById("risk-trend-canvas") as HTMLCanvasElement | null;
    if (!canvas || riskTrend.length < 2) return;

    const ctx = canvas.getContext("2d");
    const context = ctx as CanvasRenderingContext2D;

    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    context.fillStyle = "#1a1a2e";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    context.strokeStyle = "#333";
    context.lineWidth = 0.5;
    for (let y = 0; y <= 100; y += 25) {
      const yPos = padding + height - (y / 100) * height;
      context.beginPath();
      context.moveTo(padding, yPos);
      context.lineTo(padding + width, yPos);
      context.stroke();

      context.fillStyle = "#666";
      context.font = "10px monospace";
      context.textAlign = "right";
      context.fillText(String(y), padding - 5, yPos + 3);
    }

    // Draw risk zones
    const zones = [
      { min: 0, max: 25, color: "rgba(34, 197, 94, 0.1)" },
      { min: 25, max: 50, color: "rgba(234, 179, 8, 0.1)" },
      { min: 50, max: 75, color: "rgba(239, 68, 68, 0.1)" },
      { min: 75, max: 100, color: "rgba(239, 68, 68, 0.2)" },
    ];

    for (const zone of zones) {
      const y1 = padding + height - (zone.max / 100) * height;
      const y2 = padding + height - (zone.min / 100) * height;
      context.fillStyle = zone.color;
      context.fillRect(padding, y1, width, y2 - y1);
    }

    // Draw trend line
    const recentTrend = riskTrend.slice(-30);
    context.beginPath();
    context.strokeStyle = "#6c63ff";
    context.lineWidth = 2;

    recentTrend.forEach((point, i) => {
      const x = padding + (i / (recentTrend.length - 1)) * width;
      const y = padding + height - (point.score / 100) * height;

      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });

    context.stroke();

    // Draw points
    recentTrend.forEach((point, i) => {
      const x = padding + (i / (recentTrend.length - 1)) * width;
      const y = padding + height - (point.score / 100) * height;

      context.beginPath();
      context.arc(x, y, 3, 0, Math.PI * 2);
      context.fillStyle = point.score <= 25 ? "#22c55e" : point.score <= 50 ? "#eab308" : "#ef4444";
      context.fill();
    });
  }, [riskTrend]);

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

    ws.onerror = () => {
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
          dsp_metrics: result.dsp_metrics as DspMetrics,
          quality_flags: result.quality_flags as Record<string, boolean>,
          human_pattern: result.human_pattern as AnalysisChunk["human_pattern"],
          spoof_detection: result.spoof_detection as AnalysisChunk["spoof_detection"],
          risk: result.risk as AnalysisChunk["risk"],
        };
        setRecentChunks((prev) => [chunk, ...prev].slice(0, 20));

        if (chunk.dsp_metrics) setLatestDsp(chunk.dsp_metrics);
        if (chunk.quality_flags) setLatestQuality(chunk.quality_flags);
        break;
      }
      case "risk_update": {
        const score = data.score as number;
        const severity = data.severity as string;
        setCurrentRisk({ score, severity });
        setRiskTrend((prev) => [...prev, {
          sequence: prev.length + 1,
          score,
          timestamp: Date.now(),
        }].slice(-60));
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

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      connectWebSocket();
      setCaptureState("ACTIVE");
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
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        const audioData = new Uint8Array(arrayBuffer);
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

  useEffect(() => {
    return () => { stopCapture(); };
  }, []);

  const riskColor = currentRisk
    ? currentRisk.score <= 25 ? "var(--color-success)"
    : currentRisk.score <= 50 ? "var(--color-warning)"
    : "var(--color-danger)"
    : "var(--color-text-muted)";

  const latestChunk = recentChunks[0];

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
          {captureState === "ACTIVE" && (
            <span style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--text-xs)",
              background: "var(--color-success-bg)",
              color: "var(--color-success)",
              border: "1px solid var(--color-success-border)",
            }}>
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Capture Controls + Audio Visualizations */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <div style={{ flex: 1 }}>
            <h3 className="card-title" style={{ marginBottom: "var(--space-2)" }}>Audio Capture</h3>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              State: <strong>{captureState}</strong>
              {captureState === "ACTIVE" && ` · Chunk #${sequenceRef.current} · 3s cadence`}
            </p>
          </div>
          <div>
            {captureState === "OFF" || captureState === "DENIED" || captureState === "ERROR" ? (
              <button className="btn btn-primary" onClick={startCapture}>Start Capture</button>
            ) : captureState === "ACTIVE" ? (
              <button className="btn btn-danger" onClick={stopCapture}>Stop Capture</button>
            ) : null}
          </div>
        </div>

        {error && <div className="alert alert-danger" style={{ marginTop: "var(--space-3)" }}>{error}</div>}

        {/* Audio Level + Waveform */}
        {captureState === "ACTIVE" && (
          <div style={{ marginTop: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Audio Level</span>
              <span style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                {(audioLevel * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: "6px",
              background: "var(--color-bg-secondary)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
              marginBottom: "var(--space-3)",
            }}>
              <div style={{
                height: "100%",
                width: `${audioLevel * 100}%`,
                background: audioLevel > 0.8 ? "var(--color-danger)" : audioLevel > 0.5 ? "var(--color-warning)" : "var(--color-success)",
                transition: "width 0.1s",
              }} />
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <div style={{ flex: 2 }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Waveform</p>
                <canvas ref={canvasRef} width={600} height={80} style={{ width: "100%", height: "80px", borderRadius: "var(--radius-sm)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Spectrum</p>
                <canvas ref={freqCanvasRef} width={300} height={80} style={{ width: "100%", height: "80px", borderRadius: "var(--radius-sm)" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Risk + DSP Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        {/* Risk Score */}
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Risk Score</p>
          <div style={{
            fontSize: "var(--text-3xl)",
            fontWeight: "var(--weight-bold)",
            fontFamily: "var(--font-mono)",
            color: riskColor,
          }}>
            {currentRisk ? `${currentRisk.score}/100` : "--"}
          </div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
            {currentRisk?.severity ?? "No data"}
          </p>
        </div>

        {/* Spoof Signal */}
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Spoof Signal</p>
          <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)" }}>
            {latestChunk?.spoof_detection ? latestChunk.spoof_detection.score.toFixed(3) : "--"}
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            {latestChunk?.spoof_detection?.loaded ? "Model" : "Fallback"}
          </p>
        </div>

        {/* Acoustic Dynamics */}
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Acoustic Dynamics</p>
          <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)" }}>
            {latestChunk?.human_pattern ? `${latestChunk.human_pattern.score}/100` : "--"}
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            {latestChunk?.human_pattern?.label?.replace(/_/g, " ") ?? "No data"}
          </p>
        </div>

        {/* Peak Level */}
        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Peak Level</p>
          <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)" }}>
            {latestDsp ? `${(latestDsp.peak_amplitude * 100).toFixed(0)}%` : "--"}
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            {latestDsp ? `${latestDsp.dbfs.toFixed(1)} dBFS` : "No data"}
          </p>
        </div>
      </div>

      {/* DSP Metric Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        {[
          { label: "RMS Energy", value: latestDsp?.rms_energy.toFixed(4), unit: "" },
          { label: "Crest Factor", value: latestDsp?.crest_factor.toFixed(2), unit: "x" },
          { label: "Dynamic Range", value: latestDsp?.dynamic_range_db.toFixed(1), unit: "dB" },
          { label: "Spectral Centroid", value: latestDsp?.spectral_centroid_hz.toFixed(0), unit: "Hz" },
          { label: "ZCR", value: latestDsp?.zero_crossing_rate.toFixed(4), unit: "" },
          { label: "Silence Ratio", value: latestDsp ? (latestDsp.silence_ratio * 100).toFixed(0) : undefined, unit: "%" },
          { label: "Clipping", value: latestDsp ? (latestDsp.clipping_ratio * 100).toFixed(1) : undefined, unit: "%" },
          { label: "Duration", value: latestDsp?.duration_s.toFixed(1), unit: "s" },
        ].map((item) => (
          <div key={item.label} style={{
            padding: "var(--space-3)",
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>{item.label}</p>
            <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", fontFamily: "var(--font-mono)" }}>
              {item.value ?? "--"}{item.value ? item.unit : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Quality Flags */}
      {Object.keys(latestQuality).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          {Object.entries(latestQuality).map(([key, val]) => (
            <span key={key} style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-medium)",
              background: val ? "var(--color-warning-bg)" : "var(--color-success-bg)",
              color: val ? "var(--color-warning)" : "var(--color-success)",
              border: `1px solid ${val ? "var(--color-warning-border)" : "var(--color-success-border)"}`,
            }}>
              {key.replace(/_/g, " ")}: {val ? "YES" : "NO"}
            </span>
          ))}
        </div>
      )}

      {/* Risk Trend Chart */}
      {riskTrend.length >= 2 && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <h3 className="card-title" style={{ marginBottom: "var(--space-3)" }}>Risk Trend</h3>
          <canvas id="risk-trend-canvas" width={800} height={200} style={{ width: "100%", height: "200px", borderRadius: "var(--radius-sm)" }} />
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

      {/* Recent Chunks Timeline */}
      {recentChunks.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "var(--space-3)" }}>Chunk Timeline</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {recentChunks.map((chunk) => (
              <div key={chunk.sequence} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg-secondary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-sm)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ fontWeight: "var(--weight-semibold)", fontFamily: "var(--font-mono)" }}>
                    #{chunk.sequence}
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                    {new Date(chunk.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "var(--space-4)" }}>
                  {chunk.human_pattern && (
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      Acoustic: {chunk.human_pattern.score}
                    </span>
                  )}
                  {chunk.spoof_detection && (
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      Spoof: {chunk.spoof_detection.score.toFixed(2)}
                    </span>
                  )}
                  {chunk.risk && (
                    <span style={{
                      fontWeight: "var(--weight-semibold)",
                      color: chunk.risk.score <= 25 ? "var(--color-success)"
                        : chunk.risk.score <= 50 ? "var(--color-warning)"
                        : "var(--color-danger)",
                    }}>
                      Risk: {chunk.risk.score} ({chunk.risk.severity})
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
