import { defamationTimeline, noticeProblems, posterNotificationText, type DefamationNotice } from "./notice";

const base: DefamationNotice = {
  complainant_name: "Sam Example",
  complainant_email: "sam@example.test",
  statement: "The words complained of",
  statement_url: "https://example.test/community/t/a/abc#post-2",
  meaning: "That I sell fakes",
  inaccuracies: "All of it",
  insufficient_info_confirmed: true,
  consent_share_name: false,
  consent_share_email: false,
  previous_removals: false,
  received_at: "2026-10-20T10:00:00Z", // Tuesday
  poster_contactable: true,
  poster_notified_at: null,
  complainant_acknowledged_at: null,
  poster_response: null,
  poster_response_at: null,
  outcome: null,
  outcome_at: null,
  complainant_informed_at: null,
};

const notice = (over: Partial<DefamationNotice>): DefamationNotice => ({ ...base, ...over });
const byId = (t: ReturnType<typeof defamationTimeline>, id: string) => t.steps.find((s) => s.id === id);

describe("noticeProblems", () => {
  it("accepts a complete notice", () => {
    expect(noticeProblems(base)).toEqual([]);
  });
  it("needs the confirmation about the poster", () => {
    expect(noticeProblems(notice({ insufficient_info_confirmed: false }))).toHaveLength(1);
  });
});

describe("defamationTimeline", () => {
  it("asks for the missing information when the notice is incomplete", () => {
    const t = defamationTimeline(notice({ insufficient_info_confirmed: false }), new Date("2026-10-20T12:00:00Z"));
    expect(t.route).toBe("incomplete");
    expect(t.steps.map((s) => s.id)).toEqual(["tell_incomplete"]);
    expect(t.steps[0].due?.toISOString()).toBe("2026-10-22T10:00:00.000Z");
  });

  it("gives 48 working hours to notify the poster", () => {
    const t = defamationTimeline(base, new Date("2026-10-20T12:00:00Z"));
    expect(t.route).toBe("standard");
    expect(byId(t, "notify_poster")?.due?.toISOString()).toBe("2026-10-22T10:00:00.000Z");
    expect(byId(t, "notify_poster")?.state).toBe("due");
    expect(defamationTimeline(base, new Date("2026-10-23T12:00:00Z")).steps[0].state).toBe("overdue");
  });

  it("requires removal within 48 hours when the poster cannot be contacted", () => {
    const t = defamationTimeline(notice({ poster_contactable: false }), new Date("2026-10-20T12:00:00Z"));
    expect(t.route).toBe("no_contact");
    expect(byId(t, "remove")?.due?.toISOString()).toBe("2026-10-22T10:00:00.000Z");
    expect(byId(t, "notify_poster")).toBeUndefined();
  });

  it("removes repeat postings without contacting the poster", () => {
    const t = defamationTimeline(notice({ previous_removals: true }));
    expect(t.route).toBe("repeat");
    expect(t.steps.map((s) => s.id)).toEqual(["remove"]);
  });

  it("waits for the poster until their deadline", () => {
    const n = notice({ poster_notified_at: "2026-10-21T10:00:00Z" });
    const t = defamationTimeline(n, new Date("2026-10-24T10:00:00Z"));
    expect(t.posterDeadline?.toISOString()).toBe("2026-10-27T00:00:00.000Z");
    expect(byId(t, "await_reply")?.state).toBe("due");
  });

  it("requires removal 48 working hours after the deadline if there is no reply", () => {
    const n = notice({ poster_notified_at: "2026-10-21T10:00:00Z" });
    const t = defamationTimeline(n, new Date("2026-10-27T09:00:00Z"));
    expect(byId(t, "remove")?.due?.toISOString()).toBe("2026-10-29T00:00:00.000Z");
  });

  it("treats a late reply as no reply", () => {
    const n = notice({ poster_notified_at: "2026-10-21T10:00:00Z", poster_response: "refused_with_details", poster_response_at: "2026-10-27T09:00:00Z" });
    const t = defamationTimeline(n, new Date("2026-10-27T10:00:00Z"));
    expect(byId(t, "remove")?.rule).toBe("Schedule para 5");
    expect(byId(t, "remove")?.note).toMatch(/after the deadline/);
  });

  it("counts from the reply when the poster agrees to removal", () => {
    const n = notice({ poster_notified_at: "2026-10-21T10:00:00Z", poster_response: "consented", poster_response_at: "2026-10-23T14:00:00Z" });
    const t = defamationTimeline(n, new Date("2026-10-23T15:00:00Z"));
    // Friday 15:00 BST, over the weekend and the clock change, to Tuesday 15:00 GMT.
    expect(byId(t, "remove")?.due?.toISOString()).toBe("2026-10-27T15:00:00.000Z");
  });

  it("removes when the poster refuses without their details", () => {
    const n = notice({ poster_notified_at: "2026-10-21T10:00:00Z", poster_response: "refused_without_details", poster_response_at: "2026-10-22T10:00:00Z" });
    expect(byId(defamationTimeline(n), "remove")?.rule).toBe("Schedule para 6");
  });

  it("keeps the statement up when the poster refuses with their details", () => {
    const n = notice({
      poster_notified_at: "2026-10-21T10:00:00Z",
      poster_response: "refused_with_details",
      poster_response_at: "2026-10-22T10:00:00Z",
      complainant_informed_at: "2026-10-22T11:00:00Z",
    });
    const t = defamationTimeline(n);
    expect(byId(t, "remove")).toBeUndefined();
    expect(byId(t, "inform")?.state).toBe("done");
  });
});

describe("posterNotificationText", () => {
  it("hides the complainant's details unless they agreed", () => {
    const text = posterNotificationText(base, "The Sellers Network", new Date("2026-11-02T09:00:00Z"));
    expect(text).not.toContain("Sam Example");
    expect(text).not.toContain("sam@example.test");
    expect(text).toContain("midnight at the end of Saturday 7 November 2026");
  });

  it("includes them when they agreed", () => {
    const text = posterNotificationText(notice({ consent_share_name: true, consent_share_email: true }), "The Sellers Network");
    expect(text).toContain("Sam Example");
    expect(text).toContain("sam@example.test");
  });

  it("has no exclamation marks or em dashes", () => {
    const text = posterNotificationText(base, "The Sellers Network");
    expect(text).not.toMatch(/[!—]/);
  });
});
