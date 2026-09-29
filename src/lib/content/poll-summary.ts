/*
  Plain-English lines under a poll's results, from real vote counts only.
  Pure, so the debate card and the unit tests share it.
*/

export const MIN_VOTES_FOR_PERCENT = 5;
/* Top two answers this close (in percentage points) count as a split. */
export const SPLIT_MARGIN = 10;

export type PollCounts = { options: { id: string; label: string; votes: number }[]; total: number; myOptionId: string | null };

export type PollSummary = {
  /* False below MIN_VOTES_FOR_PERCENT: show counts, not percentages or bars. */
  showPercent: boolean;
  /* Rounded percentage per option id (0 when there are no votes). */
  percent: Record<string, number>;
  /* "Voters are split 52 to 48", "Most voters chose X (61%)", "Early days: 3 votes so far". */
  headline: string;
  /* After the viewer votes: "You agree with 61% of voters". */
  agreement: string | null;
};

function votesLabel(n: number) {
  return `${n} ${n === 1 ? "vote" : "votes"}`;
}

export function summarisePoll(poll: PollCounts): PollSummary {
  const total = Math.max(0, poll.total);
  const percent = Object.fromEntries(poll.options.map((o) => [o.id, total > 0 ? Math.round((o.votes / total) * 100) : 0]));
  const mine = poll.myOptionId ? poll.options.find((o) => o.id === poll.myOptionId) : undefined;

  if (total === 0) return { showPercent: false, percent, headline: "No votes yet.", agreement: null };

  if (total < MIN_VOTES_FOR_PERCENT) {
    const others = mine ? mine.votes - 1 : 0;
    return {
      showPercent: false,
      percent,
      headline: `Early days: ${votesLabel(total)} so far`,
      agreement: mine ? (others > 0 ? `${others} other ${others === 1 ? "voter" : "voters"} chose the same as you` : "No one else has chosen this answer yet") : null,
    };
  }

  const ranked = [...poll.options].sort((a, b) => b.votes - a.votes);
  const [first, second] = ranked;
  const p1 = percent[first.id];
  const p2 = second ? percent[second.id] : 0;
  let headline: string;
  if (second && second.votes > 0 && (first.votes - second.votes) / total <= SPLIT_MARGIN / 100) {
    headline = `Voters are split ${p1} to ${p2}`;
  } else if (first.votes * 2 > total) {
    headline = `Most voters chose ${first.label} (${p1}%)`;
  } else {
    headline = `The most popular answer is ${first.label} (${p1}%)`;
  }
  return { showPercent: true, percent, headline, agreement: mine ? `You agree with ${percent[mine.id]}% of voters` : null };
}

/* The poll after the viewer votes for (or switches to) an option. */
export function applyVote<T extends PollCounts>(poll: T, optionId: string): T {
  if (poll.myOptionId === optionId) return poll;
  const options = poll.options.map((o) => {
    let votes = o.votes;
    if (o.id === poll.myOptionId) votes -= 1;
    if (o.id === optionId) votes += 1;
    return { ...o, votes };
  });
  return { ...poll, options, myOptionId: optionId, total: poll.myOptionId ? poll.total : poll.total + 1 };
}
