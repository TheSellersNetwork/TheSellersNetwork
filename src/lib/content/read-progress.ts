"use client";

import { useSyncExternalStore } from "react";
import { parseReadList } from "@/lib/content/paths-core";

/*
  Which path steps this reader has ticked, kept in this browser only
  (localStorage). Every access is wrapped because storage can be blocked,
  full or missing (private windows, strict settings).
*/

const STORAGE_KEY = "tsn:paths:read";
const EVENT = "tsn:paths:read-change";
const empty: string[] = [];

let cachedRaw: string | null = null;
let cachedList: string[] = empty;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function snapshot(): string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parseReadList(raw);
  }
  return cachedList;
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setStepRead(key: string, read: boolean) {
  const current = snapshot();
  if (current.includes(key) === read) return;
  const next = read ? [...current, key] : current.filter((k) => k !== key);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

/* The reader's ticked steps. Empty on the server and until the browser has loaded. */
export function useReadSteps(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => empty);
}
