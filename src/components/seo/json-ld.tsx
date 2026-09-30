import { siteConfig } from "@/lib/site";

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
type PostLd = { text: string; dateCreated: string; author: Person; upvoteCount: number; url: string };

/* QAPage with acceptedAnswer for solved topics, DiscussionForumPosting otherwise. */
export function TopicJsonLd({
  title,
  url,
  question,
  answers,
  accepted,
  dateModified,
}: {
  title: string;
  url: string;
  question: PostLd;
  answers: PostLd[];
  accepted: PostLd | null;
  dateModified: string;
}) {
  if (accepted) {
    return (
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "QAPage",
          mainEntity: {
            "@type": "Question",
            name: title,
            text: question.text,
            dateCreated: question.dateCreated,
            author: { "@type": "Person", ...question.author },
            answerCount: answers.length,
            upvoteCount: question.upvoteCount,
            acceptedAnswer: {
              "@type": "Answer",
              text: accepted.text,
              dateCreated: accepted.dateCreated,
              upvoteCount: accepted.upvoteCount,
              url: abs(accepted.url),
              author: { "@type": "Person", ...accepted.author },
            },
            suggestedAnswer: answers
              .filter((a) => a.url !== accepted.url)
              .slice(0, 10)
              .map((a) => ({
                "@type": "Answer",
                text: a.text,
                dateCreated: a.dateCreated,
                upvoteCount: a.upvoteCount,
                url: abs(a.url),
                author: { "@type": "Person", ...a.author },
              })),
          },
        }}
      />
    );
  }
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        headline: title,
        url: abs(url),
        text: question.text,
        datePublished: question.dateCreated,
        dateModified,
        author: { "@type": "Person", ...question.author },
        interactionStatistic: {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/CommentAction",
          userInteractionCount: answers.length,
        },
        comment: answers.slice(0, 10).map((a) => ({
          "@type": "Comment",
          text: a.text,
          dateCreated: a.dateCreated,
          url: abs(a.url),
          author: { "@type": "Person", ...a.author },
        })),
      }}
    />
  );
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
