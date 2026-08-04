import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CeoError from "@/app/ceo/error";
import AppError from "@/app/error";
import ForemanError from "@/app/foreman/error";
import GlobalError from "@/app/global-error";

const recovery = vi.hoisted(() => vi.fn());

vi.mock("@/components/workspace-error-recovery", () => ({
  WorkspaceErrorRecovery: (properties: Record<string, unknown>) => {
    recovery(properties);
    return <div data-testid="recovery">{String(properties.description)}</div>;
  },
}));

afterEach(() => {
  cleanup();
  recovery.mockClear();
});

describe("workspace error boundary hierarchy", () => {
  it("uses a CEO segment recovery state without invoking reset on render", () => {
    const reset = vi.fn();
    render(
      <CeoError
        error={Object.assign(new Error(), { digest: "ceo-ref" })}
        reset={reset}
      />,
    );

    expect(screen.getByTestId("recovery")).toHaveTextContent(
      "workspace navigation and account controls remain available",
    );
    expect(recovery).toHaveBeenCalledWith(
      expect.objectContaining({ compact: true, reference: "ceo-ref" }),
    );
    expect(reset).not.toHaveBeenCalled();
  });

  it("uses a Foreman segment state that preserves device attendance", () => {
    render(<ForemanError error={new Error()} reset={vi.fn()} />);
    expect(screen.getByTestId("recovery")).toHaveTextContent(
      "remain in the queue and will not be cleared",
    );
  });

  it("keeps shared recovery beneath a healthy root layout", () => {
    render(
      <AppError
        error={Object.assign(new Error(), { digest: "root-ref" })}
        reset={vi.fn()}
      />,
    );
    expect(recovery).toHaveBeenCalledWith(
      expect.objectContaining({ reference: "root-ref" }),
    );
  });

  it("renders root-provider recovery without the shared provider component", () => {
    render(
      <GlobalError
        error={Object.assign(new Error(), { digest: "global-ref" })}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByText("Worksite needs a reload")).toBeVisible();
    expect(screen.getByText("Reference: global-ref")).toBeVisible();
    expect(recovery).not.toHaveBeenCalled();
  });
});
