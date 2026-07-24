import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandMark } from "@/components/brand-mark";

describe("BrandMark", () => {
  it("exposes the product name to assistive technology", () => {
    render(<BrandMark compact />);

    expect(screen.getByLabelText("Worksite Operations")).toBeInTheDocument();
  });
});
