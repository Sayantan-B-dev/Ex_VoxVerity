import LiveMonitoring from "@/components/LiveMonitoring";
import { liveSessionFallback } from "@/lib/data";

export default async function LivePage() {
  // Realtime capture/analysis is wired through the AI-service WebSocket (gap item G1).
  // Until that client exists, render the designed visualization with the demo session.
  return <LiveMonitoring session={liveSessionFallback} source="demo" />;
}