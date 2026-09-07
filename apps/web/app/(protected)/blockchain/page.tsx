import EvidenceView from "@/components/EvidenceView";
import { getEvidenceData } from "@/lib/data";

export default async function BlockchainPage() {
  const { source, records } = await getEvidenceData();
  return <EvidenceView records={records} source={source} />;
}