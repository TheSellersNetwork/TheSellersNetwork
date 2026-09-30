import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "./layout";
import { noticeRequirements } from "@/lib/defamation/notice";

type Props = { reference: string; kind: string; forStaff: boolean; adminUrl?: string; missing?: string[] };

const replyTimes: Record<string, string> = {
  report: "We look at reports of illegal or harmful content as a priority, usually within 48 hours.",
  defamation:
    "Within two working days we will pass your complaint to the person who posted it, or remove the post if we cannot contact them, as the Defamation (Operators of Websites) Regulations 2013 set out. We will tell you what happens.",
  copyright: "We will look at your notice promptly and remove material that infringes.",
  data: "We will reply within one month, as UK data protection law requires.",
  complaint: "We will acknowledge your complaint within 30 days and tell you what we are doing about it.",
  appeal: "Someone who did not make the original decision will look at it, usually within 7 days.",
};

/* The receipt a sender gets, and the alert staff get. Neither repeats the message itself. */
export function ContactReceivedEmail({ reference, kind, forStaff, adminUrl, missing }: Props) {
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
      {missing && missing.length > 0 ? (
        <>
          <Text style={emailStyles.text}>
            Your complaint does not yet meet the requirements for a notice of complaint under section 5(6) of the Defamation Act 2013 and regulation 2 of the Defamation (Operators of Websites) Regulations 2013. It is missing: {missing.join("; ")}.
          </Text>
          <Text style={emailStyles.text}>A notice of complaint must include: {noticeRequirements.join("; ")}.</Text>
          <Text style={emailStyles.text}>You can send a complete notice using the report form. We may still look at the post under our house rules.</Text>
        </>
      ) : (
        <Text style={emailStyles.text}>{replyTimes[kind] ?? "We read every message and reply as soon as we can."}</Text>
      )}
    </EmailLayout>
  );
}

export default ContactReceivedEmail;
