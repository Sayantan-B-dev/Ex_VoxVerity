import Link from "next/link";
import { FlaskConical, Upload, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { analysisResults, labAudioFiles } from "@/lib/demo-data";
import { riskBand, bandTag, timeAgo } from "@/lib/format";

const columns: Column<(typeof analysisResults)[number]>[] = [
  {
    key: "id",
    header: "Analysis",
    render: (r) => <span className="font-mono text-teal">{r.id}</span>,
  },
  {
    key: "file",
    header: "Source",
    render: (r) => {
      const file = labAudioFiles.find((f) => f.id === r.fileId);
      return (
        <div>
          <p className="font-medium text-text-primary">{file?.name ?? r.sessionId ?? "—"}</p>
          <p className="text-[11px] text-text-disabled">{timeAgo(r.createdAt)}</p>
        </div>
      );
    },
  },
  {
    key: "synthetic",
    header: "Synthetic Signal",
    render: (r) => (
      <span className={r.syntheticScore >= 50 ? "font-semibold text-critical" : "font-semibold text-teal"}>
        {r.syntheticScore}%
      </span>
    ),
  },
  {
    key: "speaker",
    header: "Speaker Sim",
    render: (r) => <span className="text-text-secondary">{r.speakerSimilarity}%</span>,
  },
  {
    key: "risk",
    header: "Risk",
    render: (r) => (
      <span className="flex items-center gap-2">
        <span className="font-mono font-semibold text-text-primary">{r.risk}</span>
        <Tag level={bandTag(riskBand(r.risk))}>{bandTag(riskBand(r.risk))}</Tag>
      </span>
    ),
  },
  {
    key: "open",
    header: "",
    render: (r) => (
      <Link href={`/analysis/${r.id}`} className="inline-flex items-center text-teal hover:underline">
        Open <ChevronRight className="size-3.5" />
      </Link>
    ),
  },
];

export default function AnalysisPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Analysis"
        title="Analysis Results"
        subtitle="Deterministic DSP + model analysis of audio files and sessions."
        actions={
          <Link
            href="/lab/audio"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-4 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25"
          >
            <Upload className="size-4" /> Analyze Audio
          </Link>
        }
      />

      <Card className="p-6">
        <DataTable columns={columns} rows={analysisResults} />
      </Card>

      <Card className="flex items-start gap-3 border-teal/30 bg-teal/10 p-4">
        <FlaskConical className="size-5 shrink-0 text-teal" />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          The Analysis Lab runs the same DSP and model pipeline as live monitoring on controlled
          audio files — useful for deterministic testing and SIH demonstration repeatability.
        </p>
      </Card>
    </div>
  );
}