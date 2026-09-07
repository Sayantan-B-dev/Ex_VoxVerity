"use client";

import { useState } from "react";
import { Link2, Copy, Check, Landmark } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, Tag } from "@/components/primitives";
import DataTable from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { evidenceRecords } from "@/lib/demo-data";
import { timeAgo } from "@/lib/format";

function CopyHash({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(hash).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="Copy evidence hash"
      className="inline-flex items-center gap-1 text-[11px] text-text-disabled transition-colors hover:text-teal"
    >
      {copied ? <Check className="size-3 text-teal" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const columns: Column<(typeof evidenceRecords)[number]>[] = [
  {
    key: "id",
    header: "Evidence",
    render: (e) => <span className="font-mono font-semibold text-teal">{e.id}</span>,
  },
  {
    key: "call",
    header: "Call",
    render: (e) => (
      <div>
        <p className="font-medium text-text-primary">{e.callId}</p>
        <p className="text-[11px] text-text-disabled">{e.caller}</p>
      </div>
    ),
  },
  {
    key: "hash",
    header: "SHA-256 Hash",
    render: (e) => (
      <div className="flex items-center gap-2">
        <span className="max-w-[220px] truncate font-mono text-[11px] text-text-secondary">{e.hash}</span>
        <CopyHash hash={e.hash} />
      </div>
    ),
  },
  {
    key: "status",
    header: "Chain",
    render: (e) => (
      <Tag level={e.chainStatus === "REGISTERED" ? "Low" : e.chainStatus === "PENDING" ? "High" : "Critical"}>
        {e.chainStatus}
      </Tag>
    ),
  },
  {
    key: "tx",
    header: "Transaction",
    render: (e) =>
      e.txHash ? (
        <span className="max-w-[160px] truncate font-mono text-[11px] text-text-secondary">{e.txHash}</span>
      ) : (
        <span className="text-[11px] text-text-disabled">—</span>
      ),
  },
  {
    key: "created",
    header: "Created",
    render: (e) => <span className="text-text-secondary">{timeAgo(e.createdAt)}</span>,
  },
];

export default function BlockchainPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Evidence"
        title="Evidence Registry"
        subtitle="Canonical evidence hashes registered on the Polygon Amoy testnet."
      />

      <Card className="flex items-start gap-3 border-teal/30 bg-teal/10 p-4">
        <Landmark className="size-5 shrink-0 text-teal" />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          Only the SHA-256 digest and minimal provenance metadata go on-chain — never raw audio,
          transcripts, embeddings, or phone numbers. Verification compares the local canonical
          hash against the registered hash.
        </p>
      </Card>

      <Card className="p-6">
        <DataTable columns={columns} rows={evidenceRecords} />
      </Card>

      <Card className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="size-5 text-teal" />
          <h2 className="text-[17px] font-semibold">Verify an Evidence Hash</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Paste a SHA-256 hash to compare against the registry…"
            className="h-10 flex-1 rounded-lg border border-line bg-elev px-3 font-mono text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-teal/60"
          />
          <button className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-teal/40 bg-teal/15 px-5 text-[13px] font-medium text-teal transition-colors hover:bg-teal/25">
            Verify
          </button>
        </div>
      </Card>
    </div>
  );
}