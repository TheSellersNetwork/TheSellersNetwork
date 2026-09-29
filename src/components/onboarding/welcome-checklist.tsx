import { WelcomeCard } from "@/components/onboarding/welcome-card";
import { getCurrentUser } from "@/lib/auth";
import { getWelcomeChecklist } from "@/lib/onboarding/welcome-queries";

/* The welcome checklist for new members, or nothing. Safe to drop into any server-rendered page. */
export async function WelcomeChecklist() {
  const [user, checklist] = await Promise.all([getCurrentUser(), getWelcomeChecklist()]);
  if (!user || !checklist) return null;
  return <WelcomeCard userId={user.id} steps={checklist.steps} />;
}
