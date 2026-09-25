"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
};

/*
  Six boxes for a one-time code. Typing moves forward, backspace moves back,
  pasting fills the lot, arrow keys move between boxes. Announces itself to
  screen readers as one field.
*/
export function OtpInput({ length = 6, onComplete, disabled, error, autoFocus = true }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function commit(next: string[]) {
    setDigits(next);
    if (next.every((d) => d !== "")) onComplete(next.join(""));
  }

  function handleChange(i: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[i] = "";
      setDigits(next);
      return;
    }
    const next = [...digits];
    // A paste or autofill may deliver several digits at once.
    clean.split("").slice(0, length - i).forEach((ch, k) => {
      next[i + k] = ch;
    });
    commit(next);
    const target = Math.min(i + clean.length, length - 1);
    refs.current[target]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const next = Array(length).fill("") as string[];
    text.split("").slice(0, length).forEach((ch, k) => {
      next[k] = ch;
    });
    commit(next);
    refs.current[Math.min(text.length, length) - 1]?.focus();
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label={`${length} digit code`}>
      {digits.map((d, i) => (
        <span key={i} className="contents">
          {i === length / 2 ? <span className="w-2 text-center text-muted-foreground" aria-hidden="true">-</span> : null}
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={d}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={cn(
              "size-12 rounded-lg border bg-card text-center text-2xl font-semibold tabular-nums shadow-sm outline-none transition-colors",
              "focus:border-brand focus:ring-2 focus:ring-brand/40",
              error && "border-destructive",
              disabled && "opacity-60",
            )}
          />
        </span>
      ))}
    </div>
  );
}

/* a****@gmail.com, so the member knows which inbox to check without the page showing the full address. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(user.length - 1, 6)))}@${domain}`;
}
