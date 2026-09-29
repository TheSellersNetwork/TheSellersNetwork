"use client";

import { useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countVisit, dismissedRecently, isIosSafari, rememberDismissal, shouldOffer, type InstallKind } from "@/components/layout/install-prompt-logic";
import { siteConfig } from "@/lib/site";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function standalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/* The cookie banner sits in the same spot; it goes first. */
function cookieBannerOpen(): boolean {
  return !!document.querySelector('[aria-labelledby="cookie-heading"]');
}

/*
  A small card offering to add the site to the home screen, from a member's
  second visit, when the browser can install it (beforeinstallprompt) or on
  iOS Safari with the Share steps. Dismissing hides it for 30 days. Sits above
  the phone tab bar. Rules in install-prompt-logic.ts.
*/
export function InstallPrompt() {
  const [kind, setKind] = useState<InstallKind>(null);
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let visits = 1;
    try {
      visits = countVisit(window.localStorage, window.sessionStorage);
    } catch {
      return;
    }
    const eligible = (k: InstallKind) => {
      let snoozed = false;
      try {
        snoozed = dismissedRecently(window.localStorage, Date.now());
      } catch {
        snoozed = true;
      }
      return shouldOffer({ visits, dismissedRecently: snoozed, standalone: standalone(), kind: k }) && !cookieBannerOpen();
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setKind("prompt");
      if (eligible("prompt")) setOpen(true);
    };
    const onInstalled = () => setOpen(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let timer: number | undefined;
    if (isIosSafari(navigator.userAgent, navigator.maxTouchPoints) && eligible("ios")) {
      // A moment after load, so it does not compete with the page appearing.
      timer = window.setTimeout(() => {
        setKind("ios");
        setOpen(true);
      }, 1500);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    try {
      rememberDismissal(window.localStorage, Date.now());
    } catch {
      // Storage blocked: it stays hidden for this page view.
    }
    setOpen(false);
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    setEvent(null);
    // Declining in the browser's own dialog counts as a dismissal.
    if (choice.outcome !== "accepted") dismiss();
    else setOpen(false);
  }

  if (!open || !kind) return null;

  return (
    <aside
      aria-labelledby="install-prompt-heading"
      data-testid="install-prompt"
      className="fixed inset-x-4 z-40 mx-auto max-w-md rounded-lg border bg-card p-4 text-sm shadow-lg duration-200 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none md:inset-x-auto md:right-4 md:w-80"
      style={{ bottom: "calc(var(--tabbar-space, 0px) + 0.75rem)" }}
    >
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="install-prompt-heading" className="font-semibold">
            Add {siteConfig.name} to your home screen
          </h2>
          {kind === "ios" ? (
            <p className="mt-1 text-muted-foreground">
              Tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> Share at the bottom of Safari, then Add to Home Screen. It opens like an app, without the browser bars.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">It opens like an app, without the browser bars.</p>
          )}
          {kind === "prompt" ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={install} className="max-sm:min-h-11">
                Add to home screen
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss} className="max-sm:min-h-11">
                Not now
              </Button>
            </div>
          ) : null}
        </div>
        <Button size="icon-sm" variant="ghost" onClick={dismiss} aria-label="Close, and do not show this for 30 days" className="-mr-1 -mt-1 shrink-0 max-sm:size-11">
          <X />
        </Button>
      </div>
    </aside>
  );
}
