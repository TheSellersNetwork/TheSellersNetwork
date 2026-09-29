import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "./layout";

type Item = { title: string; url: string; note?: string };

type Props = {
  replies: Item[];
  topics: Item[];
  numbers: Item | null;
  unsubscribeUrl: string;
  settingsUrl: string;
};

const listItem = { fontSize: 15, color: "#14342f", lineHeight: 1.5, margin: "0 0 10px" } as const;
const note = { fontSize: 13, color: "#6b7a78" } as const;
const link = { color: "#0f766e", textDecoration: "underline" } as const;

/* The weekly digest. Plain and short: replies first, then new topics, then the numbers thread. */
export function WeeklyDigestEmail({ replies, topics, numbers, unsubscribeUrl, settingsUrl }: Props) {
  const preview = replies.length > 0 ? "New replies to your topics and what is new in the forums you follow" : "What is new in the forums and tags you follow";
  return (
    <EmailLayout preview={preview}>
      <Heading style={emailStyles.heading}>Your week in the forum</Heading>
      {replies.length > 0 ? (
        <Section>
          <Text style={{ ...emailStyles.text, fontWeight: 600, margin: "0 0 8px" }}>Replies to your topics</Text>
          {replies.map((r) => (
            <Text key={r.url} style={listItem}>
              <Link href={r.url} style={link}>
                {r.title}
              </Link>
              {r.note ? <span style={note}> {r.note}</span> : null}
            </Text>
          ))}
        </Section>
      ) : null}
      {topics.length > 0 ? (
        <Section style={{ marginTop: 12 }}>
          <Text style={{ ...emailStyles.text, fontWeight: 600, margin: "0 0 8px" }}>New in the forums and tags you follow</Text>
          {topics.map((t) => (
            <Text key={t.url} style={listItem}>
              <Link href={t.url} style={link}>
                {t.title}
              </Link>
              {t.note ? <span style={note}> {t.note}</span> : null}
            </Text>
          ))}
        </Section>
      ) : null}
      {numbers ? (
        <Section style={{ marginTop: 12 }}>
          <Text style={{ ...emailStyles.text, fontWeight: 600, margin: "0 0 8px" }}>This week&apos;s numbers thread</Text>
          <Text style={listItem}>
            <Link href={numbers.url} style={link}>
              {numbers.title}
            </Link>
          </Text>
        </Section>
      ) : null}
      <Text style={{ fontSize: 12, color: "#6b7a78", margin: "24px 0 0" }}>
        You asked for this weekly email in your account settings.{" "}
        <Link href={unsubscribeUrl} style={link}>
          Unsubscribe from the weekly digest
        </Link>{" "}
        or{" "}
        <Link href={settingsUrl} style={link}>
          change what you follow
        </Link>
        .
      </Text>
    </EmailLayout>
  );
}

export default WeeklyDigestEmail;
