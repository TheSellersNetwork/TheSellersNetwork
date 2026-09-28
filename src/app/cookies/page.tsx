import type { Metadata } from "next";
import { LegalPage, loadLegal } from "@/components/legal/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const doc = await loadLegal("cookies");
  return { title: doc?.title, description: doc?.description, alternates: { canonical: "/cookies" } };
}

export default function Page() {
  return <LegalPage slug="cookies" />;
}
