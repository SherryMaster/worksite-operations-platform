import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceErrorRecovery } from "@/components/workspace-error-recovery";

const clerkState = vi.hoisted(() => ({
  getToken: vi.fn(),
  isLoaded: true,
  isSignedIn: true,
}));
const navigateToSignIn = vi.hoisted(() => vi.fn());
const reloadCurrentApplication = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({ useAuth: () => clerkState }));
vi.mock("@/lib/auth/return-path", () => ({
  navigateToSignIn,
  reloadCurrentApplication,
}));

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

function renderRecovery(reset = vi.fn()) {
  render(
    <WorkspaceErrorRecovery
      description="Company data could not be loaded."
      reference="3643548078"
      reset={reset}
      title="Workspace unavailable"
    />,
  );
  return reset;
}

beforeEach(() => {
  clerkState.getToken.mockReset();
  clerkState.getToken.mockResolvedValue("fresh-token");
  clerkState.isLoaded = true;
  clerkState.isSignedIn = true;
  navigateToSignIn.mockReset();
  reloadCurrentApplication.mockReset();
  setOnline(true);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  window.history.replaceState({}, "", "/ceo/workers?page=2");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WorkspaceErrorRecovery", () => {
  it("force-refreshes the Clerk token once before retrying the segment", async () => {
    const user = userEvent.setup();
    const reset = renderRecovery();

    await user.click(
      screen.getByRole("button", { name: "Refresh session and retry" }),
    );

    await waitFor(() => {
      expect(clerkState.getToken).toHaveBeenCalledTimes(1);
      expect(clerkState.getToken).toHaveBeenCalledWith({ skipCache: true });
      expect(reset).toHaveBeenCalledTimes(1);
    });
  });

  it("locks a pending refresh against double submission", async () => {
    let resolveToken: (token: string) => void = () => undefined;
    clerkState.getToken.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveToken = resolve;
      }),
    );
    const user = userEvent.setup();
    const reset = renderRecovery();
    const button = screen.getByRole("button", {
      name: "Refresh session and retry",
    });

    await user.dblClick(button);
    expect(clerkState.getToken).toHaveBeenCalledTimes(1);
    resolveToken("fresh-token");
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
  });

  it("disables recovery while Clerk is still loading", () => {
    clerkState.isLoaded = false;
    renderRecovery();

    expect(
      screen.getByRole("button", { name: "Checking session…" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking your secure session",
    );
  });

  it("treats offline status as a hint and remains actionable", async () => {
    setOnline(false);
    const user = userEvent.setup();
    renderRecovery();

    await user.click(
      screen.getByRole("button", { name: "Refresh session and retry" }),
    );

    expect(clerkState.getToken).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Online status is only a hint",
    );
    expect(
      screen.getByRole("button", { name: "Try session refresh again" }),
    ).toBeEnabled();
  });

  it("shows refresh failure controls without automatically reloading", async () => {
    clerkState.getToken.mockRejectedValue(new TypeError("DNS failed"));
    const user = userEvent.setup();
    renderRecovery();

    await user.click(
      screen.getByRole("button", { name: "Refresh session and retry" }),
    );

    expect(
      await screen.findByText(/could not reach the account service/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Try session refresh again" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeVisible();
    expect(reloadCurrentApplication).not.toHaveBeenCalled();
  });

  it("sends a signed-out browser to one validated internal return path", async () => {
    clerkState.isSignedIn = false;
    const user = userEvent.setup();
    renderRecovery();

    await user.click(
      screen.getByRole("button", { name: "Refresh session and retry" }),
    );

    expect(navigateToSignIn).toHaveBeenCalledTimes(1);
    expect(navigateToSignIn).toHaveBeenCalledWith("/ceo/workers?page=2");
  });

  it("reloads only after an explicit click", async () => {
    const user = userEvent.setup();
    renderRecovery();
    expect(reloadCurrentApplication).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Reload application" }),
    );

    expect(reloadCurrentApplication).toHaveBeenCalledTimes(1);
  });

  it("shows only the safe reference and announces state changes", async () => {
    setOnline(false);
    const user = userEvent.setup();
    renderRecovery();

    expect(screen.getByText("Reference: 3643548078")).toBeVisible();
    expect(screen.queryByText(/stack|JWT claims/i)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Refresh session and retry" }),
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
  });
});
