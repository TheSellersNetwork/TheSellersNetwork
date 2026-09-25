import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "./layout";

type Props = { actorName: string; topicTitle: string; snippet: string; url: string };

export function MentionEmail({ actorName, topicTitle, snippet, url }: Props) {
  return (
    <EmailLayout preview={`${actorName} mentioned you in ${topicTitle}`}>
      <Heading style={emailStyles.heading}>{actorName} mentioned you</Heading>
      <Text style={emailStyles.text}>In {topicTitle}</Text>
      <Text style={emailStyles.quote}>{snippet}</Text>
      <Button href={url} style={emailStyles.button}>
        See the post
      </Button>
    </EmailLayout>
  );
}

export default MentionEmail;
