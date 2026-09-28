import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "./layout";

type Props = { reference: string; kind: string; forStaff: boolean; adminUrl?: string };

const replyTimes: Record<string, string> = {
  report: "We look at reports of illegal or harmful content as a priority, usually within 48 hours.",
  defamation: "We will pass your complaint to the person who posted it within 48 hours, as the law sets out, and tell you what happens.",
  copyright: "We will look at your notice promptly and remove material that infringes.",
  data: "We will reply within one month, as UK data protection law requires.",
  complaint: "We will acknowledge your complaint within 30 days and tell you what we are doing about it.",
  appeal: "Someone who did not make the original decision will look at it, usually within 7 days.",
};

/* The receipt a sender gets, and the alert staff get. Neither repeats the message itself. */
export function ContactReceivedEmail({ reference, kind, forStaff, adminUrl }: Props) {
  if (forStaff) {
    return (
      <EmailLayout preview={`New ${kind} message ${reference}`}>
        <Heading style={emailStyles.heading}>New {kind} message</Heading>
        <Text style={emailStyles.text}>Reference {reference}. Open the admin page to read and handle it.</Text>
        {adminUrl ? (
          <Button href={adminUrl} style={emailStyles.button}>
            Open messages
          </Button>
        ) : null}
      </EmailLayout>
    );
  }
  return (
    <EmailLayout preview={`We have your message (${reference})`}>
      <Heading style={emailStyles.heading}>We have your message</Heading>
      <Text style={emailStyles.text}>Your reference is {reference}. Quote it if you get in touch about this again.</Text>
      <Text style={emailStyles.text}>{replyTimes[kind] ?? "We read every message and reply as soon as we can."}</Text>
    </EmailLayout>
  );
}

export default ContactReceivedEmail;
