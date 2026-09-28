"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Download, Share, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePushSubscription, savePushSubscription } from "@/app/account/push-actions";
import { cn } from "@/lib/utils";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const subscribe = () => () => {};
const getPlatform = () => {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return `${ios ? "ios" : "other"}|${standalone ? "app" : "web"}|${pushSupported ? "push" : "nopush"}`;
};

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/*
  Add to home screen and push notifications, explained step by step. iPhones
  only allow push once the site has been added to the home screen, so the
  card says so rather than showing a button that cannot work.
*/
export function AppCard({ className }: { className?: string }) {
  const platform = useSyncExternalStore(subscribe, getPlatform, () => null);
  const [installEvent, setInstallEvent] = useState<InstallPrompt | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        if (sub) setEndpoint(sub.endpoint);
      });
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!platform) return null;
  const [os, mode, push] = platform.split("|");
  const isIos = os === "ios";
  const installed = mode === "app";
  const canPush = push === "push" && !!publicKey && (!isIos || installed);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  async function turnOn() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast("Notifications are blocked. Allow them for this site in your browser settings, then try again.");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) });
      const result = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      toast(result.message);
      if (result.ok) setEndpoint(sub.endpoint);
      else await sub.unsubscribe();
    } catch {
      toast("Could not turn notifications on in this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEndpoint(null);
      toast("Notifications are off for this device.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="app-card-heading" className={cn("forum-card rounded-xl border bg-card p-4 sm:p-5", className)}>
      <h2 id="app-card-heading" className="flex items-center gap-2 font-semibold">
        <Smartphone className="size-4 text-brand" aria-hidden="true" /> Get the app
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Put the forum on your home screen and get a buzz when someone replies to you. Free, nothing to download from an app store.</p>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <h3 className="font-medium">1. Add it to your home screen</h3>
          {installed ? (
            <p className="mt-1 text-success">Done. You are using the app.</p>
          ) : isIos ? (
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
              <li>Open this page in Safari.</li>
              <li>
                Tap the Share button <Share className="inline size-3.5" aria-label="Share" /> at the bottom of the screen.
              </li>
              <li>Scroll down and tap Add to Home Screen, then Add.</li>
              <li>Open The Sellers Network from your home screen and come back to this page.</li>
            </ol>
          ) : installEvent ? (
            <Button type="button" size="sm" className="mt-2" onClick={install}>
              <Download className="size-4" /> Install the app
            </Button>
          ) : (
            <p className="mt-1 text-muted-foreground">
              In Chrome or Edge, open the browser menu and choose Install app or Add to Home screen. On a computer, look for the install icon at the right of the address bar.
            </p>
          )}
        </div>

        <div>
          <h3 className="font-medium">2. Turn on notifications</h3>
          {!publicKey ? (
            <p className="mt-1 text-muted-foreground">Notifications are not set up on this site yet.</p>
          ) : isIos && !installed ? (
            <p className="mt-1 text-muted-foreground">On iPhone and iPad, notifications only work from the home screen app. Do step 1 first.</p>
          ) : !canPush ? (
            <p className="mt-1 text-muted-foreground">This browser does not support notifications. Try Chrome, Edge, Firefox or Safari.</p>
          ) : endpoint ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-success">
                <Bell className="size-4" /> On for this device
              </span>
              <Button type="button" size="sm" variant="outline" onClick={turnOff} disabled={busy}>
                <BellOff className="size-4" /> Turn off
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" className="mt-2" onClick={turnOn} disabled={busy}>
              <Bell className="size-4" /> {busy ? "Turning on" : "Turn on notifications"}
            </Button>
          )}
          <p className="mt-2 text-xs text-muted-foreground">You get one for replies to your topics, mentions, and when your answer is marked as the solution. Turn it off here any time.</p>
        </div>
      </div>
    </section>
  );
}
