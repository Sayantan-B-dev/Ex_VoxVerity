import Link from "next/link";
import { Card } from "@/components/primitives";

const topics = [
  {
    title: "How does VoxVerity detect cloned voices?",
    body: "VoxVerity analyzes authorized audio in ~3-second windows through DSP metrics, an anti-spoofing model (AASIST-L), and speaker-similarity checks (ECAPA-TDNN). A deterministic risk engine combines the signals into a 0–100 score with contributing factors.",
  },
  {
    title: "What does a risk score mean?",
    body: "Scores map to bands: LOW 0–25, MEDIUM 26–50, HIGH 51–75, CRITICAL 76–100. A score is a policy output driven by model signals - it is not a calibrated probability and never an absolute fraud verdict.",
  },
  {
    title: "What audio can VoxVerity capture?",
    body: "Only authorized audio through explicit browser permission: a controlled WebRTC call, an approved microphone source, or an explicitly permitted display capture. VoxVerity never claims universal call interception.",
  },
  {
    title: "How do I start a live session?",
    body: "Open the Live Monitor from the dashboard and grant microphone permission when prompted. Capture state is always visible: on, paused, denied, unsupported, or disconnected.",
  },
  {
    title: "What happens when risk crosses a threshold?",
    body: "An alert is created, a verification workflow can be triggered (trusted callback, org confirmation, or human review), and an incident can be opened. Evidence is hashed and may be registered on the Polygon Amoy testnet.",
  },
  {
    title: "Is my audio stored?",
    body: "Raw audio is processed in memory whenever possible and is never stored on-chain. Database records reference sessions and derived results, not raw audio. Retention is configurable in Settings.",
  },
];

export default function HelpPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Help Center</h1>
        <p className="text-[13px] text-text-secondary">
          Plain-language answers about how VoxVerity works.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {topics.map((t) => (
          <Card key={t.title} className="p-6">
            <h2 className="text-[15px] font-semibold">{t.title}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{t.body}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-[15px] font-semibold">Still stuck?</h2>
        <p className="mt-1.5 text-[13px] text-text-secondary">
          Head to the{" "}
          <Link href="/status" className="font-medium text-teal hover:underline">
            system status page
          </Link>{" "}
          or open the app and use the settings pages to tune detection behavior.
        </p>
      </Card>
    </div>
  );
}