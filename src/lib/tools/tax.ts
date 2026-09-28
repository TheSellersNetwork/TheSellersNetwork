/*
  UK tax dates and thresholds for online sellers, from GOV.UK. Checked 28
  September 2026. The Self Assessment deadlines are fixed dates that repeat
  every year, so upcoming ones are worked out from the rules rather than
  typed in. Thresholds are stored with the page that states them.
*/

export const TAX_CHECKED = "28 September 2026";

export const taxLinks = {
  deadlines: "https://www.gov.uk/self-assessment-tax-returns/deadlines",
  penalties: "https://www.gov.uk/self-assessment-tax-returns/penalties",
  tradingAllowance: "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
  platforms: "https://www.gov.uk/guidance/selling-goods-or-services-on-a-digital-platform",
  platformIncome: "https://www.gov.uk/guidance/check-if-you-need-to-tell-hmrc-about-your-income-from-online-platforms",
  noNewTax: "https://www.gov.uk/government/news/no-tax-changes-for-online-sellers",
  mtd: "https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax",
  mtdQuarterly: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates",
  vat: "https://www.gov.uk/vat-registration/when-to-register",
  hustles: "https://taxhelpforhustles.campaign.gov.uk/buying-or-making-things-to-sell-and-online-selling-tax-rules/",
  badgesOfTrade: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim20205",
};

export type TaxDate = { date: Date; title: string; detail: string; url: string; kind: "self-assessment" | "platforms" | "mtd" | "tax-year" };

function d(y: number, m: number, day: number) {
  return new Date(Date.UTC(y, m - 1, day));
}

function taxYear(endYear: number) {
  return `${endYear - 1} to ${String(endYear).slice(2)}`;
}

/* All rule-based dates around a given year; callers filter to what is upcoming. */
function datesAround(year: number): TaxDate[] {
  const out: TaxDate[] = [];
  for (const y of [year - 1, year, year + 1]) {
    const ty = taxYear(y);
    out.push(
      { date: d(y, 4, 5), title: `Tax year ${ty} ends`, detail: "Sales from 6 April onwards count towards the next tax year.", url: taxLinks.deadlines, kind: "tax-year" },
      { date: d(y, 10, 5), title: "Register for Self Assessment", detail: `Tell HMRC by now if you need to send a return for ${ty} and have not sent one before.`, url: taxLinks.deadlines, kind: "self-assessment" },
      { date: d(y, 10, 31), title: "Paper tax return deadline", detail: `Paper returns for ${ty}, by midnight.`, url: taxLinks.deadlines, kind: "self-assessment" },
      { date: d(y + 1, 1, 31), title: "Online return and tax bill due", detail: `Online returns for ${ty} and any tax owed, by midnight. Also the first payment on account for the next year, if you make them.`, url: taxLinks.deadlines, kind: "self-assessment" },
      { date: d(y + 1, 7, 31), title: "Second payment on account", detail: `Only if HMRC asked you to make payments on account for ${ty}.`, url: taxLinks.deadlines, kind: "self-assessment" },
      { date: d(y, 1, 31), title: "Platforms report last year's sellers to HMRC", detail: `Sites like eBay and Vinted report sellers who passed 30 sales or about £1,700 in ${y - 1}, and send you a copy.`, url: taxLinks.platforms, kind: "platforms" },
      { date: d(y, 8, 7), title: "Making Tax Digital: quarterly update", detail: "For the quarter to 5 July. Only if you are in Making Tax Digital.", url: taxLinks.mtdQuarterly, kind: "mtd" },
      { date: d(y, 11, 7), title: "Making Tax Digital: quarterly update", detail: "For the quarter to 5 October. Only if you are in Making Tax Digital.", url: taxLinks.mtdQuarterly, kind: "mtd" },
      { date: d(y, 2, 7), title: "Making Tax Digital: quarterly update", detail: "For the quarter to 5 January. Only if you are in Making Tax Digital.", url: taxLinks.mtdQuarterly, kind: "mtd" },
      { date: d(y, 5, 7), title: "Making Tax Digital: quarterly update", detail: "For the quarter to 5 April. Only if you are in Making Tax Digital.", url: taxLinks.mtdQuarterly, kind: "mtd" },
    );
  }
  // Making Tax Digital began in April 2026; no quarterly dates before its first quarter.
  return out.filter((t) => t.kind !== "mtd" || t.date >= d(2026, 8, 7));
}

export function upcomingTaxDates(today: Date, count = 6, includeMtd = true): TaxDate[] {
  const start = d(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());
  return datesAround(today.getUTCFullYear())
    .filter((t) => t.date >= start && (includeMtd || t.kind !== "mtd"))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, count);
}

export function daysUntil(date: Date, today: Date): number {
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((date.getTime() - start) / 86_400_000);
}

export const thresholds = [
  {
    label: "Trading allowance",
    value: "£1,000 a year",
    detail: "Trading income up to £1,000 in a tax year is tax free and does not need reporting. Above it, you need to tell HMRC.",
    url: taxLinks.tradingAllowance,
  },
  {
    label: "Platform reporting",
    value: "30 sales or about £1,700",
    detail: "Reach either in a calendar year and the platform reports you to HMRC. Being reported does not by itself mean you owe tax.",
    url: taxLinks.platforms,
  },
  {
    label: "Making Tax Digital",
    value: "Over £50,000 now",
    detail: "Quarterly digital updates from April 2026 if self-employment and property income was over £50,000. Then £30,000 from April 2027 and £20,000 from April 2028.",
    url: taxLinks.mtd,
  },
  {
    label: "VAT registration",
    value: "£90,000 turnover",
    detail: "Register if taxable turnover over the last 12 months goes over £90,000. You have 30 days from the end of that month.",
    url: taxLinks.vat,
  },
  {
    label: "Late filing penalty",
    value: "£100 to start",
    detail: "Rises after 3 months, then again at 6 and 12 months. Late payment adds interest and further penalties.",
    url: taxLinks.penalties,
  },
];
