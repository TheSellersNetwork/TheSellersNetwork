/*
  A defamation notice of complaint and what staff must do about it, under the
  Defamation Act 2013 s5 and the Defamation (Operators of Websites)
  Regulations 2013. Pure functions so the inbox and the tests share them.
  Not legal advice: the process was written from the regulations and should
  be checked by a solicitor.
*/

import { addRegulationHours, formatDay, formatLondon, posterDeadline, posterDeadlineDay } from "./deadlines";

export const posterResponses = ["none", "consented", "refused_with_details", "refused_without_details"] as const;
export type PosterResponse = (typeof posterResponses)[number];

export const posterResponseLabels: Record<PosterResponse, string> = {
  none: "No reply by the deadline",
  consented: "Agreed to removal",
  refused_with_details: "Refused, and gave full name and postal address",
  refused_without_details: "Refused, without full name and postal address",
};

export const noticeOutcomes = ["removed", "kept"] as const;
export type NoticeOutcome = (typeof noticeOutcomes)[number];

export type DefamationNotice = {
  complainant_name: string;
  complainant_email: string;
  statement: string;
  statement_url: string;
  meaning: string;
  inaccuracies: string;
  insufficient_info_confirmed: boolean;
  consent_share_name: boolean;
  consent_share_email: boolean;
  previous_removals: boolean;
  received_at: string;
  poster_contactable: boolean | null;
  poster_notified_at: string | null;
  complainant_acknowledged_at: string | null;
  poster_response: PosterResponse | null;
  poster_response_at: string | null;
  outcome: NoticeOutcome | null;
  outcome_at: string | null;
  complainant_informed_at: string | null;
};

/*
  What a notice lacks under s5(6)(a) to (c) and reg 2. An empty list means it
  is a valid notice of complaint. The form asks for all of these, so in
  practice only the confirmation can be missing.
*/
export function noticeProblems(n: Pick<DefamationNotice, "complainant_name" | "complainant_email" | "statement" | "statement_url" | "meaning" | "inaccuracies" | "insufficient_info_confirmed">): string[] {
  const problems: string[] = [];
  if (!n.complainant_name.trim()) problems.push("the complainant's name");
  if (!n.complainant_email.trim()) problems.push("an email address to contact the complainant");
  if (!n.statement.trim()) problems.push("the statement complained of");
  if (!n.statement_url.trim()) problems.push("where on the site the statement was posted");
  if (!n.meaning.trim()) problems.push("the meaning the complainant gives the statement and why it is defamatory of them");
  if (!n.inaccuracies.trim()) problems.push("which parts are factually inaccurate or opinions not supported by fact");
  if (!n.insufficient_info_confirmed) problems.push("confirmation that the complainant does not have enough information about the poster to bring proceedings against them");
  return problems;
}

/* The plain-English list of requirements, for the reg 4 reply when a notice is incomplete. */
export const noticeRequirements = [
  "your name",
  "an email address we can contact you at",
  "the statement you complain about, and where on our site it was posted",
  "what you take the statement to mean and why it is defamatory of you",
  "which parts are factually inaccurate, or are opinions not supported by fact",
  "confirmation that you do not have enough information about the person who posted it to bring legal proceedings against them",
  "whether you agree to us giving your name and your email address to the person who posted it",
];

export type StepState = "done" | "due" | "overdue" | "waiting";

export type Step = {
  id: string;
  label: string;
  rule: string;
  due: Date | null;
  doneAt: Date | null;
  state: StepState;
  note?: string;
};

export type Route = "incomplete" | "repeat" | "no_contact" | "standard";

export type Timeline = {
  route: Route;
  summary: string;
  posterDeadline: Date | null;
  steps: Step[];
};

function toDate(iso: string | null): Date | null {
  return iso ? new Date(iso) : null;
}

function step(id: string, label: string, rule: string, due: Date | null, doneAt: Date | null, now: Date, note?: string): Step {
  let state: StepState;
  if (doneAt) state = "done";
  else if (!due) state = "waiting";
  else state = now.getTime() > due.getTime() ? "overdue" : "due";
  return { id, label, rule, due, doneAt, state, note };
}

