export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

/** Map a 0-100 risk score to a severity band per project_info §11 defaults. */
export function riskBand(score: number): RiskBand {
  if (score <= 25) return "LOW";
  if (score <= 50) return "MEDIUM";
  if (score <= 75) return "HIGH";
  return "CRITICAL";
}

export function bandLabel(band: RiskBand): string {
  return band.charAt(0) + band.slice(1).toLowerCase();
}

export function bandTone(band: RiskBand): string {
  switch (band) {
    case "CRITICAL":
      return "#ff3b3b";
    case "HIGH":
      return "#ff6b35";
    case "MEDIUM":
      return "#ffb800";
    case "LOW":
      return "#35d6c1";
  }
}

export function bandTag(band: RiskBand): string {
  switch (band) {
    case "CRITICAL":
      return "Critical";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
      return "Low";
  }
}

export function fmtMoney(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}