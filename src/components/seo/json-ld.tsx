import { siteConfig } from "@/lib/site";
import { topicStructuredData } from "@/lib/forum/seo";

function abs(url: string): string {
  return url.startsWith("http") ? url : `${siteConfig.url}${url}`;
}

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: abs(item.url),
        })),
      }}
    />
  );
}

type Person = { name: string; url: string };

/* Google's forum markup for a topic: QAPage once an answer is accepted, DiscussionForumPosting otherwise. The rules live in lib/forum/seo. */
export function TopicJsonLd(props: Parameters<typeof topicStructuredData>[0]) {
  return <JsonLd data={topicStructuredData(props)} />;
}

export function ArticleJsonLd({ title, description, url, datePublished, dateModified, author, image }: { title: string; description: string; url: string; datePublished: string; dateModified?: string; author: Person; image?: string }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        url: abs(url),
        datePublished,
        dateModified: dateModified ?? datePublished,
        author: { "@type": "Person", ...author },
        publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
        ...(image ? { image: abs(image) } : {}),
      }}
    />
  );
}

/* A free tool that runs in the browser. Price 0 in pounds; nothing else is claimed (no ratings, no user counts). */
export function WebApplicationJsonLd({ name, description, url, category = "UtilitiesApplication" }: { name: string; description: string; url: string; category?: "UtilitiesApplication" | "BusinessApplication" }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name,
        description,
        url: abs(url),
        applicationCategory: category,
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        inLanguage: "en-GB",
        offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
        publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
      }}
    />
  );
}

/* FAQPage for questions answered on the page itself. Answers must match the visible text. */
export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }}
    />
  );
}
