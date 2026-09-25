import type { Metadata } from "next";
import { PartnerAdmin } from "@/components/admin/partner-admin";
import { requireStaff } from "@/lib/auth";
import { getPartnersForAdmin } from "@/lib/partners/queries";

export const metadata: Metadata = { title: "Partners and placements", robots: { index: false } };

export default async function AdminPartnersPage() {
  await requireStaff();
  const partners = await getPartnersForAdmin();
  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Partners and placements</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Partners appear on /partners. A placement puts a partner in the right rail or between topic rows for a period. Counts are the last 30 days.
      </p>
      <div className="mt-8">
        <PartnerAdmin partners={partners} />
      </div>
    </main>
  );
}
