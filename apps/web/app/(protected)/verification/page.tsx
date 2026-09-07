import VerificationView from "@/components/VerificationView";
import { getVerificationData } from "@/lib/data";

export default async function VerificationPage() {
  const { source, requests } = await getVerificationData();
  return <VerificationView requests={requests} source={source} />;
}