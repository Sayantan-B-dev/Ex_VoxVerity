import LiveMonitoring from "@/components/LiveMonitoring";

export default async function LivePage() {
  // Caller-only audio analysis lives here: mic capture → 3s chunks → AI service.
  // Presence + call/accept flow are added on top (see REPORT.md P0).
  return <LiveMonitoring />;
}