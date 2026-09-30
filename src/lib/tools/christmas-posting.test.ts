import postingData from "../../../content/christmas-posting.json";
import {
  CHRISTMAS_POSTING_PATH,
  christmasPostingPage,
  cutOffs,
  describeServices,
  endOfLondonDay,
  formatRemaining,
  londonOffsetMinutes,
  londonYmd,
  nextCutOff,
  postingEvents,
  publishedTips,
  readPostingData,
  splitRemaining,
  type ChristmasPostingData,
} from "./christmas-posting";

const sample: ChristmasPostingData = readPostingData({
  year: 2026,
  checked: "2026-09-30",
  carriers: [
    {
      id: "royal-mail",
      name: "Royal Mail",
      page: "https://www.royalmail.com/christmas/last-posting-dates",
      services: [
        { id: "second-class", name: "2nd Class", date: "2026-12-17", source: "https://www.royalmail.com/christmas/last-posting-dates" },
        { id: "first-class", name: "1st Class", date: "2026-12-19", source: "https://www.royalmail.com/christmas/last-posting-dates" },
        { id: "special-delivery", name: "Special Delivery Guaranteed", date: null, source: "https://www.royalmail.com/christmas/last-posting-dates" },
      ],
    },
    {
      id: "evri",
      name: "Evri",
      page: "https://www.evri.com/news",
      services: [{ id: "standard", name: "Standard delivery", date: "2026-12-17", source: "https://www.evri.com/news" }],
    },
  ],
  platforms: [],
  tips: ["[TOM: a tip]", "A written tip."],
});

