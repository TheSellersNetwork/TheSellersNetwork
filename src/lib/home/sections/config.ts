/*
  Which of the lower home page sections are switched on. Set any to false to
  hide it; where a section replaced an older one, the older one comes back.
    debateBand      1  Debate of the week, full width, vote in place
    keepGame        2  "Where would you keep more?" (replaces the What will I keep? card)
    platformSwitcher 3 "I sell on..." (orders Start here by the visitor's platform)
    weekRhythm      4  The week's regular threads, Monday to Sunday
    askSearch       5  Search before you ask (replaces the Got a question? form)
    feeTimeline     6  Fee and policy changes on a timeline
    guidesShelf     7  Guides shelf with beginner path progress
    sidebar         8  Right-hand column: coming up, debate, who is around
    layoutRhythm    9  Full-width bands between the two-column parts
    pickupsSection 10  Pickups preview, or how pickups work when there are none
*/
export const homeSections = {
  debateBand: true,
  keepGame: true,
  platformSwitcher: true,
  weekRhythm: true,
  askSearch: true,
  feeTimeline: true,
  guidesShelf: true,
  sidebar: true,
  layoutRhythm: true,
  pickupsSection: true,
} as const;
