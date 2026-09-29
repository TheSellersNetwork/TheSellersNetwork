import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { urls } from "@/lib/forum/urls";

/* The words on the left of the home page hero. */
export function HeroCopy({ signedIn }: { signedIn: boolean }) {
  return (
    <div>
      <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">The free forum for UK resellers, whatever you sell on.</h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">
        Post your pickups, check sold comps before you buy, work out the FVF before you list, and ask the questions that do not fit in a comment section. eBay, Amazon, Vinted, Whatnot, car boots and everything in between.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={signedIn ? urls.newTopic() : urls.signup()}>{signedIn ? "Start a topic" : "Join free"}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={urls.community()}>
            Explore the forums
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <li>No selling in the threads</li>
        <li>No links to your listings</li>
        <li>Real numbers welcome</li>
        <li>
          <Link href={urls.rules()} className="text-foreground underline underline-offset-2 hover:text-brand">
            House rules
          </Link>
        </li>
      </ul>
    </div>
  );
}
