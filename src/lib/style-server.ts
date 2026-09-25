import "server-only";
import { cookies } from "next/headers";
import { defaultStyle, isStyleId, STYLE_COOKIE, type StyleId } from "@/lib/style";

/* The style for this request: the member's cookie, else the site default. */
export async function currentStyle(): Promise<StyleId> {
  try {
    const value = (await cookies()).get(STYLE_COOKIE)?.value;
    return isStyleId(value) ? value : defaultStyle();
  } catch {
    return defaultStyle();
  }
}
