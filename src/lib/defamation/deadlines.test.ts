import {
  addRegulationHours,
  easterSunday,
  englandAndWalesBankHolidays,
  formatLondon,
  instantToLondonLocal,
  isDisregardedDay,
  londonLocalToInstant,
  londonMidnight,
  posterDeadline,
} from "./deadlines";

const at = (iso: string) => new Date(iso);

describe("bank holidays in England and Wales", () => {
  it("finds Easter", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
    expect(easterSunday(2028)).toBe("2028-04-16");
  });

  it("matches the GOV.UK lists", () => {
    // gov.uk/bank-holidays, England and Wales
    expect([...englandAndWalesBankHolidays(2026)].sort()).toEqual(["2026-01-01", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-28"].sort());
    expect([...englandAndWalesBankHolidays(2027)].sort()).toEqual(["2027-01-01", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28"].sort());
    expect([...englandAndWalesBankHolidays(2022)].sort()).toEqual(
      ["2022-01-03", "2022-04-18", "2022-05-02", "2022-06-02", "2022-06-03", "2022-08-29", "2022-09-19", "2022-12-26", "2022-12-27"].sort(),
    );
  });

  it("disregards weekends, Good Friday, Christmas Day and bank holidays only", () => {
    expect(isDisregardedDay("2026-04-03")).toBe(true); // Good Friday
    expect(isDisregardedDay("2026-12-25")).toBe(true); // Christmas Day, a Friday
    expect(isDisregardedDay("2026-12-28")).toBe(true); // Boxing Day substitute
    expect(isDisregardedDay("2026-10-24")).toBe(true); // Saturday
    expect(isDisregardedDay("2026-12-24")).toBe(false); // Christmas Eve is a working day
    expect(isDisregardedDay("2026-10-26")).toBe(false);
  });
});

describe("London midnights and local times", () => {
  it("finds midnight in GMT and BST", () => {
    expect(londonMidnight("2026-01-15").toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(londonMidnight("2026-07-15").toISOString()).toBe("2026-07-14T23:00:00.000Z");
    // Clock-change days: midnight is before the change on both.
    expect(londonMidnight("2026-03-29").toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(londonMidnight("2026-10-25").toISOString()).toBe("2026-10-24T23:00:00.000Z");
  });

  it("reads staff-entered UK times", () => {
    expect(londonLocalToInstant("2026-10-21T14:30")?.toISOString()).toBe("2026-10-21T13:30:00.000Z");
    expect(londonLocalToInstant("2026-12-01T09:00")?.toISOString()).toBe("2026-12-01T09:00:00.000Z");
    // 01:30 happens twice on 25 October 2026; the first (BST) is used.
    expect(londonLocalToInstant("2026-10-25T01:30")?.toISOString()).toBe("2026-10-25T00:30:00.000Z");
    // 01:30 does not exist on 29 March 2026; it becomes 02:30 BST.
    expect(londonLocalToInstant("2026-03-29T01:30")?.toISOString()).toBe("2026-03-29T01:30:00.000Z");
    expect(londonLocalToInstant("not a date")).toBeNull();
    expect(instantToLondonLocal(at("2026-10-21T13:30:00Z"))).toBe("2026-10-21T14:30");
  });
});

describe("48 hours under reg 1(3)", () => {
  it("counts straight through two working days", () => {
    expect(addRegulationHours(at("2026-10-20T10:00:00Z")).toISOString()).toBe("2026-10-22T10:00:00.000Z");
  });

  it("skips a weekend", () => {
    // Friday 16:00 BST: 8 hours on Friday, Monday 24, 16 on Tuesday.
    expect(formatLondon(addRegulationHours(at("2026-10-16T15:00:00Z")))).toBe("16:00 on Tuesday 20 October 2026");
  });

  it("starts from Monday midnight when received at a weekend", () => {
    expect(formatLondon(addRegulationHours(at("2026-10-17T12:00:00Z")))).toBe("midnight at the end of Tuesday 20 October 2026");
  });

  it("keeps the wall-clock time across the spring clock change", () => {
    // Friday 27 March 2026 15:00 GMT; clocks go forward on Sunday 29 March.
    const due = addRegulationHours(at("2026-03-27T15:00:00Z"));
    expect(formatLondon(due)).toBe("15:00 on Tuesday 31 March 2026");
    expect(due.toISOString()).toBe("2026-03-31T14:00:00.000Z");
  });

  it("keeps the wall-clock time across the autumn clock change", () => {
    // Friday 23 October 2026 15:00 BST; clocks go back on Sunday 25 October.
    const due = addRegulationHours(at("2026-10-23T14:00:00Z"));
    expect(formatLondon(due)).toBe("15:00 on Tuesday 27 October 2026");
    expect(due.toISOString()).toBe("2026-10-27T15:00:00.000Z");
  });

  it("skips Christmas and the Boxing Day substitute", () => {
    // Wednesday 23 December 2026 10:00: 14 hours, 24 on Christmas Eve, then Tuesday 29th.
    expect(formatLondon(addRegulationHours(at("2026-12-23T10:00:00Z")))).toBe("10:00 on Tuesday 29 December 2026");
  });

  it("skips Easter and the clock change together", () => {
    // Thursday 25 March 2027 12:00 GMT; Good Friday, the weekend (clocks change) and Easter Monday are skipped.
    const due = addRegulationHours(at("2027-03-25T12:00:00Z"));
    expect(formatLondon(due)).toBe("12:00 on Wednesday 31 March 2027");
    expect(due.toISOString()).toBe("2027-03-31T11:00:00.000Z");
  });
});

describe("the poster's deadline", () => {
  it("is midnight at the end of the 5th day after the day of sending", () => {
    expect(formatLondon(posterDeadline(at("2026-11-02T09:00:00Z")))).toBe("midnight at the end of Saturday 7 November 2026");
  });

  it("does not skip weekends or holidays", () => {
    expect(formatLondon(posterDeadline(at("2026-12-22T09:00:00Z")))).toBe("midnight at the end of Sunday 27 December 2026");
  });

  it("uses the UK day, not the UTC day, late in the evening in summer", () => {
    // 00:30 BST on 21 October is still 20 October in UTC.
    expect(formatLondon(posterDeadline(at("2026-10-20T23:30:00Z")))).toBe("midnight at the end of Monday 26 October 2026");
  });

  it("lands on the right midnight across the autumn clock change", () => {
    // Sent Wednesday 21 October 2026 (BST); the deadline falls after the clocks go back.
    const d = posterDeadline(at("2026-10-21T10:00:00Z"));
    expect(d.toISOString()).toBe("2026-10-27T00:00:00.000Z");
  });

  it("lands on the right midnight across the spring clock change", () => {
    // Sent Tuesday 24 March 2026 (GMT); the deadline falls after the clocks go forward.
    const d = posterDeadline(at("2026-03-24T10:00:00Z"));
    expect(d.toISOString()).toBe("2026-03-29T23:00:00.000Z");
    expect(formatLondon(d)).toBe("midnight at the end of Sunday 29 March 2026");
  });

  it("then allows 48 working hours to remove", () => {
    // Deadline midnight at the end of Monday 26 October; removal by the end of Wednesday 28th.
    const deadline = posterDeadline(at("2026-10-21T10:00:00Z"));
    expect(formatLondon(addRegulationHours(deadline))).toBe("midnight at the end of Wednesday 28 October 2026");
  });
});
