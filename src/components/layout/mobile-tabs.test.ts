import { describe, expect, it } from "vitest";
import { activeTab, tabBarHidden } from "@/components/layout/mobile-tabs";

describe("phone navigation bar", () => {
  it("marks the current tab", () => {
    expect(activeTab("/community", null)).toBe("forum");
    expect(activeTab("/community/t/some-topic/abc123", "sam")).toBe("forum");
    expect(activeTab("/community/pickups", null)).toBe("pickups");
    expect(activeTab("/community/pickups/bolo", null)).toBe("pickups");
    expect(activeTab("/community/new", "sam")).toBe("new");
    expect(activeTab("/community/notifications", "sam")).toBe("notifications");
    expect(activeTab("/community/u/sam", "sam")).toBe("you");
    expect(activeTab("/account", "sam")).toBe("you");
    expect(activeTab("/community/u/alex", "sam")).toBe("forum");
    expect(activeTab("/login", null)).toBe("signin");
    expect(activeTab("/signup", null)).toBe("join");
    expect(activeTab("/tools", null)).toBeNull();
    expect(activeTab("/communityx", null)).toBeNull();
  });

  it("stays off staff pages and the brand picker", () => {
    expect(tabBarHidden("/admin")).toBe(true);
    expect(tabBarHidden("/admin/flags")).toBe(true);
    expect(tabBarHidden("/brand")).toBe(true);
    expect(tabBarHidden("/onboarding")).toBe(true);
    expect(tabBarHidden("/community")).toBe(false);
    expect(tabBarHidden("/branding-guide")).toBe(false);
  });
});
