import Link from "next/link";
import { BarChart3, CalendarDays, Users } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { getSidebarData } from "@/lib/home/sections/sidebar";
import { plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

/*
  The right-hand column of the home page. Sticks below the header on wide
  screens. In order: the next three calendar dates, the live debate poll,
  who is here now, then whatever the page passes in (the welcome checklist,
  How to join). A block with nothing real to show is left out, except
  "Around now", which invites the first visit of the day instead.
*/
export async function HomeSidebar({ children, className, now }: { children?: React.ReactNode; className?: string; now?: Date }) {
  const { comingUp, debate, online } = await getSidebarData(now);

  return (
    <aside aria-label="Coming up and who is here" className={cn("space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start", className)} data-testid="home-sidebar">
      {comingUp.length > 0 ? (
        <Block id="sidebar-coming-up" title="Coming up" icon={<CalendarDays className="size-4 text-brand" aria-hidden="true" />} link={{ href: "/tools/calendar", label: "Calendar" }}>
          <ol className="space-y-2.5">
            {comingUp.map((e) => (
              <li key={e.id} className="text-sm">
                <Link href={e.href} className="font-medium leading-snug underline-offset-2 hover:underline">
                  {e.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {e.day} · <span className={cn(/^(Today|Tomorrow|On now)/.test(e.when) && "font-medium text-brand")}>{e.when}</span>
                </p>
              </li>
            ))}
          </ol>
        </Block>
      ) : null}

      {debate ? (
        <Block id="sidebar-debate" title="Where do you stand?" icon={<BarChart3 className="size-4 text-brand" aria-hidden="true" />}>
          <p className="text-sm font-medium leading-snug">{debate.question}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {plural(debate.options, "answer")} to choose from
          </p>
          <Link href={debate.href} className="mt-3 inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium text-brand hover:border-brand/60 sm:min-h-9">
            Vote and see the results
          </Link>
        </Block>
      ) : null}

      <Block id="sidebar-online" title="Around now" icon={<Users className="size-4 text-brand" aria-hidden="true" />}>
        {online.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Be the first here today.{" "}
            <Link href={urls.community()} className="text-brand underline underline-offset-2">
              Open the forum
            </Link>
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{plural(online.length, "member")} here in the last five minutes</p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Members here now">
              {online.slice(0, 10).map((m) => (
                <li key={m.id} className="grid size-11 place-items-center sm:size-auto">
                  <UserAvatar profile={m} size="md" />
                </li>
              ))}
            </ul>
          </>
        )}
      </Block>

      {children}
    </aside>
  );
}

function Block({ id, title, icon, link, children }: { id: string; title: string; icon: React.ReactNode; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id={id} className="flex items-center gap-2 font-semibold">
          {icon}
          {title}
        </h2>
        {link ? (
          <Link href={link.href} className="text-sm text-brand underline-offset-2 hover:underline">
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
