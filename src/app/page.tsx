import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/*
  Placeholder landing. The real landing page (three paths, email capture) is a
  week 2 task. This exists so the scaffold has a page to lint, test and audit.
*/
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <Logo size={32} />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">
        [TOM: landing headline]
      </h1>
      <p className="mt-4 measure text-lg text-muted-foreground">[TOM: landing standfirst]</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/community">Go to the community</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/blog">Read the blog</Link>
        </Button>
      </div>
    </main>
  );
}
