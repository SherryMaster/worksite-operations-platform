import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WorkerAvatar } from "@/components/worker-avatar";

afterEach(cleanup);

describe("WorkerAvatar", () => {
  it("renders the authorized worker photo route when a photo exists", () => {
    const { container } = render(
      <WorkerAvatar name="Ahmed Khan" workerId="worker-1" photoId="photo-1" />,
    );

    expect(
      screen.getByRole("img", { name: "Profile photo for Ahmed Khan" }),
    ).toBeInTheDocument();
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "/api/workers/worker-1/documents/photo-1",
    );
  });

  it("falls back to initials when the photo request fails", () => {
    const { container } = render(
      <WorkerAvatar
        name="Muhammad Abbas"
        workerId="worker-2"
        photoId="photo-2"
      />,
    );

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("MA")).toBeInTheDocument();
  });

  it("supports the larger worker-profile size", () => {
    render(<WorkerAvatar name="Ahmed Khan" workerId="worker-1" size="lg" />);

    expect(
      screen.getByRole("img", { name: "Profile photo for Ahmed Khan" }),
    ).toHaveClass("size-14", "text-base");
  });

  it("renders initials when no photo is available", () => {
    render(<WorkerAvatar name="Imran Khan" workerId="worker-3" />);

    expect(screen.getByText("IK")).toBeInTheDocument();
  });
});
