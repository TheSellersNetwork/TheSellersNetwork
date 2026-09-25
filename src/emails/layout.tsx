import { Body, Container, Head, Html, Link, Preview, Text } from "@react-email/components";
import { siteConfig } from "@/lib/site";

/*
  Shared frame for every transactional email. Plain, calm, UK English.
  Colours are literal here because email clients cannot read CSS variables.
*/
export function EmailLayout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="en-GB">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f4f6f6", fontFamily: "Inter, -apple-system, Segoe UI, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 8, maxWidth: 560, padding: "32px" }}>
          <Text style={{ fontSize: 14, fontWeight: 600, margin: "0 0 24px", color: "#14342f" }}>{siteConfig.name}</Text>
          {children}
          <Text style={{ fontSize: 12, color: "#6b7a78", margin: "32px 0 0" }}>
            You are receiving this because of your notification settings.{" "}
            <Link href={`${siteConfig.url}/account`} style={{ color: "#0f766e" }}>
              Change them
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  heading: { fontSize: 18, fontWeight: 600, color: "#14342f", margin: "0 0 12px", lineHeight: 1.4 },
  text: { fontSize: 15, color: "#14342f", lineHeight: 1.6, margin: "0 0 16px" },
  quote: { fontSize: 15, color: "#3b4a48", lineHeight: 1.6, margin: "0 0 20px", padding: "12px 16px", borderLeft: "3px solid #0f766e", backgroundColor: "#f3f7f6" },
  button: { backgroundColor: "#0f766e", color: "#ffffff", fontSize: 15, fontWeight: 600, padding: "10px 18px", borderRadius: 6, textDecoration: "none", display: "inline-block" },
} as const;
