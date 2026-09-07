import Link from "next/link";
import { FlaskConical, FileAudio, Radio, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/primitives";
import { labAudioFiles, analysisResults } from "@/lib/demo-data";

export default function LabPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Lab"
        title="Analysis Lab"
        subtitle="Controlled audio analysis for deterministic tests and repeatable demos."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Link href="/lab/audio" className="block">
          <Card className="flex items-center justify-between p-6 transition-colors hover:border-teal/40">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-xl border border-teal/30 bg-teal/10 text-teal">
                <FileAudio className="size-6" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold">Audio Lab</h2>
                <p className="mt-0.5 text-[13px] text-text-secondary">
                  {labAudioFiles.length} files · {analysisResults.length} analyzed
                </p>
              </div>
            </div>
            <ChevronRight className="size-5 text-text-disabled" />
          </Card>
        </Link>

        <Link href="/lab/live" className="block">
          <Card className="flex items-center justify-between p-6 transition-colors hover:border-teal/40">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-xl border border-teal/30 bg-teal/10 text-teal">
                <Radio className="size-6" />
              </div>
              <div>
                <h2 className="text-[17px] font-semibold">Live Scenario</h2>
                <p className="mt-0.5 text-[13px] text-text-secondary">
                  Controlled WebRTC demo call with real-time analysis
                </p>
              </div>
            </div>
            <ChevronRight className="size-5 text-text-disabled" />
          </Card>
        </Link>
      </div>

      <Card className="flex items-start gap-3 border-teal/30 bg-teal/10 p-4">
        <FlaskConical className="size-5 shrink-0 text-teal" />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          The lab runs the same DSP + model pipeline as live monitoring on controlled inputs, so
          evaluation is deterministic and repeatable — no live phone call required.
        </p>
      </Card>
    </div>
  );
}