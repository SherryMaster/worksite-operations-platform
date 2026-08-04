"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  consumeServiceWorkerControllerChange,
  finishServiceWorkerUpdate,
  requestServiceWorkerUpdate,
} from "@/lib/phase4/service-worker-policy";

export function ServiceWorkerUpdate() {
  const { serwist } = useSerwist();
  const [state, setState] = useState<"idle" | "ready" | "updating">("idle");
  const updateRequested = useRef(false);

  useEffect(() => {
    if (!serwist) return;
    finishServiceWorkerUpdate(sessionStorage);

    const waiting = () => setState("ready");
    const controlling = () => {
      const persistedRequest =
        consumeServiceWorkerControllerChange(sessionStorage);
      if (!updateRequested.current && !persistedRequest) return;
      updateRequested.current = false;
      window.location.reload();
    };
    serwist.addEventListener("waiting", waiting);
    serwist.addEventListener("controlling", controlling);
    return () => {
      serwist.removeEventListener("waiting", waiting);
      serwist.removeEventListener("controlling", controlling);
    };
  }, [serwist]);

  if (state === "idle") return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-20 z-[80] mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-violet-200 bg-white p-3 shadow-xl md:bottom-4"
    >
      <RefreshCw
        className={state === "updating" ? "size-5 animate-spin" : "size-5"}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-950">
          {state === "updating"
            ? "Applying the update…"
            : "A new version is ready"}
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          Reload explicitly when ready. Attendance saved on this device remains
          intact.
        </p>
      </div>
      <button
        type="button"
        disabled={state === "updating"}
        onClick={() => {
          if (!serwist || state === "updating") return;
          updateRequested.current = true;
          requestServiceWorkerUpdate(sessionStorage);
          setState("updating");
          serwist.messageSkipWaiting();
        }}
        className="min-h-10 shrink-0 rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        Reload
      </button>
    </aside>
  );
}
