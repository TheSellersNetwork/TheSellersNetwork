/*
  Amazon FBA reimbursement claim windows (United Kingdom), shared by the claims
  deadline checker and the reimbursement checker so the two never disagree.

  Checked on Seller Central (UK) help pages, September 2026:
  - Fulfilment centre operations claim (GGEV4254LJJ9BAEG): no later than 60 days
    after the item was reported lost or damaged.
  - Removals claims: within 60 days of the removal being delivered back to you.
  - FBA lost and damaged inventory reimbursement policy (G200213130): valuation
    disputes within 60 days after the reimbursement was issued.
  - FBA customer return claims (G84Z6B8BTKVNV53S): no sooner than 45 days and no
    later than 105 days after the customer refund or replacement.
*/

export const CLAIM_KINDS = [
  {
    id: "fc",
    label: "Lost or damaged in Amazon's warehouse",
    from: "the date Amazon reported it lost or damaged",
    days: 60,
  },
  {
    id: "removal",
    label: "Removal order arrived damaged, short or wrong",
    from: "the delivery date",
    days: 60,
  },
  {
    id: "reimb",
    label: "A reimbursement you think is too low",
    from: "the date it was paid",
    days: 60,
  },
] as const;

export type ClaimKindId = (typeof CLAIM_KINDS)[number]["id"];

export const WAREHOUSE_CLAIM_DAYS = CLAIM_KINDS[0].days;

/* Customer refunded but the item never came back: claimable from day 45 to day 105 after the refund. */
export const CUSTOMER_RETURN_WINDOW = { opensAfterDays: 45, closesAfterDays: 105 } as const;

export const CLAIM_SOURCES = {
  warehouse: "https://sellercentral.amazon.co.uk/help/hub/reference/external/GGEV4254LJJ9BAEG",
  customerReturns:
    "https://sellercentral.amazon.co.uk/help/hub/reference/external/G84Z6B8BTKVNV53S",
  policy: "https://sellercentral.amazon.co.uk/help/hub/reference/external/G200213130",
  ledger: "https://sellercentral.amazon.co.uk/help/hub/reference/external/G4FKT5KQWFFJ7LDN",
} as const;

const DAY = 86_400_000;

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY);
}

/* Whole days from `from` to `to`, both taken as UTC dates. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / DAY);
}
