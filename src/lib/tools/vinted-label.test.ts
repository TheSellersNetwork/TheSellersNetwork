import { describe, expect, it } from "vitest";
import { vintedCarriers, vintedFaqs, vintedLabelPage, vintedPrintSteps } from "./vinted-label";
import { toolGroups } from "./catalogue";

const allCopy = [
  vintedLabelPage.title,
  vintedLabelPage.description,
  vintedLabelPage.intro,
  ...vintedPrintSteps.flatMap((s) => [s.title, s.detail]),
  ...vintedCarriers.flatMap((c) => [c.name, c.label, c.detail]),
  ...vintedFaqs.flatMap((f) => [f.question, f.answer]),
];

describe("Vinted label cropper copy", () => {
  it("has a search title under 60 characters that leads with the main phrase", () => {
    expect(vintedLabelPage.title.length).toBeLessThan(60);
    expect(vintedLabelPage.title.toLowerCase()).toContain("vinted label cropper");
  });

  it("has a meta description of about 150 characters", () => {
    expect(vintedLabelPage.description.length).toBeGreaterThanOrEqual(120);
    expect(vintedLabelPage.description.length).toBeLessThanOrEqual(160);
  });

  it("has 6 to 10 FAQs, each a question with an answer", () => {
    expect(vintedFaqs.length).toBeGreaterThanOrEqual(6);
    expect(vintedFaqs.length).toBeLessThanOrEqual(10);
    for (const f of vintedFaqs) {
      expect(f.question.endsWith("?")).toBe(true);
      expect(f.answer.length).toBeGreaterThan(20);
    }
    expect(new Set(vintedFaqs.map((f) => f.question)).size).toBe(vintedFaqs.length);
  });

  it("follows house style: no em dashes, no exclamation marks, no placeholders", () => {
    for (const text of allCopy) {
      expect(text).not.toMatch(/—/);
      expect(text).not.toContain("!");
      expect(text).not.toMatch(/\[TOM:/);
    }
  });

  it("links every carrier note to an https source", () => {
    for (const c of vintedCarriers) {
      expect(c.source.length).toBeGreaterThan(0);
      for (const s of c.source) expect(s.href).toMatch(/^https:\/\/(www\.vinted\.co\.uk|inpost\.co\.uk)\//);
    }
  });

  it("is in the tools catalogue next to the general cropper", () => {
    const hrefs = toolGroups.flatMap((g) => g.tools.map((t) => t.href));
    expect(hrefs).toContain(vintedLabelPage.path);
    expect(hrefs.indexOf(vintedLabelPage.path)).toBe(hrefs.indexOf("/tools/label-cropper") + 1);
  });
});
