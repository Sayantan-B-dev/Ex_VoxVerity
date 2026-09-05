"use client";

interface Adapter {
  adapter_id: string;
  source_type: string;
  status: string;
  created_at: number;
}

const adapterInfo: Record<string, { name: string; description: string; required: string[]; legal: string }> = {
  WEBRTC: {
    name: "WebRTC",
    description: "Browser-to-browser realtime audio via WebRTC. Currently active in demo mode.",
    required: ["Browser getUserMedia permission"],
    legal: "User must grant microphone permission",
  },
  MICROPHONE: {
    name: "Microphone",
    description: "Direct browser microphone capture for testing.",
    required: ["Browser getUserMedia permission"],
    legal: "User must grant microphone permission",
  },
  TELEPHONY: {
    name: "Telephony (PSTN/SIP)",
    description: "Direct telephony integration via Twilio Media Streams or SIP/PBX.",
    required: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "SIP_SERVER_URL"],
    legal: "Telecom regulations, consent requirements vary by jurisdiction",
  },
  SIP: {
    name: "SIP/PBX",
    description: "SIP protocol integration for enterprise phone systems.",
    required: ["SIP_SERVER_URL", "SIP_USERNAME", "SIP_PASSWORD"],
    legal: "SIP/PBX monitoring regulations",
  },
  TWILIO: {
    name: "Twilio Media Streams",
    description: "Twilio-specific integration for cloud telephony.",
    required: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
    legal: "Twilio Terms of Service, participant consent",
  },
  MEETING_PLATFORM: {
    name: "Meeting Platforms",
    description: "Integration with Zoom, Microsoft Teams, Google Meet.",
    required: ["PLATFORM_API_KEY"],
    legal: "Platform terms of service, participant consent",
  },
};

const statusColor: Record<string, string> = {
  CONNECTED: "var(--color-success)",
  STREAMING: "var(--color-success)",
  DISCONNECTED: "var(--color-text-muted)",
  UNSUPPORTED: "var(--color-warning)",
  ERROR: "var(--color-danger)",
};

export default function IntegrationsPage() {
  // Mock adapter data for demo
  const adapters: Adapter[] = [
    { adapter_id: "WEBRTC-001", source_type: "WEBRTC", status: "CONNECTED", created_at: Date.now() / 1000 - 7200 },
    { adapter_id: "TELEPHONY-001", source_type: "TELEPHONY", status: "UNSUPPORTED", created_at: Date.now() / 1000 - 7100 },
    { adapter_id: "SIP-001", source_type: "SIP", status: "UNSUPPORTED", created_at: Date.now() / 1000 - 7000 },
    { adapter_id: "TWILIO-001", source_type: "TWILIO", status: "UNSUPPORTED", created_at: Date.now() / 1000 - 6900 },
    { adapter_id: "MEETING-zoom", source_type: "MEETING_PLATFORM", status: "UNSUPPORTED", created_at: Date.now() / 1000 - 6800 },
    { adapter_id: "MEETING-teams", source_type: "MEETING_PLATFORM", status: "UNSUPPORTED", created_at: Date.now() / 1000 - 6700 },
    { adapter_id: "MEETING-meet", source_type: "MEETING_PLATFORM", status: "UNSUPPORTED", created_at: Date.now() / 1000 - 6600 },
  ];

  return (
    <div>
      <div className="page-header"><h1>Integrations</h1></div>

      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-6)", maxWidth: 640 }}>
        Configure audio source adapters and external providers. The core AI pipeline is
        source-agnostic — all adapters normalize audio to the same internal contract.
      </p>

      {/* Active Adapter */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-3)" }}>Active Source</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "var(--color-success)",
          }} />
          <div>
            <p style={{ fontWeight: "var(--weight-semibold)" }}>WebRTC (Browser Demo)</p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              Controlled browser-to-browser call for testing the analysis pipeline.
            </p>
          </div>
        </div>
      </div>

      {/* All Adapters */}
      <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-4)" }}>
        Available Adapters
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {adapters.map((adapter) => {
          const info = adapterInfo[adapter.source_type] || {
            name: adapter.source_type,
            description: "Audio source adapter",
            required: [],
            legal: "Review required",
          };

          return (
            <div key={adapter.adapter_id} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                <div style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: statusColor[adapter.status] || "var(--color-text-muted)",
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                    <span style={{ fontWeight: "var(--weight-semibold)" }}>{info.name}</span>
                    <span style={{
                      fontSize: "10px",
                      padding: "1px var(--space-2)",
                      borderRadius: "var(--radius-full)",
                      background: adapter.status === "CONNECTED" ? "var(--color-success-bg)" : "var(--color-bg-secondary)",
                      color: adapter.status === "CONNECTED" ? "var(--color-success)" : "var(--color-text-muted)",
                    }}>
                      {adapter.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
                    {info.description}
                  </p>
                  {info.required.length > 0 && (
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                      <strong>Required:</strong> {info.required.join(", ")}
                    </div>
                  )}
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                    <strong>Legal:</strong> {info.legal}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture Note */}
      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <h3 className="card-title" style={{ marginBottom: "var(--space-3)" }}>Source-Agnostic Architecture</h3>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p>All audio sources normalize to one internal contract:</p>
          <ul style={{ paddingLeft: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
            <li>16 kHz mono float32 PCM waveform</li>
            <li>~3 second chunks with sequence numbers</li>
            <li>ISO-8601 timestamps</li>
            <li>Session ID and source metadata</li>
          </ul>
          <p style={{ marginTop: "var(--space-2)", fontStyle: "italic" }}>
            The AI service does not care whether audio came from a browser WebRTC call,
            a telephony adapter, a file upload, or a future integration.
          </p>
        </div>
      </div>
    </div>
  );
}
