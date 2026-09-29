"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Trophy } from "lucide-react";
import { calculate, fbaFees, feeData, minimumPrice, platforms, type PlatformId, type Result, type Sale } from "@/lib/tools/fees";
import { checkParcel } from "@/lib/tools/parcels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const gbp = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? "" : n.toLocaleString("en-GB", { style: "currency", currency: "GBP" }));
const num = (s: string) => Number(s.replace(/[£,\s%]/g, "")) || 0;
const checked = new Date(`${feeData.checked}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

function Field({ id, label, value, onChange, hint, suffix }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-destructive")}>{value}</p>
    </div>
  );
}

function Checked() {
  return (
    <p className="text-xs text-muted-foreground">
      Fees checked against each platform&rsquo;s own pages on {checked}. Fees change: check the linked page before relying on a figure. Not financial advice.
    </p>
  );
}

function Breakdown({ r }: { r: Result }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y">
        {r.lines.map((l) => (
          <tr key={l.label}>
            <td className="py-1">{l.label}</td>
            <td className="py-1 text-right tabular-nums">{gbp(l.amount)}</td>
          </tr>
        ))}
        <tr className="font-medium">
          <td className="py-1">Total fees</td>
          <td className="py-1 text-right tabular-nums">{gbp(r.fees)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/* Shared inputs for a sale. */
function useSaleInputs(defaults?: Partial<Record<string, string>>) {
  const [price, setPrice] = useState(defaults?.price ?? "25");
  const [postageCharged, setPostageCharged] = useState(defaults?.postageCharged ?? "3.50");
  const [postageCost, setPostageCost] = useState(defaults?.postageCost ?? "3.20");
  const [itemCost, setItemCost] = useState(defaults?.itemCost ?? "5");
  const [ebayCategory, setEbayCategory] = useState("general");
  const [vatOnFees, setVatOnFees] = useState(true);
  const sale: Sale = { price: num(price), postageCharged: num(postageCharged), postageCost: num(postageCost), itemCost: num(itemCost), ebayCategory, vatOnFees };
  const fields = (
    <div className="grid gap-3 sm:grid-cols-4">
      <Field id="s-price" label="Selling price (£)" value={price} onChange={setPrice} />
      <Field id="s-pc" label="Buyer pays for postage (£)" value={postageCharged} onChange={setPostageCharged} hint="0 for free postage" />
      <Field id="s-pcost" label="Postage and packaging cost (£)" value={postageCost} onChange={setPostageCost} />
      <Field id="s-cost" label="You paid for it (£)" value={itemCost} onChange={setItemCost} />
    </div>
  );
  const extras = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="s-cat">eBay category</Label>
        <select id="s-cat" value={ebayCategory} onChange={(e) => setEbayCategory(e.target.value)} className={selectCls}>
          {feeData.ebayBusiness.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={vatOnFees} onChange={(e) => setVatOnFees(e.target.checked)} className="size-4" />
        Add VAT to fees (untick if you are VAT-registered and reclaim it)
      </label>
    </div>
  );
  return { sale, fields, extras };
}

/* ---- Where should I sell this? ---- */
export function WhereToSell() {
  const { sale, fields, extras } = useSaleInputs();
  const [open, setOpen] = useState<PlatformId | null>(null);
  // Buying to resell makes you a business seller on eBay, so the private-seller rate is only shown when asked for.
  const [ownThings, setOwnThings] = useState(false);
  const results = useMemo(
    () =>
      platforms
        .filter((p) => ownThings || p.id !== "ebay_private")
        .map((p) => ({ p, r: calculate(p.id, sale) }))
        .sort((a, b) => b.r.profit - a.r.profit),
    [sale.price, sale.postageCharged, sale.postageCost, sale.itemCost, sale.ebayCategory, sale.vatOnFees, ownThings], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="space-y-6">
      {fields}
      {extras}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={ownThings} onChange={(e) => setOwnThings(e.target.checked)} className="mt-0.5 size-4" />
        <span>
          I am clearing out my own things, not buying to resell.{" "}
          <span className="text-muted-foreground">This adds eBay&rsquo;s private seller rate. Buying to resell makes you a business seller on eBay, and Vinted asks resellers to use Vinted Pro.</span>
        </span>
      </label>
      {sale.price > 0 ? (
        <ol className="space-y-2">
          {results.map(({ p, r }, i) => (
            <li key={p.id} className={cn("rounded-xl border bg-card", i === 0 && "border-success/60")}>
              <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={open === p.id}>
                {i === 0 ? <Trophy className="size-5 shrink-0 text-success" aria-label="Best" /> : <span className="w-5 shrink-0 text-center text-sm text-muted-foreground">{i + 1}</span>}
                <span className="flex-1 font-medium">{p.name}</span>
                <span className="text-right text-sm">
                  <span className="block text-xs text-muted-foreground">fees {gbp(r.fees)}</span>
                  <span className={cn("font-semibold tabular-nums", r.profit < 0 ? "text-destructive" : "text-success")}>profit {gbp(r.profit)}</span>
                </span>
                <ChevronDown className={cn("size-4 transition-transform", open === p.id && "rotate-180")} aria-hidden="true" />
              </button>
              {open === p.id ? (
                <div className="space-y-2 border-t p-3">
                  {r.lines.length ? <Breakdown r={r} /> : null}
                  <p className="text-sm">
                    You receive <strong>{gbp(r.youReceive)}</strong>
                    {r.buyerPays !== null ? <>, the buyer pays {gbp(r.buyerPays)}</> : null}.
                  </p>
                  {[...r.notes, p.note].filter(Boolean).map((n) => (
                    <p key={n} className="text-xs text-muted-foreground">
                      {n}
                    </p>
                  ))}
                  <a href={p.source} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs underline">
                    Official fee page <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      <p className="text-xs text-muted-foreground">Fees are only part of it: where your buyers are, how fast things sell and how much work each sale takes matter just as much. Amazon FBA has its own calculator.</p>
      <Checked />
    </div>
  );
}

/* ---- One platform, in detail ---- */
export function PlatformCalculator({ platform }: { platform: PlatformId }) {
  const { sale, fields } = useSaleInputs(platform === "vinted" ? { postageCharged: "0" } : undefined);
  const [ebayCategory, setEbayCategory] = useState("general");
  const [amazonCategory, setAmazonCategory] = useState("other");
  const [promoted, setPromoted] = useState("");
  const [boost, setBoost] = useState(false);
  const [offsite, setOffsite] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [individual, setIndividual] = useState(false);
  const [vatOnFees, setVatOnFees] = useState(true);
  const [target, setTarget] = useState("5");
  const full: Sale = { ...sale, ebayCategory, amazonCategory, promotedPercent: num(promoted), depopBoost: boost, etsyOffsiteAds: offsite, reducedRate: reduced, amazonIndividual: individual, vatOnFees };
  const r = calculate(platform, full);
  const min = minimumPrice(platform, full, num(target));
  const meta = platforms.find((p) => p.id === platform)!;

  return (
    <div className="space-y-6">
      {fields}
      <div className="grid gap-3 sm:grid-cols-3">
        {platform === "ebay_business" ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="pc-cat">Category</Label>
              <select id="pc-cat" value={ebayCategory} onChange={(e) => setEbayCategory(e.target.value)} className={selectCls}>
                {feeData.ebayBusiness.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Field id="pc-promo" label="Promoted Listings ad rate" value={promoted} onChange={setPromoted} suffix="%" hint="The rate you chose, if any" />
          </>
        ) : null}
        {platform === "amazon_fbm" ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="pc-acat">Category</Label>
              <select id="pc-acat" value={amazonCategory} onChange={(e) => setAmazonCategory(e.target.value)} className={selectCls}>
                {feeData.amazon.referral.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={individual} onChange={(e) => setIndividual(e.target.checked)} className="size-4" /> Individual plan (per-item fee)
            </label>
          </>
        ) : null}
        {platform === "depop" ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={boost} onChange={(e) => setBoost(e.target.checked)} className="size-4" /> Boosted listing
          </label>
        ) : null}
        {platform === "etsy" ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={offsite} onChange={(e) => setOffsite(e.target.checked)} className="size-4" /> Sold through Offsite Ads
          </label>
        ) : null}
        {platform === "whatnot" || platform === "ebay_live" ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} className="size-4" /> {platform === "whatnot" ? "Coins (lower rate)" : "Coins, bullion or trainers (lower rate)"}
          </label>
        ) : null}
        {["ebay_business", "ebay_live", "etsy", "whatnot", "amazon_fbm"].includes(platform) ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={vatOnFees} onChange={(e) => setVatOnFees(e.target.checked)} className="size-4" /> Add VAT to fees
          </label>
        ) : null}
      </div>

      {sale.price > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Fees" value={gbp(r.fees)} />
            <Stat label="You receive" value={gbp(r.youReceive)} />
            <Stat label="Profit" value={gbp(r.profit)} tone={r.profit < 0 ? "bad" : "good"} />
          </div>
          {r.lines.length ? <Breakdown r={r} /> : null}
          {[...r.notes, meta.note].filter(Boolean).map((n) => (
            <p key={n} className="text-sm text-muted-foreground">
              {n}
            </p>
          ))}
        </>
      ) : null}

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Lowest price that still makes money</h2>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <div className="w-40">
            <Field id="pc-target" label="Profit you want (£)" value={target} onChange={setTarget} />
          </div>
          <p className="pb-2 text-sm">
            List at <strong>{min === null ? "more than we can work out" : gbp(min)}</strong> or more, and never accept an offer below it.
          </p>
        </div>
      </section>

      <a href={meta.source} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm underline">
        Official fee page <ExternalLink className="size-3" aria-hidden="true" />
      </a>
      <Checked />
    </div>
  );
}

/* ---- Lowest offer and counter-offer ladder ---- */
export function OfferCalculator() {
  const [platform, setPlatform] = useState<PlatformId>("ebay_business");
  const { sale, fields, extras } = useSaleInputs();
  const [target, setTarget] = useState("5");
  const s: Omit<Sale, "price"> = { ...sale };
  const floor = minimumPrice(platform, s, num(target));
  const breakEven = minimumPrice(platform, s, 0);
  const ladder = [0, 5, 10, 15, 20, 25].map((off) => {
    const price = Math.round(sale.price * (1 - off / 100) * 100) / 100;
    return { off, price, r: calculate(platform, { ...sale, price }) };
  });

  return (
    <div className="space-y-6">
      <div className="max-w-sm space-y-1">
        <Label htmlFor="oc-platform">Platform</Label>
        <select id="oc-platform" value={platform} onChange={(e) => setPlatform(e.target.value as PlatformId)} className={selectCls}>
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {fields}
      {extras}
      <div className="w-48">
        <Field id="oc-target" label="Least profit you will accept (£)" value={target} onChange={setTarget} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Lowest offer to accept" value={floor === null ? "?" : gbp(floor)} tone="good" />
        <Stat label="Break-even (no profit)" value={breakEven === null ? "?" : gbp(breakEven)} />
      </div>
      {sale.price > 0 ? (
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1">Offer</th>
              <th className="py-1 text-right">Price</th>
              <th className="py-1 text-right">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ladder.map((l) => (
              <tr key={l.off} className={floor !== null && l.price < floor ? "text-muted-foreground" : ""}>
                <td className="py-1.5">{l.off === 0 ? "Asking price" : `${l.off}% off`}</td>
                <td className="py-1.5 text-right tabular-nums">{gbp(l.price)}</td>
                <td className={cn("py-1.5 text-right tabular-nums", l.r.profit < num(target) && "text-destructive")}>{gbp(l.r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Set your automatic decline at the lowest offer to accept. More in{" "}
        <Link href="/guides/best-offer-strategy" className="underline">
          Best Offer strategy
        </Link>
        .
      </p>
      <Checked />
    </div>
  );
}

/* ---- Amazon FBA ---- */
export function FbaCalculator() {
  const [price, setPrice] = useState("15");
  const [cost, setCost] = useState("6");
  const [inbound, setInbound] = useState("0.30");
  const [prep, setPrep] = useState("0.20");
  const [fulfil, setFulfil] = useState(String(feeData.amazon.fbaExamples[7].fee));
  const [category, setCategory] = useState("toys");
  const [months, setMonths] = useState("2");
  const [cubic, setCubic] = useState("0.05");
  const [peak, setPeak] = useState(false);
  const [roiTarget, setRoiTarget] = useState("30");
  const f = fbaFees(num(price), num(fulfil), category, num(months), num(cubic), peak);
  const payout = num(price) - f.total;
  const profit = payout - num(cost) - num(inbound) - num(prep);
  const roi = num(cost) ? (profit / num(cost)) * 100 : 0;
  // Highest buy price for the target ROI: profit = payout - extras - buy >= ROI * buy
  const maxBuy = (payout - num(inbound) - num(prep)) / (1 + num(roiTarget) / 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field id="fba-price" label="Selling price (£, inc VAT)" value={price} onChange={setPrice} />
        <Field id="fba-cost" label="You pay per unit (£)" value={cost} onChange={setCost} />
        <Field id="fba-in" label="Shipping to Amazon per unit (£)" value={inbound} onChange={setInbound} />
        <Field id="fba-prep" label="Prep and labels per unit (£)" value={prep} onChange={setPrep} />
        <div className="space-y-1">
          <Label htmlFor="fba-cat">Category</Label>
          <select id="fba-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
            {feeData.amazon.referral.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="fba-tier">Size tier (fulfilment fee)</Label>
          <select id="fba-tier" value={fulfil} onChange={(e) => setFulfil(e.target.value)} className={selectCls}>
            {feeData.amazon.fbaExamples.map((t) => (
              <option key={t.tier} value={t.fee}>
                {t.tier}: {gbp(t.fee)}
              </option>
            ))}
          </select>
        </div>
        <Field id="fba-fee" label="Or type the fulfilment fee (£)" value={fulfil} onChange={setFulfil} hint="From Amazon's own calculator" />
        <Field id="fba-months" label="Months in storage" value={months} onChange={setMonths} />
        <Field id="fba-cu" label="Size per unit (cubic feet)" value={cubic} onChange={setCubic} hint="Length × width × height in inches ÷ 1728" />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={peak} onChange={(e) => setPeak(e.target.checked)} className="size-4" /> October to December storage rates
        </label>
        <Field id="fba-roi" label="ROI you want" value={roiTarget} onChange={setRoiTarget} suffix="%" />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Amazon fees" value={gbp(f.total)} />
        <Stat label="Profit per unit" value={gbp(profit)} tone={profit < 0 ? "bad" : "good"} />
        <Stat label="ROI" value={`${roi.toFixed(0)}%`} />
        <Stat label={`Most to pay for ${roiTarget}% ROI`} value={gbp(Math.max(0, maxBuy))} />
      </div>
      <table className="w-full max-w-md text-sm">
        <tbody className="divide-y">
          {[
            ["Referral fee", f.referralFee],
            ["Fulfilment fee", f.fulfilment],
            [`Fuel and logistics surcharge (${feeData.amazon.fuelSurchargePercent}%)`, f.fuel],
            ["Storage", f.storage],
            [`Digital services fee (${feeData.amazon.digitalServicesPercent}%)`, f.dst],
            ["VAT on fees", f.vat],
          ].map(([k, v]) => (
            <tr key={k as string}>
              <td className="py-1">{k}</td>
              <td className="py-1 text-right tabular-nums">{gbp(v as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground">
        The size tiers shown are common small items from Amazon&rsquo;s UK rate card; parcels differ for clothing, shoes and bags, and a festive peak fee applies from mid-October to mid-January. For an exact figure, use Amazon&rsquo;s own Revenue Calculator in Seller Central and type the fee in above. If you are not VAT-registered, the selling price includes no VAT you can keep; if you are, work from the price excluding VAT and untick VAT on fees.{" "}
        <a href={feeData.amazon.rateCard} target="_blank" rel="noopener" className="underline">
          Amazon&rsquo;s UK rate card
        </a>
        .
      </p>
      <Checked />
    </div>
  );
}

/* ---- Is it worth my time? ---- */
export function WorthMyTime() {
  const [profit, setProfit] = useState("12");
  const steps = ["Sourcing", "Cleaning and photos", "Listing", "Messages", "Packing and posting"];
  const [mins, setMins] = useState<string[]>(["10", "10", "8", "3", "7"]);
  const total = mins.reduce((t, m) => t + num(m), 0);
  const hourly = total ? (num(profit) / total) * 60 : 0;
  const wage = feeData.hmrc.nationalLivingWage;
  return (
    <div className="space-y-6">
      <div className="w-48">
        <Field id="wt-profit" label="Profit on the item (£)" value={profit} onChange={setProfit} hint="After fees, postage and what you paid" />
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {steps.map((s, i) => (
          <Field key={s} id={`wt-${i}`} label={`${s} (minutes)`} value={mins[i]} onChange={(v) => setMins(mins.map((m, j) => (j === i ? v : m)))} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Time on this item" value={`${total} minutes`} />
        <Stat label="What you earned per hour" value={gbp(hourly)} tone={hourly >= wage ? "good" : "bad"} />
        <Stat label="National Living Wage" value={gbp(wage)} />
      </div>
      <p className="text-sm text-muted-foreground">
        {hourly >= wage
          ? "This beats the National Living Wage. Look for more like it."
          : "This pays less than the National Living Wage. Either raise the price, find these for less, or spend your time on dearer items."}{" "}
        The wage is for workers aged 21 and over (
        <a href={feeData.hmrc.wageSource} target="_blank" rel="noopener" className="underline">
          GOV.UK
        </a>
        ); it is a yardstick, not a rule.
      </p>
    </div>
  );
}

/* ---- Sourcing trip cost ---- */
export function TripCost() {
  const [miles, setMiles] = useState("30");
  const [parking, setParking] = useState("3");
  const [entry, setEntry] = useState("1");
  const [spent, setSpent] = useState("40");
  const [expected, setExpected] = useState("150");
  const [fees, setFees] = useState("15");
  const mileage = num(miles) * feeData.hmrc.mileageFirst10000;
  const tripCost = mileage + num(parking) + num(entry);
  const expectedProfit = num(expected) * (1 - num(fees) / 100) - num(spent) - tripCost;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="tc-m" label="Miles there and back" value={miles} onChange={setMiles} />
        <Field id="tc-p" label="Parking (£)" value={parking} onChange={setParking} />
        <Field id="tc-e" label="Entry or pitch fees (£)" value={entry} onChange={setEntry} />
        <Field id="tc-s" label="Spent on stock (£)" value={spent} onChange={setSpent} />
        <Field id="tc-x" label="Expect to sell it all for (£)" value={expected} onChange={setExpected} />
        <Field id="tc-f" label="Fees and postage, roughly" value={fees} onChange={setFees} suffix="%" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={`Mileage at ${Math.round(feeData.hmrc.mileageFirst10000 * 100)}p a mile`} value={gbp(mileage)} />
        <Stat label="Cost of the trip" value={gbp(tripCost)} />
        <Stat label="Expected profit from the haul" value={gbp(expectedProfit)} tone={expectedProfit >= 0 ? "good" : "bad"} />
      </div>
      <p className="text-sm text-muted-foreground">
        The mileage figure uses HMRC&rsquo;s simplified rate for the self-employed ({Math.round(feeData.hmrc.mileageFirst10000 * 100)}p a mile for the first 10,000 business miles, {Math.round(feeData.hmrc.mileageAfter * 100)}p after), which covers fuel and wear on the car (
        <a href={feeData.hmrc.mileageSource} target="_blank" rel="noopener" className="underline">
          GOV.UK
        </a>
        ). Keep a note of business miles for your tax return. Not tax advice.
      </p>
    </div>
  );
}

/* ---- Live show planner ---- */
export function ShowPlanner() {
  const [platform, setPlatform] = useState<PlatformId>("whatnot");
  const [items, setItems] = useState([{ name: "Item 1", cost: "3" }, { name: "Item 2", cost: "8" }, { name: "Item 3", cost: "15" }]);
  const [target, setTarget] = useState("2");
  const [packaging, setPackaging] = useState("0.40");
  const [giveaways, setGiveaways] = useState("5");
  const [orders, setOrders] = useState("20");
  const live: PlatformId[] = ["whatnot", "ebay_live", "tiktok_shop"];
  const giveawayShare = num(orders) ? num(giveaways) / num(orders) : 0;
  const rows = items.map((it) => {
    const s: Omit<Sale, "price"> = { postageCharged: 0, postageCost: num(packaging) + giveawayShare, itemCost: num(it.cost), vatOnFees: true };
    return { ...it, start: minimumPrice(platform, s, num(target)) };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="sp-p">Platform</Label>
          <select id="sp-p" value={platform} onChange={(e) => setPlatform(e.target.value as PlatformId)} className={selectCls}>
            {platforms
              .filter((p) => live.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
        <Field id="sp-t" label="Least profit per item (£)" value={target} onChange={setTarget} />
        <Field id="sp-pk" label="Packaging per order (£)" value={packaging} onChange={setPackaging} hint="Buyers usually pay postage" />
        <Field id="sp-g" label="Giveaways for the show (£)" value={giveaways} onChange={setGiveaways} hint="Items plus their postage" />
        <Field id="sp-o" label="Orders you expect" value={orders} onChange={setOrders} />
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1">Item</th>
            <th className="py-1">You paid (£)</th>
            <th className="py-1 text-right">Lowest safe starting bid</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1.5 pr-2">
                <Input aria-label="Item name" value={r.name} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              </td>
              <td className="w-28 py-1.5 pr-2">
                <Input aria-label="Cost" inputMode="decimal" value={r.cost} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))} />
              </td>
              <td className="py-1.5 text-right font-medium tabular-nums">{r.start === null ? "?" : gbp(r.start)}</td>
              <td className="w-10 py-1.5 text-right">
                <button type="button" className="text-muted-foreground" aria-label="Remove" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="text-sm underline" onClick={() => setItems([...items, { name: `Item ${items.length + 1}`, cost: "" }])}>
        Add an item
      </button>
      <p className="text-sm text-muted-foreground">
        The starting bid covers the platform&rsquo;s fees, your packaging and a share of the giveaways, plus the profit you set. Giveaways that require a purchase can break UK prize draw law: read{" "}
        <Link href="/guides/giveaways-and-the-law" className="underline">
          giveaways and the law
        </Link>{" "}
        first.
      </p>
      <Checked />
    </div>
  );
}

/* ---- Cheapest postage ---- */
export function PostageFinder() {
  const [l, setL] = useState("30");
  const [w, setW] = useState("20");
  const [d, setD] = useState("5");
  const [kg, setKg] = useState("0.6");
  const fits = checkParcel([num(l), num(w), num(d)], num(kg)).filter((f) => f.fits).map((f) => f.service.id);
  const options = feeData.postage.prices
    .filter((p) => fits.includes(p.format) && num(kg) <= p.maxKg)
    // Keep only the cheapest weight band for each service.
    .filter((p, _, all) => !all.some((q) => q.service === p.service && q.carrier === p.carrier && q.maxKg < p.maxKg && num(kg) <= q.maxKg))
    .sort((a, b) => a.price - b.price);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field id="pf-l" label="Length (cm)" value={l} onChange={setL} />
        <Field id="pf-w" label="Width (cm)" value={w} onChange={setW} />
        <Field id="pf-d" label="Depth (cm)" value={d} onChange={setD} />
        <Field id="pf-kg" label="Weight (kg)" value={kg} onChange={setKg} />
      </div>
      {options.length ? (
        <ol className="space-y-2">
          {options.map((o, i) => (
            <li key={`${o.carrier}-${o.service}-${o.maxKg}`} className={cn("flex items-center justify-between rounded-lg border bg-card p-3", i === 0 && "border-success/60")}>
              <span>
                <span className="font-medium">
                  {o.carrier} {o.service}
                </span>
                <span className="block text-xs text-muted-foreground">up to {o.maxKg < 1 ? `${o.maxKg * 1000}g` : `${o.maxKg}kg`}</span>
              </span>
              <span className="font-semibold tabular-nums">{gbp(o.price)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">None of the prices we hold fit this size and weight. Try the full parcel size checker for every service.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Online list prices: Royal Mail from {feeData.postage.royalMailFrom} (
        <a href={feeData.postage.royalMailSource} target="_blank" rel="noopener" className="underline">
          price guide
        </a>
        ), Evri drop-off Standard (
        <a href={feeData.postage.evriSource} target="_blank" rel="noopener" className="underline">
          prices
        </a>
        ). {feeData.postage.evriNote} Platform labels (eBay, Vinted) are often cheaper. Checked {checked}.{" "}
        <Link href="/tools/parcel-size" className="underline">
          Parcel size checker
        </Link>
        .
      </p>
    </div>
  );
}

/* ---- Amazon claims deadline ---- */
export function ClaimsDeadline() {
  const kinds = [
    { id: "fc", label: "Lost or damaged in Amazon's warehouse", from: "the date Amazon reported it lost or damaged", days: 60 },
    { id: "removal", label: "Removal order arrived damaged, short or wrong", from: "the delivery date", days: 60 },
    { id: "reimb", label: "A reimbursement you think is too low", from: "the date it was paid", days: 60 },
  ];
  const [kind, setKind] = useState(kinds[0].id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const k = kinds.find((x) => x.id === kind)!;
  const start = new Date(`${date}T00:00:00Z`);
  const deadline = new Date(start.getTime() + k.days * 86_400_000);
  const left = Math.ceil((deadline.getTime() - Date.parse(new Date().toISOString().slice(0, 10))) / 86_400_000);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="cd-k">What happened</Label>
          <select id="cd-k" value={kind} onChange={(e) => setKind(e.target.value)} className={selectCls}>
            {kinds.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cd-d">Date of {k.from}</Label>
          <Input id="cd-d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Claim by" value={deadline.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })} />
        <Stat label="Days left" value={left < 0 ? "Deadline passed" : `${left}`} tone={left < 0 ? "bad" : left <= 14 ? "bad" : "good"} />
      </div>
      <p className="text-sm text-muted-foreground">
        Most claims must be made within {k.days} days of {k.from}. Amazon now pays out on what the stock cost you, not its selling price, so keep invoices ready. The full process is in{" "}
        <Link href="/guides/amazon-lost-and-damaged-stock-claims" className="underline">
          lost and damaged stock claims
        </Link>
        . Check the current window on Seller Central before relying on it.
      </p>
    </div>
  );
}

/* ---- eBay shop: worth it? (private sellers) ---- */
export function EbayShop() {
  const [listings, setListings] = useState("450");
  const n = num(listings);
  const withoutShop = Math.max(0, n - feeData.ebayPrivate.freeListings) * feeData.ebayPrivate.extraListingFee;
  const withShop = feeData.ebayPrivate.shopMonthly + Math.max(0, n - feeData.ebayPrivate.shopFreeListings) * feeData.ebayPrivate.extraListingFee;
  return (
    <div className="space-y-6">
      <div className="w-56">
        <Field id="es-n" label="New listings a month" value={listings} onChange={setListings} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Without a shop" value={gbp(withoutShop)} tone={withoutShop <= withShop ? "good" : undefined} />
        <Stat label="With a shop" value={gbp(withShop)} tone={withShop < withoutShop ? "good" : undefined} />
      </div>
      <p className="text-sm text-muted-foreground">
        For private sellers: {feeData.ebayPrivate.freeListings} free listings a month, then {Math.round(feeData.ebayPrivate.extraListingFee * 100)}p each; a shop costs {gbp(feeData.ebayPrivate.shopMonthly)} a month with {feeData.ebayPrivate.shopFreeListings} free listings (
        <a href={feeData.ebayPrivate.source} target="_blank" rel="noopener" className="underline">
          eBay
        </a>
        ). Business sellers have different shop plans; see{" "}
        <Link href="/guides/ebay-shop-subscription-worth-it" className="underline">
          is an eBay shop worth it
        </Link>
        .
      </p>
      <Checked />
    </div>
  );
}
