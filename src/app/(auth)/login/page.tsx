import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : urls.community();
  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        New here?{" "}
        <Link href={urls.signup()} className="text-brand underline underline-offset-2 hover:text-brand-deep">
          Create an account
        </Link>
      </p>
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
    </main>
  );
}
