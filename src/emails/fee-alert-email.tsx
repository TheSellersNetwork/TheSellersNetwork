import { Button, Heading, Link, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "./layout";

type Props = {
  platform: string;
  title: string;
  summary: string;
  when: string | null;
  url: string;
  unsubscribeUrl: string;
  settingsUrl: string;
};

const link = { color: "#0f766e", textDecoration: "underline" } as const;

/* One fee or policy change, for members who asked to hear about that platform. */
export function FeeAlertEmail({ platform, title, summary, when, url, unsubscribeUrl, settingsUrl }: Props) {
  return (
    <EmailLayout preview={`${platform}: ${title}`}>
      <Text style={{ fontSize: 13, color: "#6b7a78", margin: "0 0 4px" }}>{platform} fee and policy change</Text>
      <Heading style={emailStyles.heading}>{title}</Heading>
      {when ? <Text style={{ ...emailStyles.text, margin: "0 0 8px" }}>{when}</Text> : null}
      {summary ? <Text style={emailStyles.quote}>{summary}</Text> : null}
      <Button href={url} style={emailStyles.button}>
        Read what changes
      </Button>
      <Text style={{ fontSize: 12, color: "#6b7a78", margin: "24px 0 0" }}>
        You asked for fee change alerts for {platform} in your account settings.{" "}
        <Link href={unsubscribeUrl} style={link}>
          Unsubscribe from fee change alerts
        </Link>{" "}
        or{" "}
        <Link href={settingsUrl} style={link}>
          choose different platforms
        </Link>
        .
      </Text>
    </EmailLayout>
  );
}

export default FeeAlertEmail;
