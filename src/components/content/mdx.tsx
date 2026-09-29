import { Children, isValidElement } from "react";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import remarkNoRawHtml from "@/lib/markdown/remark-no-raw-html";
import { EmailSignupCard } from "@/components/marketing/email-signup-card";
import { OperatorDetails } from "@/components/legal/operator-details";
import { DownloadCard } from "@/components/tools/download-card";
import { TaxDates } from "@/components/tools/tax-dates";
import { PercentCalculator, PerUnitCalculator } from "@/components/tools/impact-calculators";
import { CopyHeadingLink } from "@/components/content/copy-heading-link";
import { DataTable, type DataTableCell, type DataTableRow } from "@/components/content/data-table";
import { isPickedRow } from "@/lib/content/table-sort";

/*
  Renders MDX content from the repo (guides, blog posts, course modules).
  Only a small set of components is exposed so the copy stays plain.
*/
const baseComponents = {
  a: (props: React.ComponentProps<"a">) => {
    const href = props.href ?? "";
    if (href.startsWith("/")) return <Link href={href}>{props.children}</Link>;
    return <a {...props} rel="noopener" />;
  },
  Signup: ({ source }: { source: string }) => <EmailSignupCard source={source} variant="inline" className="not-prose my-8" />,
  Download: ({ file }: { file: "bookkeeping" | "stock" | "sourcing" }) => <DownloadCard file={file} showGuide={false} className="my-8" />,
  OperatorDetails,
  PerUnitCalculator,
  PercentCalculator,
  TaxDates: () => <TaxDates count={4} compact className="my-8" />,
  Placeholder: ({ children }: { children: React.ReactNode }) => (
    <p className="not-prose my-4 rounded-md border border-dashed bg-secondary px-3 py-2 text-sm text-muted-foreground">[Draft note: {children}]</p>
  ),
};

type ElementWithChildren = React.ReactElement<{ children?: React.ReactNode; style?: React.CSSProperties; align?: string }>;

/* The plain text of a rendered node, for sorting, labels and pick matching. */
export function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) return nodeText((node as ElementWithChildren).props.children);
  return "";
}

function elements(node: React.ReactNode): ElementWithChildren[] {
  return Children.toArray(node).filter((c): c is ElementWithChildren => isValidElement(c));
}

function cellOf(el: ElementWithChildren): DataTableCell {
  const raw = el.props.style?.textAlign ?? el.props.align;
  const align = raw === "center" || raw === "right" ? raw : undefined;
  return { content: el.props.children ?? null, text: nodeText(el.props.children).trim(), align };
}

/*
  GFM tables arrive as <table><thead><tr><th/>...</tr></thead><tbody>...</tbody></table>.
  They are unpacked into header and row cells and handed to the client table.
*/
function makeTable(pick: string[]) {
  return function Table({ children }: { children?: React.ReactNode }) {
    const sections = elements(children);
    const head = sections.find((s) => s.type === "thead");
    const body = sections.find((s) => s.type === "tbody");
    const headRow = head ? elements(head.props.children)[0] : undefined;
    const headers = headRow ? elements(headRow.props.children).map(cellOf) : [];
    const rows: DataTableRow[] = body
      ? elements(body.props.children).map((tr) => {
          const cells = elements(tr.props.children).map(cellOf);
          return { cells, picked: pick.length > 0 && isPickedRow(cells[0]?.text ?? "", pick) };
        })
      : [];
    if (headers.length === 0) return <table>{children}</table>;
    return <DataTable headers={headers} rows={rows} />;
  };
}

function makeHeading(Tag: "h2" | "h3") {
  return function Heading({ id, children }: { id?: string; children?: React.ReactNode }) {
    if (!id) return <Tag>{children}</Tag>;
    return (
      <Tag id={id} className="group relative scroll-mt-[calc(var(--header-height)+1rem)]">
        {children}
        <CopyHeadingLink id={id} label={nodeText(children)} />
      </Tag>
    );
  };
}

const anchorComponents = { h2: makeHeading("h2"), h3: makeHeading("h3") };

/*
  `pick` highlights table rows naming a comparison post's pick. `anchors`
  adds a "Copy link" button to each h2 and h3 (blog posts and guides).
*/
export function Mdx({ source, pick = [], anchors = false }: { source: string; pick?: string[]; anchors?: boolean }) {
  const components = { ...baseComponents, table: makeTable(pick), ...(anchors ? anchorComponents : {}) };
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{ mdxOptions: { remarkPlugins: [remarkGfm, remarkNoRawHtml], rehypePlugins: [rehypeSlug] } }}
    />
  );
}

export function TableOfContents({ headings }: { headings: { depth: number; text: string; id: string }[] }) {
  if (headings.length < 2) return null;
  return (
    <nav aria-label="Contents" className="rounded-lg border bg-card p-4 text-sm">
      <h2 className="text-sm font-semibold">Contents</h2>
      <ol className="mt-2 space-y-1">
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? "pl-3" : ""}>
            <a href={`#${h.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
