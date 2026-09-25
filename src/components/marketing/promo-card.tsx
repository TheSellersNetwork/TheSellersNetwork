import Link from "next/link";

/* Flat accent block in the right rail, in the place the reference puts a promo. staff copy. */
export function PromoCard() {
  return (
    <div className="rounded-xl bg-brand p-5 text-primary-foreground">
      <p className="text-lg font-semibold leading-snug">New here? Get the free newsletter</p>
      <p className="mt-1 text-sm opacity-90">Seller news, fee changes and the best of the forum, straight to your inbox.</p>
      <Link href="/#newsletter" className="mt-4 inline-block rounded-md bg-background px-3 py-1.5 text-sm font-semibold text-foreground hover:opacity-90">
        Subscribe
      </Link>
    </div>
  );
}
