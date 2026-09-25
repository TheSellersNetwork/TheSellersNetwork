import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "./layout";

type Props = { actorName: string; topicTitle: string; snippet: string; url: string };

export function ReplyEmail({ actorName, topicTitle, snippet, url }: Props) {
  return (
    <EmailLayout preview={`${actorName} replied in ${topicTitle}`}>
      <Heading style={emailStyles.heading}>{actorName} replied to a topic you are watching</Heading>
      <Text style={emailStyles.text}>{topicTitle}</Text>
      <Text style={emailStyles.quote}>{snippet}</Text>
      <Button href={url} style={emailStyles.button}>
        Read the reply
      </Button>
    </EmailLayout>
  );
}

export default ReplyEmail;
