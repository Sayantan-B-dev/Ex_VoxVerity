import CallsView from "@/components/CallsView";
import { getCallsData } from "@/lib/data";

export default async function CallsPage() {
  const { source, calls } = await getCallsData();
  return <CallsView calls={calls} stats={{ currentProtection: 72, threatsDetected: 43, lossesPreventedUsd: 214000, falsePositiveRate: 0.4 }} source={source} />;
}