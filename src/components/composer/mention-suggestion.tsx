"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { displayName } from "@/lib/format";
import type { ProfileSummary } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type Item = Pick<ProfileSummary, "username" | "display_name">;

type ListHandle = { onKeyDown: (props: SuggestionKeyDownProps) => boolean };

const MentionList = forwardRef<ListHandle, SuggestionProps<Item>>(function MentionList({ items, command }, ref) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelected((s) => (s + items.length - 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const item = items[selected];
        if (item) command({ id: item.username, label: item.username });
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) return null;

  return (
    <ul role="listbox" className="w-64 overflow-hidden rounded-md border bg-popover p-1 text-sm shadow-md">
      {items.map((item, i) => (
        <li
          key={item.username}
          role="option"
          aria-selected={i === selected}
          className={cn("cursor-pointer rounded px-2 py-1.5", i === selected && "bg-secondary")}
          onMouseDown={(e) => {
            e.preventDefault();
            command({ id: item.username, label: item.username });
          }}
        >
          <span className="font-medium">{displayName(item)}</span> <span className="text-muted-foreground">@{item.username}</span>
        </li>
      ))}
    </ul>
  );
});

/* Fetches members from /api/members and renders the list beneath the caret. */
export const mentionSuggestion: Omit<SuggestionOptions<Item>, "editor"> = {
  char: "@",
  allowSpaces: false,
  items: async ({ query }) => {
    if (query.length < 1) return [];
    try {
      const res = await fetch(`/api/members?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return (await res.json()) as Item[];
    } catch {
      return [];
    }
  },
  render: () => {
    let component: ReactRenderer<ListHandle, SuggestionProps<Item>> | null = null;
    let container: HTMLDivElement | null = null;

    const position = (props: SuggestionProps<Item>) => {
      if (!container) return;
      const rect = props.clientRect?.();
      if (!rect) return;
      container.style.left = `${rect.left + window.scrollX}px`;
      container.style.top = `${rect.bottom + window.scrollY + 4}px`;
    };

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, { props, editor: props.editor });
        container = document.createElement("div");
        container.style.position = "absolute";
        container.style.zIndex = "50";
        container.appendChild(component.element);
        document.body.appendChild(container);
        position(props);
      },
      onUpdate: (props) => {
        component?.updateProps(props);
        position(props);
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          container?.remove();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        container?.remove();
        component?.destroy();
        component = null;
        container = null;
      },
    };
  },
};
