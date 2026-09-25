import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { KitForm } from "@/components/kits/kit-form";
import { requireOnboardedUser } from "@/lib/auth";
import { getKit } from "@/lib/forum/extras-queries";

export const metadata: Metadata = { title: "Edit setup", robots: { index: false } };

export default async function EditKitPage({ params }: PageProps<"/kits/[id]/edit">) {
  const { id } = await params;
  const user = await requireOnboardedUser(`/kits/${id}/edit`);
  const kit = await getKit(id);
  if (!kit) notFound();
  if (kit.user_id !== user.id && !user.profile.is_staff) redirect(`/kits/${id}`);
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit setup</h1>
      <div className="mt-6">
        <KitForm kit={kit} items={kit.items} />
      </div>
    </main>
  );
}
