"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";

/*
  "Copy link" beside a heading in a post or guide. Shows on hover and on
  keyboard focus, and always on touch screens where there is no hover.
*/
export function CopyHeadingLink({ id, label }: { id: string; label: string }) {
  async function copy() {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    history.replaceState(null, "", `#${id}`);
    if (await writeClipboard(url)) toast("Link copied");
    else toast("Could not copy the link. You can copy it from the address bar instead.");
  }

  return (
    <button
      type="button"
      onClick={copy}
      data-copy-link
      aria-label={`Copy link to "${label}"`}
      title="Copy link"
      className="not-prose -my-2 ml-1.5 inline-flex size-8 translate-y-[-1px] items-center justify-center rounded-md align-middle text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-secondary hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none [@media(hover:none)]:size-11 [@media(hover:none)]:opacity-70"
    >
      <Link2 className="size-4" aria-hidden="true" />
    </button>
  );
}

/* The async clipboard API, falling back to a hidden text box where it is blocked. */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const box = document.createElement("textarea");
      box.value = text;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      const ok = document.execCommand("copy");
      box.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
