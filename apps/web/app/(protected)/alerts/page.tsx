import AlertsView from "@/components/AlertsView";
import { getAlertsData } from "@/lib/data";

export default async function AlertsPage() {
  const alerts = await getAlertsData();
  return <AlertsView alerts={alerts} />;
}