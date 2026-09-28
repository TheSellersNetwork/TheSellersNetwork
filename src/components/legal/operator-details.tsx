import Link from "next/link";
import { siteConfig } from "@/lib/site";

/* Who runs the site (E-Commerce Regulations 2002, reg 6). Shows only what has been set in the environment. */
export function OperatorDetails() {
  const l = siteConfig.legal;
  const hasDetails = l.operator || l.address || l.email;
  return (
    <div className="space-y-1">
      <p>
        The Sellers Network{l.operator ? ` is run by ${l.operator}` : ""}.
      </p>
      {l.address ? <p>Address: {l.address}</p> : null}
      {l.companyNumber ? <p>Company number: {l.companyNumber}</p> : null}
      {l.icoNumber ? <p>Registered with the Information Commissioner&rsquo;s Office: {l.icoNumber}</p> : null}
      {l.email ? (
        <p>
          Email: <a href={`mailto:${l.email}`}>{l.email}</a>
        </p>
      ) : null}
      <p>
        {hasDetails ? "You can also reach us through the " : "The quickest way to reach us is the "}
        <Link href="/contact">contact form</Link>.
      </p>
    </div>
  );
}
