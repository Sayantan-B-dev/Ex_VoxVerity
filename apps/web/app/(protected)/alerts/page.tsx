import AlertsView from "@/components/AlertsView";
import { getAlertsData } from "@/lib/data";

export default async function AlertsPage() {
  const { source, alerts } = await getAlertsData();
  return <AlertsView alerts={alerts} source={source} />;
}