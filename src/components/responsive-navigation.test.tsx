import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CeoNavigation } from "@/components/ceo-navigation";
import { ForemanNavigation } from "@/components/foreman-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/ceo",
}));

vi.mock("@/components/phase4/device-sign-out-button", () => ({
  DeviceSignOutButton: () => <button type="button">Sign out</button>,
}));

vi.mock("@/components/phase4/install-app-button", () => ({
  InstallAppButton: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("responsive role navigation", () => {
  it("keeps the complete CEO workspace in the desktop sidebar", () => {
    render(<CeoNavigation />);

    const navigation = screen.getByRole("navigation", {
      name: "CEO navigation",
    });
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /Payroll/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Audit/ })).toBeInTheDocument();
  });

  it("provides the primary CEO destinations and a More menu on mobile", () => {
    render(<CeoNavigation mobile />);

    expect(
      screen.getByRole("navigation", { name: "CEO mobile navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Attendance/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /More/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    expect(screen.getByRole("link", { name: /Leave/ })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Import center/ }),
    ).toBeInTheDocument();
  });

  it("keeps all Foreman workflows in both navigation layouts", () => {
    const { rerender } = render(<ForemanNavigation />);

    expect(
      screen.getByRole("navigation", { name: "Foreman navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Reports/ })).toBeInTheDocument();

    rerender(<ForemanNavigation mobile />);

    expect(
      screen.getByRole("link", { name: /Attendance/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Leave/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /More/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    expect(screen.getByRole("link", { name: /Reports/ })).toBeInTheDocument();
  });
});
