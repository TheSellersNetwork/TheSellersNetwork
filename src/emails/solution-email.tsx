import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "./layout";

type Props = { topicTitle: string; url: string };

export function SolutionEmail({ topicTitle, url }: Props) {
  return (
    <EmailLayout preview={`Your reply in ${topicTitle} was marked as the solution`}>
      <Heading style={emailStyles.heading}>Your reply was marked as the solution</Heading>
      <Text style={emailStyles.text}>In {topicTitle}. It now sits at the top of the thread with a green tick.</Text>
      <Button href={url} style={emailStyles.button}>
        See the topic
      </Button>
    </EmailLayout>
  );
}

export default SolutionEmail;
