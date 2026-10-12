import { useAccount } from "@/lib/accountContext";
import Studio from "@/features/skills/Studio";
import { names, type Feature } from "@/features/skills/api";
import { AccountPage } from "./shared";
export default function SkillsPage({ feature }: { feature: Feature }) {
  const { user } = useAccount();
  return (
    <AccountPage
      title={names[feature]}
      intro="Guided learning, independent responses and connected saved revisions."
    >
      <Studio key={`${user?.id}:${feature}`} feature={feature} />
    </AccountPage>
  );
}