describe("reading the data file", () => {
  it("reads the real file with a year, a checked date and every carrier", () => {
    const data = readPostingData(postingData);
    expect(data.year).toBeGreaterThanOrEqual(2026);
    expect(data.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.carriers.map((c) => c.id)).toEqual(expect.arrayContaining(["royal-mail", "parcelforce", "evri", "inpost", "dpd"]));
    expect(data.carriers.length).toBe(postingData.carriers.length);
  });

  it("only sources dates from the carriers' own websites, and every date is in the data year", () => {
    const official = /(^|\.)(royalmail\.com|royalmailgroup\.com|internationaldistributionservices\.com|parcelforce\.com|evri\.com|inpost\.co\.uk|dpd\.co\.uk|dpdlocal\.co\.uk)$/;
    const data = readPostingData(postingData);
    for (const c of data.carriers) {
      expect(new URL(c.page).hostname).toMatch(official);
      for (const s of c.services) {
        expect(new URL(s.source).hostname).toMatch(official);
        if (s.date) expect(s.date.slice(0, 4)).toBe(String(data.year));
      }
    }
  });

  it("drops a date with no https source or an impossible day", () => {
    const data = readPostingData({
      year: 2026,
      checked: "2026-09-30",
      carriers: [
        {
          id: "x",
          name: "X",
          page: "https://example.com/x",
          services: [
            { id: "a", name: "A", date: "2026-12-18", source: "http://example.com" },
            { id: "b", name: "B", date: "2026-02-30", source: "https://example.com/b" },
            { id: "c", name: "C", date: "2026-12-18", source: "https://example.com/c" },
          ],
        },
        { id: "no-page", name: "No page", page: "", services: [] },
      ],
    });
    expect(data.carriers).toHaveLength(1);
    expect(data.carriers[0].services.map((s) => s.date)).toEqual([null, null, "2026-12-18"]);
    expect(data.carriers[0].services[0].source).toBe("https://example.com/x");
  });

  it("hides tips that are still placeholders", () => {
    expect(publishedTips(sample)).toEqual(["A written tip."]);
    expect(publishedTips(readPostingData(postingData)).join(" ")).not.toMatch(/\[TOM:/);
  });

  it("takes the year in the title from the data", () => {
    const page = christmasPostingPage({ ...sample, year: 2031 });
    expect(page.title).toBe("Christmas last posting dates 2031 UK: every carrier");
    expect(page.title.length).toBeLessThan(60);
    expect(page.description).toContain("Royal Mail and Evri");
    expect(page.path).toBe(CHRISTMAS_POSTING_PATH);
  });
});

describe("UK time", () => {
  it("knows GMT and BST", () => {
    expect(londonOffsetMinutes(new Date("2026-12-18T12:00:00Z"))).toBe(0);
    expect(londonOffsetMinutes(new Date("2026-07-01T12:00:00Z"))).toBe(60);
  });

  it("gives the UK day, not the UTC day", () => {
    // 23:30 UTC on 30 June is 00:30 on 1 July in London.
    expect(londonYmd(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
    expect(londonYmd(new Date("2026-12-17T23:59:00Z"))).toBe("2026-12-17");
  });

  it("ends a UK day at midnight UK time", () => {
    expect(endOfLondonDay("2026-12-17").toISOString()).toBe("2026-12-18T00:00:00.000Z");
    expect(endOfLondonDay("2026-07-01").toISOString()).toBe("2026-07-01T23:00:00.000Z");
    // The day the clocks go forward (29 March 2026) and back (25 October 2026).
    expect(endOfLondonDay("2026-03-29").toISOString()).toBe("2026-03-29T23:00:00.000Z");
    expect(endOfLondonDay("2026-10-25").toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
});

describe("next cut-off", () => {
  it("groups services that share a date, earliest first", () => {
    expect(cutOffs(sample)).toEqual([
      {
        date: "2026-12-17",
        services: [
          { carrier: "Royal Mail", service: "2nd Class" },
          { carrier: "Evri", service: "Standard delivery" },
        ],
      },
      { date: "2026-12-19", services: [{ carrier: "Royal Mail", service: "1st Class" }] },
    ]);
  });

  it("says none when nothing is announced", () => {
    const empty = { ...sample, carriers: sample.carriers.map((c) => ({ ...c, services: c.services.map((s) => ({ ...s, date: null })) })) };
    expect(nextCutOff(cutOffs(empty), new Date("2026-09-30T12:00:00Z"))).toEqual({ kind: "none" });
  });

  it("keeps a date open until the end of that day in the UK", () => {
    const all = cutOffs(sample);
    const before = nextCutOff(all, new Date("2026-12-17T23:59:00Z"));
    expect(before.kind).toBe("upcoming");
    if (before.kind === "upcoming") {
      expect(before.cutOff.date).toBe("2026-12-17");
      expect(before.msLeft).toBe(60_000);
    }
    const after = nextCutOff(all, new Date("2026-12-18T00:00:00Z"));
    expect(after.kind === "upcoming" && after.cutOff.date).toBe("2026-12-19");
  });

  it("says passed after the last date", () => {
    expect(nextCutOff(cutOffs(sample), new Date("2026-12-20T00:00:00Z"))).toEqual({ kind: "passed", last: "2026-12-19" });
  });
});

describe("countdown maths", () => {
  it("splits into days, hours and minutes, rounding up to the minute", () => {
    expect(splitRemaining(((2 * 24 + 3) * 60 + 4) * 60_000)).toEqual({ days: 2, hours: 3, minutes: 4 });
    expect(splitRemaining(1)).toEqual({ days: 0, hours: 0, minutes: 1 });
    expect(splitRemaining(-5)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });

  it("formats the figure", () => {
    expect(formatRemaining({ days: 1, hours: 0, minutes: 5 })).toBe("1 day, 0 hours");
    expect(formatRemaining({ days: 0, hours: 2, minutes: 1 })).toBe("2 hours, 1 minute");
    expect(formatRemaining({ days: 0, hours: 0, minutes: 7 })).toBe("7 minutes");
  });

  it("names the services", () => {
    const s = [
      { carrier: "Royal Mail", service: "2nd Class" },
      { carrier: "Evri", service: "Standard" },
      { carrier: "InPost", service: "Lockers" },
    ];
    expect(describeServices(s.slice(0, 1))).toBe("Royal Mail 2nd Class");
    expect(describeServices(s.slice(0, 2))).toBe("Royal Mail 2nd Class and Evri Standard");
    expect(describeServices(s)).toBe("Royal Mail 2nd Class and 2 more");
  });
});

describe("reseller calendar", () => {
  it("adds one event per known date, linking to the page", () => {
    const events = postingEvents(sample);
    expect(events.map((e) => e.id)).toEqual(["christmas-posting-2026-royal-mail-second-class", "christmas-posting-2026-royal-mail-first-class", "christmas-posting-2026-evri-standard"]);
    expect(events.every((e) => e.category === "postage" && e.url === CHRISTMAS_POSTING_PATH && e.checked === "2026-09-30")).toBe(true);
    expect(events[0].title).toBe("Last posting for Christmas: Royal Mail 2nd Class");
  });

  it("adds nothing for dates not announced yet", () => {
    const data = readPostingData(postingData);
    const known = data.carriers.flatMap((c) => c.services).filter((s) => s.date).length;
    expect(postingEvents(data)).toHaveLength(known);
  });
});

