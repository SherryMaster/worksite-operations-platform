import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BrandMark } from "@/components/brand-mark";

afterEach(cleanup);

describe("BrandMark", () => {
  it("exposes the product name to assistive technology and shows the logo image", () => {
    render(<BrandMark />);

    const wrapper = screen.getByRole("group", { name: "Worksite Operations" });
    expect(wrapper).toBeInTheDocument();
    const logo = wrapper.querySelector("img");
    expect(logo).not.toBeNull();
    expect(logo).toHaveAttribute("src", "/brand/worksite-mark.svg");
    expect(logo).toHaveAttribute("alt", "");
    expect(logo).toHaveAttribute("aria-hidden", "true");
  });

  it("hides only the written lockup in compact mode, not the logo image", () => {
    render(<BrandMark compact />);

    const wrapper = screen.getByRole("group", { name: "Worksite Operations" });
    const lockup = wrapper.querySelector("div");
    expect(lockup).not.toBeNull();
    expect(lockup).toHaveClass("sr-only");
    const logo = wrapper.querySelector("img");
    expect(logo).not.toBeNull();
    expect(logo).toHaveAttribute("src", "/brand/worksite-mark.svg");
  });
});
