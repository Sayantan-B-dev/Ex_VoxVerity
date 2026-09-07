import Link from "next/link";
import { FlaskConical, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { getAnalysisHistory } from "@/lib/data";
import { riskBand, bandTag, timeAgo } from "@/lib/format";

export default async function AnalysisPage() {
  const { results, files } = await getAnalysisHistory();
  const byId = new Map(files.map((f) => [f.id, f]));

  const columns: Column<(typeof results)[number]>[] = [
    {
      key: "id",
      header: "Analysis",
      render: (r) => <span className="font-mono text-teal">{r.id.slice(0, 8)}</span>,
    },
    {
      key: "file",
      header: "Source",
      render: (r) => {
        const file = r.fileId ? byId.get(r.fileId) : undefined;
        return (
          <div>
            <p className="font-medium text-text-primary">{file?.name ?? r.sessionId ?? "-"}</p>
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

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Analysis"
        title="Analysis Results"
        subtitle="Per-3s-chunk DSP + model analysis stored from live calls."
      />

      <Card className="p-6">
        <DataTable columns={columns} rows={results} />
      </Card>

      <Card className="flex items-start gap-3 border-teal/30 bg-teal/10 p-4">
        <FlaskConical className="size-5 shrink-0 text-teal" />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          Per-3s-chunk results from live calls are stored in the database and rendered here.
        </p>
      </Card>
    </div>
  );
}
