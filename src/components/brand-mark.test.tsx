import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandMark } from "@/components/brand-mark";

function findWrapper(container: HTMLElement) {
  const wrapper = container.querySelector('[aria-label="Worksite Operations"]');
  if (!wrapper) throw new Error("BrandMark wrapper not found");
  return wrapper as HTMLElement;
}

describe("BrandMark", () => {
  it("exposes the product name to assistive technology and shows the logo image", () => {
    const { container } = render(<BrandMark />);

    const wrapper = findWrapper(container);
    expect(wrapper).toBeInTheDocument();
    const logo = wrapper.querySelector("img");
    expect(logo).not.toBeNull();
    expect(logo).toHaveAttribute("src", "/brand/worksite-mark.svg");
    expect(logo).toHaveAttribute("alt", "");
    expect(logo).toHaveAttribute("aria-hidden", "true");
  });

  it("hides only the written lockup in compact mode, not the logo image", () => {
    const { container } = render(<BrandMark compact />);

    const wrapper = findWrapper(container);
    const lockup = wrapper.querySelector("div");
    expect(lockup).not.toBeNull();
    expect(lockup).toHaveClass("sr-only");
    const logo = wrapper.querySelector("img");
    expect(logo).not.toBeNull();
    expect(logo).toHaveAttribute("src", "/brand/worksite-mark.svg");
  });
});
