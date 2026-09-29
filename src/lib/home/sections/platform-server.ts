import "server-only";
import { cookies } from "next/headers";
import { HOME_PLATFORM_COOKIE, parseHomePlatform, type HomePlatform } from "@/lib/home/sections/platform";

/* The visitor's "I sell on..." choice from the cookie, or "all". Reading it makes the page dynamic. */
export async function getHomePlatform(): Promise<HomePlatform> {
  return parseHomePlatform((await cookies()).get(HOME_PLATFORM_COOKIE)?.value);
}
