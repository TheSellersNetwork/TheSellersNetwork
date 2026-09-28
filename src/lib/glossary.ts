/*
  Seller shorthand explained in plain words. Posts and guides underline the
  first use of each term; hovering or tapping shows the meaning. Acronyms
  match in capitals only so ordinary words are left alone. Definitions carry
  no figures: those change, and live in the guides with their sources.
*/

export type GlossaryTerm = {
  term: string;
  /* Other spellings that should also be underlined. */
  aliases?: string[];
  /* Match regardless of case. Leave off for acronyms. */
  anyCase?: boolean;
  definition: string;
  platform?: "Amazon" | "eBay" | "Vinted" | "Tax" | "Postage" | "Selling";
};

export const glossary: GlossaryTerm[] = [
  { term: "FBA", platform: "Amazon", definition: "Fulfilled by Amazon. You send stock to Amazon's warehouses and Amazon stores, picks, packs, posts and handles returns for a fee." },
  { term: "FBM", platform: "Amazon", definition: "Fulfilled by Merchant. You list on Amazon but store and post the orders yourself." },
  { term: "SFP", platform: "Amazon", definition: "Seller Fulfilled Prime. You post orders yourself but meet Amazon's Prime delivery standards, so your offer shows the Prime badge." },
  { term: "ASIN", platform: "Amazon", definition: "Amazon Standard Identification Number. The ten-character code for a product page on Amazon. Every seller of that product shares it." },
  { term: "FNSKU", platform: "Amazon", definition: "The label code Amazon uses to tell your units apart from other sellers' units of the same product in its warehouses." },
  { term: "SKU", platform: "Selling", definition: "Stock keeping unit. Your own code for an item or listing, so you can match stock, orders and costs." },
  { term: "EAN", platform: "Selling", definition: "The barcode number on most retail products sold in the UK and Europe. Used to match your item to the right product page." },
  { term: "BSR", platform: "Amazon", definition: "Best Sellers Rank. How a product's recent sales compare with others in its category. Lower is better. A snapshot, not a sales count." },
  { term: "IPI", platform: "Amazon", definition: "Inventory Performance Index. Amazon's score for how well you manage FBA stock. It can affect how much you are allowed to store." },
  { term: "Buy Box", anyCase: true, platform: "Amazon", definition: "The Add to Basket button on a product page. When several sellers offer the same product, Amazon picks whose offer it goes to." },
  { term: "ODR", platform: "Amazon", definition: "Order Defect Rate. The share of your orders with negative feedback, an A-to-z claim or a chargeback. Too high and your account is at risk." },
  { term: "A-to-z", aliases: ["A-to-Z"], platform: "Amazon", definition: "Amazon's A-to-z Guarantee. A buyer's claim against a seller when an order goes wrong. Claims count against your account health." },
  { term: "Brand Registry", anyCase: true, platform: "Amazon", definition: "Amazon's programme for trademark owners. It gives more control over listings and tools to report copies." },
  { term: "ungating", aliases: ["ungated", "gated"], anyCase: true, platform: "Amazon", definition: "Getting approval to sell in a restricted category or brand on Amazon. Gated means you need approval first." },
  { term: "prep centre", aliases: ["prep center"], anyCase: true, platform: "Amazon", definition: "A business that receives your stock, labels and packs it to Amazon's rules, and sends it into FBA for you." },
  { term: "PPC", platform: "Selling", definition: "Pay per click. Adverts where you pay each time someone clicks, such as Amazon Sponsored Products." },
  { term: "ACoS", platform: "Amazon", definition: "Advertising cost of sale. Ad spend divided by the sales those ads brought in. Lower means cheaper sales." },
  { term: "ROI", platform: "Selling", definition: "Return on investment. Profit divided by what you paid. A £5 profit on a £10 item is a 50% ROI." },
  { term: "COGS", platform: "Selling", definition: "Cost of goods sold. What you paid for the stock you actually sold in a period." },
  { term: "OA", platform: "Selling", definition: "Online arbitrage. Buying from online shops to resell at a profit on another marketplace." },
  { term: "RA", platform: "Selling", definition: "Retail arbitrage. Buying in physical shops, such as clearance aisles, to resell at a profit." },
  { term: "sell-through rate", aliases: ["sell through rate"], anyCase: true, platform: "Selling", definition: "How much of what was listed actually sold in a period. A quick check of demand before you buy." },
  { term: "sold comps", aliases: ["comps"], anyCase: true, platform: "Selling", definition: "Recent sold prices for the same item. The basis for pricing, rather than what others are asking." },
  { term: "cross-listing", aliases: ["crosslisting", "cross listing"], anyCase: true, platform: "Selling", definition: "Listing the same item on more than one marketplace, then ending the others when it sells." },
  { term: "RRP", platform: "Selling", definition: "Recommended retail price. What the maker suggests shops charge. Not the same as what it sells for second-hand." },
  { term: "BNWT", platform: "Selling", definition: "Brand new with tags. Unworn, with the original tags still attached." },
  { term: "BNWOT", aliases: ["NWOT"], platform: "Selling", definition: "Brand new without tags. Unworn, but the tags have been removed." },
  { term: "BNIB", platform: "Selling", definition: "Brand new in box. Unused, in the original packaging." },
  { term: "VGC", platform: "Selling", definition: "Very good condition. Used, with little sign of wear. Describe any marks anyway." },
  { term: "VeRO", platform: "eBay", definition: "Verified Rights Owner. eBay's programme that lets brands have listings removed that they say infringe their rights." },
  { term: "INR", platform: "eBay", definition: "Item not received. A buyer's request or case saying the parcel never arrived. Tracking is your best defence." },
  { term: "SNAD", platform: "eBay", definition: "Significantly not as described. A return or case saying the item differs from the listing." },
  { term: "FVF", platform: "eBay", definition: "Final value fee. The percentage eBay takes when an item sells, worked out on the total including postage." },
  { term: "BIN", platform: "eBay", definition: "Buy It Now. A fixed-price listing, as opposed to an auction." },
  { term: "Best Offer", anyCase: true, platform: "eBay", definition: "An eBay option that lets buyers send you a price. You can set it to accept or decline some offers automatically." },
  { term: "Promoted Listings", anyCase: true, platform: "eBay", definition: "eBay adverts. You pay a percentage of the sale price when a promoted listing sells, or per click on some types." },
  { term: "Top Rated Seller", aliases: ["TRS"], platform: "eBay", definition: "eBay's highest seller level, earned by meeting its standards on defects, late delivery and cases." },
  { term: "Buyer Protection fee", anyCase: true, platform: "Vinted", definition: "A fee the buyer pays on Vinted and some other sites for each purchase. It pays for the site's refund cover." },
  { term: "Self Assessment", anyCase: true, platform: "Tax", definition: "HMRC's tax return system for people with income that is not taxed at source, such as trading income." },
  { term: "trading allowance", anyCase: true, platform: "Tax", definition: "The first £1,000 of trading income each tax year is tax free. Above that you tell HMRC." },
  { term: "payments on account", anyCase: true, platform: "Tax", definition: "Advance payments towards next year's tax bill, due in January and July, if HMRC asks you to make them." },
  { term: "MTD", aliases: ["Making Tax Digital"], platform: "Tax", definition: "Making Tax Digital. HMRC's rules for keeping digital records and sending quarterly updates once your income is over a threshold." },
  { term: "HMRC", platform: "Tax", definition: "HM Revenue and Customs. The UK tax authority." },
  { term: "VAT", platform: "Tax", definition: "Value Added Tax. You must register once your taxable turnover goes over the VAT threshold." },
  { term: "GPSR", platform: "Selling", definition: "General Product Safety Regulation. EU product safety rules that apply to sales into Northern Ireland and the EU." },
  { term: "Tracked 24", aliases: ["Tracked 48"], anyCase: true, platform: "Postage", definition: "Royal Mail's tracked services, aiming for delivery the next working day (24) or within two to three working days (48)." },
  { term: "Large Letter", anyCase: true, platform: "Postage", definition: "Royal Mail's size for flat items. It must pass through the size slot, so check the limits before you post." },
];

