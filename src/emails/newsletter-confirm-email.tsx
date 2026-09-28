import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, emailStyles } from "./layout";

type Props = { confirmUrl: string };

export function NewsletterConfirmEmail({ confirmUrl }: Props) {
  return (
    <EmailLayout preview="Confirm your newsletter sign-up">
      <Heading style={emailStyles.heading}>Confirm your sign-up</Heading>
      <Text style={emailStyles.text}>
        Someone, hopefully you, asked to get The Sellers Network newsletter at this address: seller news, fee and policy changes and the best of the forum, free.
      </Text>
      <Button href={confirmUrl} style={emailStyles.button}>
        Yes, sign me up
      </Button>
      <Text style={emailStyles.text}>If it was not you, ignore this email and you will not hear from us again.</Text>
    </EmailLayout>
  );
}

export default NewsletterConfirmEmail;
