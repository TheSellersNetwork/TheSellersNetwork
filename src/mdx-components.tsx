import type { MDXComponents } from "mdx/types";

/*
  Components available to every MDX file. Guides, blog posts and course modules
  share these so headings and links look the same everywhere.
*/
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
