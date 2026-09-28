/* The wording shown next to every newsletter sign-up button, stored with each sign-up as the record of consent. */
export const NEWSLETTER_CONSENT =
  "Free newsletter: seller news, fee and policy changes and the best of the forum, about once a week. Unsubscribe from any email.";

/* Headers every newsletter email must carry so mail apps show a one-click unsubscribe (RFC 8058). */
export function unsubscribeHeaders(siteUrl: string, token: string): Record<string, string> {
  const url = `${siteUrl}/newsletter/unsubscribe?token=${token}`;
  return { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}
