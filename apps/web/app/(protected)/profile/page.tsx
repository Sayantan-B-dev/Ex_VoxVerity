import ProfileView from "@/components/ProfileView";
import { getProfileData } from "@/lib/data";

export default async function ProfilePage() {
  const profile = await getProfileData();
  return <ProfileView profile={profile} />;
}