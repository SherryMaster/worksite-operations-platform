"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    function capturePrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);

  if (!prompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") setPrompt(null);
      }}
      className="mt-3 inline-flex min-h-10 items-center gap-2 border border-stone-700 px-3 text-xs font-semibold text-stone-200"
    >
      <Download className="size-4 text-amber-400" aria-hidden="true" />
      Install attendance app
    </button>
  );
}
