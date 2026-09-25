import { render, screen } from "@testing-library/react";
import { Logo } from "./logo";

describe("Logo", () => {
  it("renders the wordmark", () => {
    render(<Logo />);
    expect(screen.getByText("The Sellers Network")).toBeInTheDocument();
  });

  it("omits the mark when asked", () => {
    const { container } = render(<Logo mark="none" />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("hides the mark from assistive tech", () => {
    const { container } = render(<Logo mark="nodes" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
