/*
  Reply templates for common buyer messages. Words in square brackets are
  filled from the form; anything left empty stays in brackets so it is obvious
  what still needs writing. Platform rules quoted here were checked on the
  official help pages linked, on the date below.
*/

export const MESSAGES_CHECKED = "30 September 2026";

export type FieldId = "name" | "item" | "price" | "offer" | "counter" | "tracking" | "courier" | "days" | "measurements";

export const fieldLabels: Record<FieldId, { label: string; placeholder: string; money?: boolean }> = {
  name: { label: "Buyer's name", placeholder: "Sam" },
  item: { label: "Item", placeholder: "the Barbour wax jacket" },
  price: { label: "Your price (£)", placeholder: "45", money: true },
  offer: { label: "Their offer (£)", placeholder: "20", money: true },
  counter: { label: "Your counter-offer (£)", placeholder: "40", money: true },
  tracking: { label: "Tracking number", placeholder: "AB123456789GB" },
  courier: { label: "Courier", placeholder: "Royal Mail" },
  days: { label: "Days", placeholder: "30" },
  measurements: { label: "Measurements", placeholder: "Pit to pit 56cm, length 72cm" },
};

export type PlatformRule = { platform: string; rule: string; href: string };

export type Template = {
  id: string;
  title: string;
  when: string;
  fields: FieldId[];
  body: string;
  rules?: PlatformRule[];
  tip?: string;
};

const ebayOutside: PlatformRule = {
  platform: "eBay",
  rule: "eBay does not allow offers to buy or sell outside eBay, or sharing email addresses and phone numbers before a sale is completed on eBay.",
  href: "https://www.ebay.co.uk/help/policies/member-behaviour-policies/offers-buy-sell-outside-ebay-policy?id=4271",
};
const vintedOutside: PlatformRule = {
  platform: "Vinted",
  rule: "Vinted says a payment made outside its system, without the Buy now button, is not covered by Buyer Protection, and asks members not to move conversations off Vinted.",
  href: "https://www.vinted.co.uk/help/82-how-to-shop-pay-safely",
};
const ebayGuarantee: PlatformRule = {
  platform: "eBay",
  rule: "Under the eBay Money Back Guarantee a buyer can return an item that is not as described even if you do not accept returns, within 30 days of delivery. For an item that has not arrived, they have 30 days from the estimated delivery date.",
  href: "https://www.ebay.co.uk/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210",
};
const vintedProtection: PlatformRule = {
  platform: "Vinted",
  rule: "Vinted buyers report a problem with the I have an issue button within 2 days of Vinted telling them the item should have been delivered. Buyer Protection covers items that do not arrive, arrive damaged or are significantly not as described.",
  href: "https://www.vinted.co.uk/help/550-buyer-protection",
};
const ebayFeedback: PlatformRule = {
  platform: "eBay",
  rule: "You can reply once to a feedback comment, and you cannot edit or remove the reply afterwards, so write it when you are calm.",
  href: "https://www.ebay.co.uk/help/selling/leaving-feedback-buyers/disputing-feedback-received?id=4102",
};

