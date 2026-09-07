"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileAudio, Upload, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { labAudioFiles, analysisResults } from "@/lib/demo-data";
import { formatDuration, timeAgo } from "@/lib/format";

const columns: Column<(typeof labAudioFiles)[number]>[] = [
  { key: "name", header: "File", render: (f) => <span className="font-medium text-text-primary">{f.name}</span> },
  { key: "meta", header: "Meta", render: (f) => <span className="font-mono text-[12px] text-text-secondary">{f.sampleRate} Hz · {f.channels}ch · {f.sizeKb} KB</span> },
  { key: "duration", header: "Duration", render: (f) => <span className="font-mono text-text-secondary">{formatDuration(f.durationSec)}</span> },
  { key: "uploaded", header: "Uploaded", render: (f) => <span className="text-text-secondary">{timeAgo(f.uploadedAt)}</span> },
  {
    key: "status",
    header: "Status",
    render: (f) => (
      <Tag level={f.analyzed ? "Low" : "Medium"}>{f.analyzed ? "Analyzed" : "Pending"}</Tag>
    ),
  },
  {
    key: "open",
    header: "",
    render: (f) => {
      const result = analysisResults.find((r) => r.fileId === f.id);
      return result ? (
        <Link href={`/analysis/${result.id}`} className="inline-flex items-center text-teal hover:underline">
          View result <ChevronRight className="size-3.5" />
        </Link>
      ) : (
        <button className="inline-flex items-center rounded-lg border border-teal/40 bg-teal/15 px-3 py-1.5 text-[12px] font-medium text-teal transition-colors hover:bg-teal/25">
          Analyze
        </button>
      );
    },
  },
];

export default function AudioLabPage() {
  const [fileName, setFileName] = useState<string | null>(null);

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
        title="Audio Lab"
        subtitle="Upload WAV audio to run the DSP + model pipeline deterministically."
      />

      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-elev/60 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-card text-teal">
            <Upload className="size-6" />
          </div>
          <div>
            <p className="text-[14px] font-semibold">
              {fileName ? `Selected: ${fileName}` : "Drop a WAV file here or browse"}
            </p>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              16 kHz mono recommended · analyzed in memory, not persisted by default
            </p>
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-5 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25">
            <Upload className="size-4" /> Browse files
            <input
              type="file"
              accept=".wav,audio/wav,audio/x-wav"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          <p className="text-[11px] text-text-disabled">
            Upload is wired to the file picker; analysis runs when connected to the AI service
            (migration Phase 10).
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileAudio className="size-5 text-teal" />
          <h2 className="text-[17px] font-semibold">Lab Files</h2>
        </div>
        <DataTable columns={columns} rows={labAudioFiles} />
      </Card>
    </div>
  );
}