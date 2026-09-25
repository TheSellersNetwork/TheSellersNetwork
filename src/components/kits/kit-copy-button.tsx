"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyKit } from "@/app/kits/actions";
import { urls } from "@/lib/forum/urls";

export function KitCopyButton({ kitId, signedIn }: { kitId: string; signedIn: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() => {
        if (!signedIn) {
          router.push(urls.login(`/kits/${kitId}`));
          return;
        }
        start(async () => {
          const r = await copyKit(kitId);
          if (r.ok && r.id) {
            toast("Copied to your setups. Edit it to make it yours.");
            router.push(`/kits/${r.id}/edit`);
          } else toast.error(r.message);
        });
      }}
    >
      <Copy /> Copy this setup
    </Button>
  );
}
