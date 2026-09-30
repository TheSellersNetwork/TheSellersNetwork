import { render, screen } from "@testing-library/react";
import { DefamationNoticePanel, type StoredNotice } from "./defamation-notice-panel";

vi.mock("@/app/admin/messages/actions", () => ({ updateDefamationNotice: vi.fn() }));

const notice: StoredNotice = {
  id: "00000000-0000-0000-0000-000000000001",
  message_id: "00000000-0000-0000-0000-000000000002",
  complainant_name: "Sam Example",
  complainant_email: "sam@example.test",
  statement: "The words complained of",
  statement_url: "https://example.test/community/t/a/abc#post-2",
  meaning: "That I sell fakes",
  inaccuracies: "All of it",
  insufficient_info_confirmed: true,
  consent_share_name: false,
  consent_share_email: false,
  previous_removals: false,
  previous_details: null,
  received_at: "2026-10-20T10:00:00Z",
  poster_contactable: true,
  poster_notified_at: "2026-10-21T10:00:00Z",
  complainant_acknowledged_at: null,
  poster_response: null,
  poster_response_at: null,
  outcome: null,
  outcome_at: null,
  complainant_informed_at: null,
};

describe("DefamationNoticePanel", () => {
  it("shows validity, the poster's deadline and a template without the complainant's details", () => {
    render(<DefamationNoticePanel notice={notice} />);
    expect(screen.getByText("Valid notice of complaint")).toBeInTheDocument();
    expect(screen.getAllByText(/midnight at the end of Monday 26 October 2026/).length).toBeGreaterThan(0);
    const template = screen.getByLabelText(/Notification to the poster/) as HTMLTextAreaElement;
    expect(template.value).not.toContain("sam@example.test");
    expect(template.value).toContain("midnight at the end of Monday 26 October 2026");
  });

  it("marks an incomplete notice", () => {
    render(<DefamationNoticePanel notice={{ ...notice, insufficient_info_confirmed: false }} />);
    expect(screen.getByText("Not a valid notice")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Notification to the poster/)).toBeNull();
  });
});
