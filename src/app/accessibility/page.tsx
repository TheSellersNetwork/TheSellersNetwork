import type { Metadata } from "next";
import { LegalPage, loadLegal } from "@/components/legal/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const doc = await loadLegal("accessibility");
  return { title: doc?.title, description: doc?.description, alternates: { canonical: "/accessibility" } };
}

export default function Page() {
  return <LegalPage slug="accessibility" />;
}