export const templates: Template[] = [
  {
    id: "lowball",
    title: "Low offer",
    when: "Someone offers far below your price.",
    fields: ["name", "item", "price", "offer", "counter"],
    body: `Hi [name],

Thank you for your offer of £[offer] on [item]. I can't go that low, as the price already reflects what similar ones have sold for. The best I can do is £[counter].

If that works for you, let me know and I'll send it over.

Thanks,`,
    tip: "Answer with a number. A counter-offer keeps the conversation going; a flat no usually ends it.",
  },
  {
    id: "available",
    title: "Is this still available?",
    when: "The first message is only this question.",
    fields: ["name", "item", "days"],
    body: `Hi [name],

Yes, [item] is still available. You're welcome to buy it now, and it will be posted within [days] working days of payment.

Any questions about it, just ask.

Thanks,`,
    tip: "Replying quickly matters more than the exact words.",
  },
  {
    id: "measurements",
    title: "Asking for measurements",
    when: "A buyer wants sizes before buying.",
    fields: ["name", "item", "measurements"],
    body: `Hi [name],

Here are the measurements for [item], taken with it laid flat:

[measurements]

Sizes vary between brands, so it's worth comparing these with something similar you already own.

Thanks,`,
    tip: "Add the measurements to the listing too, so the next buyer does not need to ask.",
  },
  {
    id: "bundle",
    title: "Bundle request",
    when: "A buyer wants several items together for less.",
    fields: ["name", "price"],
    body: `Hi [name],

Happy to do a bundle. For the items you've picked, I can do £[price] including postage, which saves you on buying them one by one.

If you'd like to go ahead, I'll set that up for you to pay through the site.

Thanks,`,
    tip: "Work out the bundle price after fees and one postage cost, not by adding up the discounts.",
  },
  {
    id: "late-payment",
    title: "Payment not received",
    when: "A buyer committed to buy but has not paid.",
    fields: ["name", "item", "days"],
    body: `Hi [name],

Thank you for buying [item]. I haven't received payment yet, so I just wanted to check everything is all right.

If you still want it, please pay within the next [days] days. If you've changed your mind, that's fine too; let me know and I'll cancel the order so we can both move on.

Thanks,`,
    tip: "Follow the platform's own unpaid item process rather than chasing more than once or twice.",
  },
  {
    id: "return-in-policy",
    title: "Return request within your policy",
    when: "A buyer wants to return an item and is within your returns window.",
    fields: ["name", "item", "days"],
    body: `Hi [name],

Thanks for letting me know, and sorry [item] didn't work out. That's no problem: please start the return through the site so it's tracked, and I'll refund you as soon as it arrives back with me in the same condition.

It needs to be posted within [days] days. If there's anything wrong with it, please tell me what and send a photo, as that helps me put it right.

Thanks,`,
    rules: [ebayGuarantee],
  },
  {
    id: "return-out-of-policy",
    title: "Return request outside your policy",
    when: "A buyer changed their mind after your returns window, or you do not accept returns.",
    fields: ["name", "item"],
    body: `Hi [name],

Thanks for getting in touch, and sorry [item] isn't right for you. My listing doesn't offer returns for a change of mind, so I'm not able to take it back for that reason.

If there's a fault or it's different from the description, please send me a photo and tell me what's wrong, and I'll sort it out with you.

Thanks,`,
    rules: [ebayGuarantee, vintedProtection],
    tip: "A no-returns policy does not cover an item that is not as described. If it is faulty or different from the listing, treat it as a return within policy.",
  },
  {
    id: "not-received",
    title: "Item not received, with tracking",
    when: "A buyer says it has not arrived, and you have tracking.",
    fields: ["name", "item", "courier", "tracking"],
    body: `Hi [name],

Sorry to hear [item] hasn't reached you yet. I sent it with [courier], tracking number [tracking].

The tracking shows [what the tracking says]. Could you check with neighbours, any safe place, and your local delivery office in case a card was left? If it still hasn't turned up in a couple of days, let me know and I'll open an enquiry with [courier].

Thanks,`,
    rules: [ebayGuarantee, vintedProtection],
    tip: "Check the tracking before you reply and write in what it actually says.",
  },
  {
    id: "off-platform",
    title: "Asked to deal off the platform",
    when: "A buyer asks to pay by bank transfer, PayPal or cash, or to swap phone numbers.",
    fields: ["name", "item"],
    body: `Hi [name],

Thanks for your interest in [item]. I only sell through the site itself, so please use the buy button to pay. It keeps us both covered if anything goes wrong with the order, and the site's rules don't allow sales to be arranged outside it.

Happy to answer any questions here.

Thanks,`,
    rules: [ebayOutside, vintedOutside],
    tip: "Requests to move off the platform are a common start to a scam. The scam checker has the other warning signs.",
  },
  {
    id: "negative-feedback",
    title: "Reply to negative feedback",
    when: "A public reply under a negative review. Contact the buyer privately first.",
    fields: ["item"],
    body: `Sorry this order didn't go as expected. I offered a [refund or return] for [item] as soon as I heard, and that offer still stands.`,
    rules: [ebayFeedback],
    tip: "Keep a public reply short and factual. Future buyers read it, not only this one.",
  },
  {
    id: "cancellation",
    title: "Cancellation request",
    when: "A buyer asks to cancel after paying.",
    fields: ["name", "item"],
    body: `Hi [name],

No problem. [item] hasn't been posted yet, so I've started the cancellation and your refund will come back to your original payment method.

Thanks,`,
    tip: "If you have already posted it, say so and explain how to return it instead of cancelling.",
  },
];

/* Swaps [field] for what was typed. Money fields gain two decimal places when needed. Empty fields keep their brackets. */
export function fillTemplate(body: string, values: Partial<Record<FieldId, string>>): string {
  return body.replace(/\[(\w+)\]/g, (whole, key: string) => {
    if (!(key in fieldLabels)) return whole;
    const raw = (values[key as FieldId] ?? "").trim();
    if (!raw) return whole;
    if (fieldLabels[key as FieldId].money) {
      const n = Number(raw.replace(/[£,\s]/g, ""));
      if (Number.isFinite(n) && n > 0) return Number.isInteger(n) ? String(n) : n.toFixed(2);
    }
    return raw;
  });
}
