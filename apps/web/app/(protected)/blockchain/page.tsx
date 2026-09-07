import EvidenceView from "@/components/EvidenceView";
import { getEvidenceData } from "@/lib/data";

export default async function BlockchainPage() {
  const records = await getEvidenceData();
  return <EvidenceView records={records} />;
}