export type GlossaryIndexEntry = { key: string; definition: string; term: string };

/* Every spelling mapped to its entry, longest first so "Tracked 24" wins over shorter matches. */
export function glossaryPatterns(): { pattern: RegExp; lookup: Map<string, GlossaryTerm> } {
  const lookup = new Map<string, GlossaryTerm>();
  const exact: string[] = [];
  const loose: string[] = [];
  for (const entry of glossary) {
    for (const spelling of [entry.term, ...(entry.aliases ?? [])]) {
      lookup.set(entry.anyCase ? spelling.toLowerCase() : spelling, entry);
      (entry.anyCase ? loose : exact).push(spelling);
    }
  }
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byLength = (a: string, b: string) => b.length - a.length;
  // Case-insensitive terms are wrapped in (?i:...) is not supported in JS, so expand them per letter.
  const anyCase = (s: string) => escape(s).replace(/[a-z]/gi, (ch) => `[${ch.toLowerCase()}${ch.toUpperCase()}]`);
  const parts = [...exact.sort(byLength).map(escape), ...loose.sort(byLength).map(anyCase)];
  return { pattern: new RegExp(`(?<![\\w-])(${parts.join("|")})(?![\\w-])`, "g"), lookup };
}

export function findTerm(lookup: Map<string, GlossaryTerm>, match: string): GlossaryTerm | undefined {
  return lookup.get(match) ?? lookup.get(match.toLowerCase());
}
