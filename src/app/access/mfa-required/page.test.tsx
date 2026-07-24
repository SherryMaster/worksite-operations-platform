import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({
    children,
    redirectUrl,
  }: {
    children: ReactNode;
    redirectUrl: string;
  }) => <div data-redirect-url={redirectUrl}>{children}</div>,
  UserProfile: () => <div>Account security settings</div>,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/access", () => ({
  destinationForAccess: vi.fn(),
  getCurrentAccess: vi.fn().mockResolvedValue({
    role: "FOREMAN",
    status: "MFA_REQUIRED",
  }),
}));

import MfaRequiredPage from "@/app/access/mfa-required/page";

describe("MfaRequiredPage", () => {
  it("starts a fresh sign-in after authenticator enrollment", async () => {
    render(await MfaRequiredPage());

    const button = screen.getByRole("button", {
      name: "Sign out and verify MFA",
    });

    expect(button.parentElement).toHaveAttribute(
      "data-redirect-url",
      "/sign-in",
    );
  });
});
