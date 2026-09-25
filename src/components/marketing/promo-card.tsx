import Link from "next/link";

/* Flat accent block in the right rail, in the place the reference puts a promo. Tom's copy. */
export function PromoCard() {
  return (
    <div className="rounded-xl bg-brand p-5 text-primary-foreground">
      <p className="text-lg font-semibold leading-snug">New here? Start with the free 7-day email course</p>
      <p className="mt-1 text-sm opacity-90">One practical fix a day. Unsubscribe whenever you like.</p>
      <Link href="/#course" className="mt-4 inline-block rounded-md bg-background px-3 py-1.5 text-sm font-semibold text-foreground hover:opacity-90">
        Start the free course
      </Link>
    </div>
  );
}
