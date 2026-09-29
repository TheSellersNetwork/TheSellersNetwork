import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
  Refreshes the Supabase session cookie on every request so Server Components
  always see a current user. No redirects happen here; page-level gates decide
  what a signed-out visitor can see.
*/
export async function proxy(request: NextRequest) {
  /*
    The embeddable calculator (/embed/*) lives in other sites' iframes: no
    session, no cookies. The root layout reads x-tsn-embed (the theme) to leave
    out the site header, footer, analytics and cookie banner. Anyone sending
    that header to another page has it removed.
  */
  const headers = new Headers(request.headers);
  headers.delete("x-tsn-embed");
  if (/^\/embed(\/|$)/.test(request.nextUrl.pathname)) {
    headers.set("x-tsn-embed", request.nextUrl.searchParams.get("theme") === "dark" ? "dark" : "light");
    return NextResponse.next({ request: { headers } });
  }
  if (request.headers.has("x-tsn-embed")) return NextResponse.next({ request: { headers } });

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wasm|onnx|mjs)$).*)"],
};
