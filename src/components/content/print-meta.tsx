import { siteConfig } from "@/lib/site";

/*
  Printed at the top of a guide or post only: where it came from and how
  current it is, so a printout or PDF still makes sense on its own.
*/
export function PrintMeta({ path, published, updated }: { path: string; published: string | null; updated: string | null }) {
  const url = `${siteConfig.url.replace(/\/$/, "")}${path}`;
  return (
    <div className="print-meta hidden print:block" data-testid="print-meta">
      <p>
        {siteConfig.name}: {url}
      </p>
      {published ? (
        <p>
          Published {published}
          {updated ? `. Last updated ${updated}` : ""}. Printed from the website; check it for the latest version.
        </p>
      ) : null}
    </div>
  );
}
