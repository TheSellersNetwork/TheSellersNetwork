/*
  The welcome checklist for new members. Each step is worked out from what
  the member has actually done; nothing is ticked by visiting a page.
*/

/* The checklist shows for this many days after joining, unless finished or dismissed sooner. */
export const WELCOME_DAYS = 30;

export type WelcomeFacts = {
  hasAvatarOrBio: boolean;
  platformCount: number;
  introduced: boolean;
  pickups: number;
  answers: number;
  follows: number;
};

export type WelcomeStep = { id: "profile" | "introduce" | "pickup" | "answer" | "follow"; label: string; hint: string; href: string; done: boolean };

export type WelcomeLinks = { account: string; introduce: string; pickup: string; answer: string; follow: string };

export function welcomeSteps(f: WelcomeFacts, links: WelcomeLinks): WelcomeStep[] {
  return [
    { id: "profile", label: "Complete your profile", hint: "Add a photo or a short bio, and where you sell.", href: links.account, done: f.hasAvatarOrBio && f.platformCount > 0 },
    { id: "introduce", label: "Introduce yourself", hint: "Start a topic in Introductions.", href: links.introduce, done: f.introduced },
    { id: "pickup", label: "Post a pickup", hint: "Share something you found and what you paid.", href: links.pickup, done: f.pickups > 0 },
    { id: "answer", label: "Answer a question", hint: "Reply to someone else's topic.", href: links.answer, done: f.answers > 0 },
    { id: "follow", label: "Follow a forum", hint: "Follow a forum to build your feed.", href: links.follow, done: f.follows > 0 },
  ];
}

/* Shown to members in their first WELCOME_DAYS days, until every step is done or they dismiss it. */
export function showWelcome({ joinedAt, dismissedAt, steps, now = new Date() }: { joinedAt: string; dismissedAt: string | null; steps: WelcomeStep[]; now?: Date }): boolean {
  if (dismissedAt) return false;
  if (steps.every((s) => s.done)) return false;
  const joined = Date.parse(joinedAt);
  if (Number.isNaN(joined)) return false;
  return now.getTime() - joined < WELCOME_DAYS * 24 * 60 * 60 * 1000;
}
