"use client";

import { useState } from "react";
import { BarChart3, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_OPTIONS = 6;

/* Optional poll on a new topic. Fields are only submitted while the poll is open. */
export function PollBuilder() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(["", ""]);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <BarChart3 className="size-4" /> Add a poll
      </Button>
    );
  }

  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <legend className="flex items-center gap-2 font-medium">
          <BarChart3 className="size-4 text-brand" aria-hidden="true" /> Poll
        </legend>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Remove poll
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="poll_question">Question</Label>
        <Input id="poll_question" name="poll_question" required minLength={3} maxLength={200} placeholder="Which courier do you use most?" />
      </div>
      <div className="space-y-2">
        <Label>Answers</Label>
        {options.map((value, i) => (
          <div key={i} className="flex gap-2">
            <Input
              name="poll_option"
              value={value}
              maxLength={80}
              required={i < 2}
              placeholder={`Answer ${i + 1}`}
              aria-label={`Answer ${i + 1}`}
              onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {options.length > 2 ? (
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove answer ${i + 1}`} onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}>
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        ))}
        {options.length < MAX_OPTIONS ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setOptions((o) => [...o, ""])}>
            <Plus className="size-4" /> Add an answer
          </Button>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="poll_days">Close the poll after</Label>
        <select id="poll_days" name="poll_days" defaultValue="7" className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="1">1 day</option>
          <option value="3">3 days</option>
          <option value="7">1 week</option>
          <option value="30">1 month</option>
          <option value="0">Never</option>
        </select>
      </div>
    </fieldset>
  );
}
