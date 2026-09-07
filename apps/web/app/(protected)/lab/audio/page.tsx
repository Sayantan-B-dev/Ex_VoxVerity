"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FileAudio, Upload, ChevronRight, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { formatDuration, timeAgo } from "@/lib/format";

interface LabFile {
  id: string;
  name: string;
  durationSec: number;
  sampleRate: number;
  channels: number;
  sizeKb: number;
  uploadedAt: string;
  analyzed: boolean;
}

interface AnalysisRow {
  id: string;
  fileId?: string;
  risk: number;
  riskLevel: string;
}

const columns: Column<LabFile>[] = [
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
];

export default function AudioLabPage() {
  const [files, setFiles] = useState<LabFile[]>([]);
  const [results, setResults] = useState<AnalysisRow[]>([]);
  const [source, setSource] = useState<"live" | "demo">("demo");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/lab/analyze");
      if (!res.ok) return;
      const data = await res.json();
      const liveFiles = (data.files ?? []).map((f: Record<string, unknown>) => ({
        id: f.id,
        name: f.name,
        durationSec: (f.duration_sec as number) ?? 0,
        sampleRate: (f.sample_rate as number) ?? 16000,
        channels: (f.channels as number) ?? 1,
        sizeKb: (f.size_kb as number) ?? 0,
        uploadedAt: f.uploaded_at,
        analyzed: f.analyzed,
      }));
      if (liveFiles.length) {
        setFiles(liveFiles);
        setSource("live");
      }
      setResults(
        (data.analyses ?? []).map((a: Record<string, unknown>) => ({
          id: a.id,
          fileId: a.file_id,
          risk: a.risk_score,
          riskLevel: a.risk_severity,
        }))
      );
    } catch {
      /* keep demo */
    }
  }

  useEffect(() => {
    // Initial demo rows so the page is never empty; replaced by live rows when present.
    let mounted = true;
    import("@/lib/demo-data").then((m) => {
      if (!mounted) return;
      setFiles(m.labAudioFiles);
      setResults(m.analysisResults.map((r) => ({ id: r.id, fileId: r.fileId, risk: r.risk, riskLevel: r.riskLevel })));
    });
    const t = setTimeout(() => {
      if (mounted) void load();
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/lab/analyze", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Analysis failed");
        return;
      }
      const r = data.result;
      setMessage(
        r.status === "analyzed"
          ? `Analyzed: risk ${r.risk?.score ?? "?"} (${r.risk?.severity ?? "?"}) · spoof signal ${JSON.stringify(r.spoof_detection?.score ?? r.spoof_detection ?? "?")}`
          : "Uploaded but AI could not decode audio (WAV PCM only)."
      );
      await load();
    } catch {
      setMessage("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
    }
  }

  const cols: Column<LabFile>[] = [
    ...columns,
    {
      key: "open",
      header: "",
      render: (f) => {
        const result = results.find((r) => r.fileId === f.id);
        return result ? (
          <Link href={`/analysis/${result.id}`} className="inline-flex items-center text-teal hover:underline">
            View result <ChevronRight className="size-3.5" />
          </Link>
        ) : (
          <span className="font-mono text-[12px] text-text-disabled">not analyzed</span>
        );
      },
    },
  ];

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
        subtitle={source === "live" ? "Upload WAV audio — analyzed by the AI service, history stored." : "Upload WAV audio to run the DSP + model pipeline deterministically."}
      />

      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-elev/60 p-8 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-card text-teal">
            {uploading ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
          </div>
          <div>
            <p className="text-[14px] font-semibold">
              {uploading ? "Analyzing with AI service…" : "Drop a WAV file here or browse"}
            </p>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              16 kHz mono recommended · analyzed by AI service, history persisted
            </p>
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-5 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25">
            <Upload className="size-4" /> {uploading ? "Working…" : "Browse files"}
            <input
              type="file"
              accept=".wav,audio/wav,audio/x-wav"
              className="hidden"
              disabled={uploading}
              onChange={onFile}
            />
          </label>
          {message && <p className="max-w-xl text-[12px] text-teal">{message}</p>}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileAudio className="size-5 text-teal" />
          <h2 className="text-[17px] font-semibold">Lab Files</h2>
          {source === "live" && (
            <span className="rounded bg-teal/15 px-1.5 py-0.5 text-[11px] text-teal">live</span>
          )}
        </div>
        <DataTable columns={cols} rows={files} />
      </Card>
    </div>
  );
}
