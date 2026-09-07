import CallsView from "@/components/CallsView";
import { getCallsData } from "@/lib/data";

export default async function CallsPage() {
  const calls = await getCallsData();
  return <CallsView calls={calls} />;
}