/*
  Every step the regulations require for this notice, when it is due and
  whether staff have recorded it. Due times are instants; show them with
  formatLondon.
*/
export function defamationTimeline(n: DefamationNotice, now: Date = new Date()): Timeline {
  const received = new Date(n.received_at);
  const within48 = addRegulationHours(received);
  const acknowledged = toDate(n.complainant_acknowledged_at);
  const removedAt = n.outcome === "removed" ? toDate(n.outcome_at) : null;
  const decidedAt = toDate(n.outcome_at);
  const informed = toDate(n.complainant_informed_at);

  if (noticeProblems(n).length > 0) {
    return {
      route: "incomplete",
      summary: "Not a valid notice of complaint. Tell the complainant what is missing and what a notice must contain (reg 4). The other deadlines do not apply unless they send a complete notice.",
      posterDeadline: null,
      steps: [step("tell_incomplete", "Tell the complainant the notice is incomplete, and what it must contain", "Reg 4", within48, acknowledged, now)],
    };
  }

  if (n.previous_removals) {
    return {
      route: "repeat",
      summary:
        "The complainant says we have removed this statement, or one substantially the same, after their complaints on two or more earlier occasions. Check our records. If that is right, remove it without contacting the poster (Schedule para 9). If it is not right, change this answer and follow the usual process.",
      posterDeadline: null,
      steps: [step("remove", "Remove the statement (do not contact the poster)", "Schedule para 9", within48, removedAt, now)],
    };
  }

  if (n.poster_contactable === false) {
    return {
      route: "no_contact",
      summary: "We have no private way to contact the poster (for example, the account was deleted). The statement must be removed within 48 hours of receiving the notice (Schedule para 3).",
      posterDeadline: null,
      steps: [
        step("remove", "Remove the statement", "Schedule para 3", within48, removedAt, now),
        step("acknowledge", "Tell the complainant we received the notice and removed the statement", "Schedule para 4", within48, acknowledged, now),
      ],
    };
  }

  const notified = toDate(n.poster_notified_at);
  const steps: Step[] = [
    step("notify_poster", "Notify the poster", "Schedule para 2", within48, notified, now, n.poster_contactable === null ? "First confirm we can contact the poster privately (their account email or a private message)." : undefined),
    step("acknowledge", "Tell the complainant we received the notice and have notified the poster", "Schedule para 4", within48, acknowledged, now),
  ];
  if (!notified) {
    return { route: "standard", summary: "Notify the poster, then wait for their reply.", posterDeadline: null, steps };
  }

  const deadline = posterDeadline(notified);
  const responseAt = toDate(n.poster_response_at);
  // A reply after the deadline counts as no reply (para 5).
  const late = !!responseAt && responseAt.getTime() > deadline.getTime();
  const response: PosterResponse | null = late ? "none" : n.poster_response;
  const lateNote = late ? "The reply arrived after the deadline, so it counts as no reply." : undefined;

  if (!response) {
    if (now.getTime() <= deadline.getTime()) {
      steps.push(step("await_reply", "Wait for the poster's reply", "Schedule para 2", deadline, null, now));
      return { route: "standard", summary: `Waiting for the poster. They have until ${formatLondon(deadline)} to reply.`, posterDeadline: deadline, steps };
    }
  }

  if (!response || response === "none") {
    const removeBy = addRegulationHours(deadline);
    steps.push(step("remove", "Remove the statement", "Schedule para 5", removeBy, removedAt, now, lateNote));
    steps.push(step("inform", "Tell the complainant it has been removed", "Schedule para 5", removeBy, informed, now));
    return { route: "standard", summary: "The poster did not reply in time. Remove the statement.", posterDeadline: deadline, steps };
  }

  const afterReply = addRegulationHours(responseAt ?? deadline);
  if (response === "consented") {
    steps.push(step("remove", "Remove the statement", "Schedule para 7", afterReply, removedAt, now));
    steps.push(step("inform", "Tell the complainant it has been removed", "Schedule para 7", afterReply, informed, now));
    return { route: "standard", summary: "The poster agreed to removal. Remove the statement.", posterDeadline: deadline, steps };
  }
  if (response === "refused_without_details") {
    steps.push(step("remove", "Remove the statement", "Schedule para 6", afterReply, removedAt, now, "Also remove it if the name or address given is obviously false."));
    steps.push(step("inform", "Tell the complainant it has been removed", "Schedule para 6", afterReply, informed, now));
    return { route: "standard", summary: "The poster refused but did not give their full name and postal address. Remove the statement.", posterDeadline: deadline, steps };
  }
  steps.push(
    step(
      "inform",
      "Tell the complainant the poster objects, and give the poster's name and address only if the poster agreed",
      "Schedule para 8",
      afterReply,
      informed,
      now,
    ),
  );
  steps.push(step("decide", "Record the outcome (the statement can stay up)", "Schedule para 8", null, decidedAt, now));
  return { route: "standard", summary: "The poster refused and gave their details. The statement can stay up; tell the complainant.", posterDeadline: deadline, steps };
}

/*
  The notification the regulations require us to send the poster (Schedule
  para 2), for staff to copy into an email or private message. The
  complainant's name and email are left out unless they agreed.
*/
export function posterNotificationText(n: DefamationNotice, siteName: string, sentAt: Date = new Date()): string {
  const name = n.consent_share_name ? n.complainant_name : "[withheld: the complainant has not agreed to us sharing their name]";
  const email = n.consent_share_email ? n.complainant_email : "[withheld: the complainant has not agreed to us sharing their email address]";
  const deadlineDay = formatDay(posterDeadlineDay(sentAt));
  return [
    `Subject: A complaint about your post on ${siteName}`,
    "",
    "Hello,",
    "",
    `We have received a complaint that something you posted on ${siteName} is defamatory. We are writing to you under the Defamation (Operators of Websites) Regulations 2013.`,
    "",
    `Where it was posted: ${n.statement_url}`,
    "",
    "A copy of the complaint:",
    "",
    `Complainant's name: ${name}`,
    `Complainant's email address: ${email}`,
    "",
    "The statement complained of:",
    n.statement,
    "",
    "What the complainant says it means and why it is defamatory of them:",
    n.meaning,
    "",
    "What the complainant says is factually inaccurate, or opinion not supported by fact:",
    n.inaccuracies,
    "",
    `We will remove the statement unless you reply to us by midnight at the end of ${deadlineDay}.`,
    "",
    "In your reply, please tell us:",
    "1. whether you want the statement to be removed; and",
    "2. if you do not want it removed, your full name and postal address, and whether you agree to us giving your full name and postal address to the complainant.",
    "",
    "If you do not want it removed but do not give us your full name and postal address, we will remove it.",
    "",
    "We will not give your name, postal address or anything else from your reply to the complainant unless you agree, or a court orders us to.",
    "",
    "[TOM: sign-off and the contact route for replies]",
    siteName,
  ].join("\n");
}

/* A short label for the inbox. */
export function routeLabel(route: Route): string {
  switch (route) {
    case "incomplete":
      return "Incomplete notice (reg 4)";
    case "repeat":
      return "Repeat posting (para 9)";
    case "no_contact":
      return "Poster cannot be contacted (para 3)";
    default:
      return "Standard process (paras 2 to 8)";
  }
}

export { formatLondon, formatDay };
