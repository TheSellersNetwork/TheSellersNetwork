"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FoundingChip } from "@/components/forum/founding-chip";
import { getProfileCard } from "@/app/community/actions";
import type { ProfileCardData } from "@/lib/forum/profile-card";
import { initials } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { isMousePointer, useHoverIntent } from "@/components/forum/use-hover-intent";

/* One request per member per page session, shared by every trigger. */
const cardCache = new Map<string, Promise<ProfileCardData | null>>();

function loadCard(username: string): Promise<ProfileCardData | null> {
  const key = username.toLowerCase();
  let pending = cardCache.get(key);
  if (!pending) {
    pending = getProfileCard(key).catch(() => {
      cardCache.delete(key);
      return null;
    });
    cardCache.set(key, pending);
  }
  return pending;
}

type Props = {
  username: string;
  /* An avatar opens the card on tap on touch screens; a name always navigates. */
  trigger?: "avatar" | "name";
  /* The avatar or name link. */
  children: React.ReactNode;
  /* Classes for the wrapping span, for layout in flex rows. */
  className?: string;
};

/*
  Small profile card on hover or keyboard focus of a member's name or avatar.
  Loads lazily the first time it is needed. The trigger stays an ordinary
  link, so the card only adds information and never blocks navigation.
*/
export function ProfileHoverCard({ username, trigger = "name", children, className }: Props) {
  const { open, setOpen, openSoon, closeSoon, openNow, cancel } = useHoverIntent({
    openDelay: 450,
    closeDelay: 180,
  });
  const [data, setData] = useState<ProfileCardData | null | undefined>(undefined);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const pointerType = useRef<string>("mouse");

  function prefetch() {
    if (data !== undefined) return;
    void loadCard(username).then((d) => setData(d));
  }

  useEffect(() => {
    if (open) prefetch();
    // prefetch reads state that only changes after this effect runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          ref={anchorRef}
          className={className ?? (trigger === "avatar" ? "inline-flex shrink-0" : undefined)}
          onPointerDown={(e: React.PointerEvent) => {
            pointerType.current = e.pointerType;
          }}
          onPointerEnter={(e: React.PointerEvent) => {
            if (!isMousePointer(e)) return;
            prefetch();
            openSoon();
          }}
          onPointerLeave={(e: React.PointerEvent) => {
            if (isMousePointer(e)) closeSoon();
          }}
          onFocus={(e: React.FocusEvent) => {
            // Keyboard focus only: a mouse click focuses the link too.
            if (!(e.target instanceof Element) || !e.target.matches(":focus-visible")) return;
            prefetch();
            openSoon(300);
          }}
          onBlur={() => closeSoon()}
          onClick={(e: React.MouseEvent) => {
            if (
              trigger === "avatar" &&
              pointerType.current !== "mouse" &&
              e.detail !== 0 &&
              !open
            ) {
              // First tap on a touch screen shows the card; a second tap follows the link.
              e.preventDefault();
              prefetch();
              openNow();
            } else {
              cancel();
            }
          }}
        >
          {children}
        </span>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 motion-reduce:animate-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // A tap on the avatar again should follow the link, not close and reopen the card.
          if (anchorRef.current && e.target instanceof Node && anchorRef.current.contains(e.target))
            e.preventDefault();
        }}
        onPointerEnter={(e) => {
          if (isMousePointer(e)) cancel();
        }}
        onPointerLeave={(e) => {
          if (isMousePointer(e)) closeSoon();
        }}
        data-testid="profile-card"
      >
        <ProfileCardBody data={data} />
      </PopoverContent>
    </Popover>
  );
}

function ProfileCardBody({ data }: { data: ProfileCardData | null | undefined }) {
  if (data === undefined) {
    return (
      <div className="flex items-center gap-3 p-1" aria-busy="true">
        <span className="size-12 shrink-0 rounded-full bg-secondary motion-safe:animate-pulse" />
        <span className="space-y-2">
          <span className="block h-3 w-32 rounded bg-secondary motion-safe:animate-pulse" />
          <span className="block h-3 w-20 rounded bg-secondary motion-safe:animate-pulse" />
        </span>
        <span className="sr-only">Loading profile</span>
      </div>
    );
  }
  if (data === null || data.kind === "hidden") {
    return (
      <p className="p-1 text-muted-foreground">
        {data === null ? "This profile is not available." : "No public profile for this account."}
      </p>
    );
  }

  const name = data.displayName || data.username;
  const joined = new Date(data.joined).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-3 p-1">
      <div className="flex items-center gap-3">
        <Avatar className="size-12 text-base">
          {data.avatarUrl ? <AvatarImage src={data.avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-secondary font-medium text-secondary-foreground">
            {initials({ display_name: data.displayName, username: data.username })}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{name}</p>
          <p className="truncate text-muted-foreground">@{data.username}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={
            data.isStaff
              ? "rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand"
              : "rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
          }
        >
          {data.label}
        </span>
        {data.founding ? <FoundingChip /> : null}
        {data.badges.slice(0, 3).map((name) => (
          <span key={name} className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
            {name}
          </span>
        ))}
        {data.badges.length > 3 ? <span className="text-xs text-muted-foreground">+{data.badges.length - 3} more</span> : null}
      </div>
      <dl className="space-y-1 text-xs text-muted-foreground">
        {data.platforms.length > 0 ? (
          <div>
            <dt className="inline">Sells on </dt>
            <dd className="inline text-foreground">{data.platforms.join(", ")}</dd>
          </div>
        ) : null}
        <div>
          <dt className="inline">Accepted answers </dt>
          <dd className="inline tabular-nums text-foreground">{data.solutions}</dd>
        </div>
        {data.streak >= 2 ? (
          <div>
            <dt className="inline">Weekly streak </dt>
            <dd className="inline tabular-nums text-foreground">{data.streak} weeks</dd>
          </div>
        ) : null}
        <div>
          <dt className="inline">Joined </dt>
          <dd className="inline text-foreground">{joined}</dd>
        </div>
      </dl>
      <Link
        href={urls.profile(data.username)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-deep sm:min-h-0"
      >
        View profile
      </Link>
    </div>
  );
}
