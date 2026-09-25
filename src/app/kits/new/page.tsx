import type { Metadata } from "next";
import { KitForm } from "@/components/kits/kit-form";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Add your setup", robots: { index: false } };

export default async function NewKitPage() {
  await requireOnboardedUser("/kits/new");
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add your setup</h1>
      <p className="mt-1 text-sm text-muted-foreground">What you use and what you paid. Others can copy it and change it to suit.</p>
      <div className="mt-6">
        <KitForm kit={null} items={[]} />
      </div>
    </main>
  );
}
