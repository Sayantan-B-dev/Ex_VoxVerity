import Link from "next/link";
import { ArrowLeft, Radio, Mic } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/primitives";
import { liveSession } from "@/lib/demo-data";

export default function LiveLabPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/lab"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Lab
      </Link>

      <PageHeader
        crumb="Lab"
        title="Live Scenario"
        subtitle="Controlled WebRTC / microphone scenario for real-time analysis."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="grid size-16 place-items-center rounded-2xl border border-teal/30 bg-teal/10 text-teal">
            <Mic className="size-8" />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold">Microphone Scenario</h2>
            <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-text-secondary">
              Capture explicit microphone audio through the browser permission flow and analyze it
              in ~3-second windows.
            </p>
          </div>
          <Link
            href="/live"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-5 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25"
          >
            <Radio className="size-4" /> Open Live Monitor
          </Link>
          <p className="text-[11px] text-text-disabled">
            Capture state is always visible: on, paused, denied, unsupported, or disconnected.
          </p>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="grid size-16 place-items-center rounded-2xl border border-purple/30 bg-purple/10 text-purple">
            <Radio className="size-8" />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold">WebRTC Scenario</h2>
            <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-text-secondary">
              The application establishes a controlled browser-to-browser call and owns the media
              stream — the cleanest demo input path.
            </p>
          </div>
          <p className="text-[12px] text-text-secondary">
            Reference session: <span className="font-mono text-text-primary">{liveSession.number}</span> ·{" "}
            {liveSession.source}
          </p>
          <p className="text-[11px] text-text-disabled">
            WebRTC call setup is wired when connected to the AI service (migration Phase 10).
          </p>
        </Card>
      </div>
    </div>
  );
}