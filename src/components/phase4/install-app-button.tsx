"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

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
      disabled={installing}
      onClick={async () => {
        setInstalling(true);
        try {
          await prompt.prompt();
          const choice = await prompt.userChoice;
          if (choice.outcome === "accepted") setPrompt(null);
        } finally {
          setInstalling(false);
        }
      }}
      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-800 disabled:cursor-wait disabled:opacity-70"
    >
      {installing ? (
        <LoaderCircle
          className="size-4 animate-spin text-violet-600"
          aria-hidden="true"
        />
      ) : (
        <Download className="size-4 text-violet-600" aria-hidden="true" />
      )}
      {installing ? "Opening install prompt…" : "Install Worksite App"}
    </button>
  );
}
