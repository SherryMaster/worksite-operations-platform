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
      className="inline-flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 disabled:cursor-wait disabled:opacity-70"
    >
      {installing ? (
        <LoaderCircle
          className="size-4 animate-spin text-violet-600"
          aria-hidden="true"
        />
      ) : (
        <Download className="size-4 text-violet-600" aria-hidden="true" />
      )}
      {installing ? "Opening install prompt…" : "Install app"}
    </button>
  );
}
