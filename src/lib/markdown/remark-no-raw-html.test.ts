import { compile } from "@mdx-js/mdx";
import remarkNoRawHtml from "./remark-no-raw-html";

const out = async (src: string) => String(await compile(src, { outputFormat: "function-body", remarkPlugins: [remarkNoRawHtml] }));

describe("remarkNoRawHtml", () => {
  it("removes script, iframe and other raw HTML", async () => {
    const js = await out('Hi\n\n<script>alert(2)</script>\n\n<iframe srcDoc="x"></iframe>\n\nText with <img src="x" /> inline');
    expect(js).not.toMatch(/"script"|"iframe"|"img"/);
    expect(js).toContain("Hi");
  });

  it("keeps markdown and our components", async () => {
    const js = await out('# Title\n\n[a link](https://gov.uk)\n\n<PerUnitCalculator label="x" before="1" after="2" />');
    expect(js).toContain("PerUnitCalculator");
    expect(js).toContain("https://gov.uk");
  });

  it("removes imports and exports", async () => {
    const js = await out('import x from "evil"\n\nexport const y = 1\n\nBody');
    expect(js).not.toContain("evil");
  });
});
