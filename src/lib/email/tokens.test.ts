import { describe, expect, it } from "vitest";
import { signUnsubscribeToken, unsubscribeFor, verifyUnsubscribeToken } from "./tokens";

const secret = "test-secret-not-real";
const user = "5b0f8a2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b";
const other = "6c1a9b3f-2d4e-4f60-9b0c-1d2e3f4a5b6c";

describe("unsubscribe tokens", () => {
  it("round-trips", () => {
    const token = signUnsubscribeToken(secret, user, "digest");
    expect(verifyUnsubscribeToken(secret, token)).toEqual({ userId: user, kind: "digest" });
  });

  it("rejects a token pointed at another member or email type", () => {
    const [, kind, sig] = signUnsubscribeToken(secret, user, "digest").split(".");
    expect(verifyUnsubscribeToken(secret, `${other}.${kind}.${sig}`)).toBeNull();
    expect(verifyUnsubscribeToken(secret, `${user}.fees.${sig}`)).toBeNull();
  });

  it("rejects a different secret, junk and a missing secret", () => {
    const token = signUnsubscribeToken(secret, user, "fees");
    expect(verifyUnsubscribeToken("another-secret", token)).toBeNull();
    expect(verifyUnsubscribeToken("", token)).toBeNull();
    expect(verifyUnsubscribeToken(secret, "nonsense")).toBeNull();
    expect(verifyUnsubscribeToken(secret, `${token}.extra`)).toBeNull();
    expect(verifyUnsubscribeToken(secret, null)).toBeNull();
  });

  it("builds a one-click link and headers", () => {
    const { url, headers } = unsubscribeFor("https://example.test", secret, user, "digest");
    expect(url.startsWith("https://example.test/email/unsubscribe?token=")).toBe(true);
    expect(headers["List-Unsubscribe"]).toBe(`<${url}>`);
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("refuses to sign without a secret", () => {
    expect(() => signUnsubscribeToken("", user, "digest")).toThrow();
  });
});
