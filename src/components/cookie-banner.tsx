"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OPEN_SETTINGS_EVENT, readConsent, writeConsent } from "@/lib/consent";

const subscribe = () => () => {};

/*
  Asks once, with Accept and Reject given equal weight. Only analytics needs
  consent; everything else we store is needed to run the site or was asked
  for by the visitor (see /cookies). "Cookie settings" in the footer reopens it.
*/
export function CookieBanner() {
  const initial = useSyncExternalStore(subscribe, () => readConsent() === null, () => false);
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  if (!(open ?? initial)) return null;

  const choose = (value: "analytics" | "essential") => {
    writeConsent(value);
    setOpen(false);
  };

  return (
    <div role="dialog" aria-labelledby="cookie-heading" aria-describedby="cookie-body" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border bg-card p-4 shadow-lg sm:inset-x-6">
      <h2 id="cookie-heading" className="font-semibold">
        Cookies
      </h2>
      <p id="cookie-body" className="mt-1 text-sm text-muted-foreground">
        We use a few cookies to keep you signed in and remember your settings. With your permission we would also like to count visits so we can see which pages help people. No advertising, nothing sold.{" "}
        <Link href="/cookies" className="underline">
          Details
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => choose("essential")}>
          Reject analytics
        </Button>
        <Button type="button" variant="outline" onClick={() => choose("analytics")}>
          Accept analytics
        </Button>
      </div>
    </div>
  );
}

/* Footer link that reopens the banner. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}>
      Cookie settings
    </button>
  );
}
