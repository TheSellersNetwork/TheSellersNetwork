import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/community/t/a/b?x=1#post-2")).toBe("/community/t/a/b?x=1#post-2");
  });
  it("refuses other sites dressed as paths", () => {
    for (const bad of ["//evil.test", "/\\evil.test", "https://evil.test", "javascript:alert(1)", "", null, 5]) {
      expect(safeNext(bad)).toBe("/community");
    }
  });
});
