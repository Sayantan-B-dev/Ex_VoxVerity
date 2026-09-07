import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import RiskMeter from "@/components/RiskMeter";
import { getAnalysisById } from "@/lib/data";
import { riskBand, bandTag, timeAgo } from "@/lib/format";

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const { analysisId } = await params;
  const result = await getAnalysisById(analysisId);
  if (!result) notFound();

  const signals = [
    { label: "Synthetic Voice Signal", value: result.syntheticScore, color: "#ff3b3b" },
    { label: "Speaker Similarity", value: result.speakerSimilarity, color: "#35d6c1" },
    { label: "Acoustic Anomaly", value: result.acousticAnomaly, color: "#ff6b35" },
    { label: "Prosody Anomaly", value: result.prosodyAnomaly, color: "#ffb800" },
  ];
  const dspRows = [
    ["RMS Energy", `${result.dsp.rms} dBFS`],
    ["Peak Amplitude", `${result.dsp.peak} dBFS`],
    ["Zero Crossing Rate", String(result.dsp.zcr)],
    ["Spectral Centroid", `${result.dsp.spectralCentroid} Hz`],
    ["Voiced Ratio", `${Math.round(result.dsp.voicedRatio * 100)}%`],
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <Link
        href="/analysis"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Analysis
      </Link>

      <PageHeader
        crumb="Analysis"
        title={result.id}
        subtitle={`Session ${result.sessionId ?? "-"} · ${timeAgo(result.createdAt)}`}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          <p className="self-start text-[15px] font-semibold">Risk Score</p>
          <RiskMeter value={result.risk} size={200} centerValue={String(result.risk)} centerLabel="risk score" />
          <Tag level={bandTag(riskBand(result.risk))}>{bandTag(riskBand(result.risk))}</Tag>
          <p className="text-center text-[12px] text-text-secondary">{result.notes || "3-second chunk analysis."}</p>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card className="p-6">
            <p className="mb-4 text-[15px] font-semibold">Detection Signals</p>
            <div className="space-y-4">
              {signals.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-text-secondary">{s.label}</span>
                    <span className="font-mono text-text-primary">{s.value}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <FlaskConical className="size-5 text-teal" />
              <p className="text-[15px] font-semibold">DSP Metrics</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {dspRows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-xl border border-line bg-elev px-4 py-3">
                  <span className="text-[12px] text-text-secondary">{k}</span>
                  <span className="font-mono text-[13px] text-text-primary">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}