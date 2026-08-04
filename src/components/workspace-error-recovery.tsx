"use client";

import { useAuth } from "@clerk/nextjs";
import {
  LoaderCircle,
  LogIn,
  RefreshCw,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  navigateToSignIn,
  reloadCurrentApplication,
} from "@/lib/auth/return-path";

type RecoveryState =
  | "idle"
  | "offline"
  | "refresh-failed"
  | "refreshing"
  | "reloading"
  | "signed-out";

export function WorkspaceErrorRecovery({
  compact = false,
  description,
  reference,
  reset,
  title,
}: {
  compact?: boolean;
  description: string;
  reference?: string;
  reset: () => void;
  title: string;
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<RecoveryState>("idle");
  const locked = useRef(false);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const pending = state === "refreshing" || state === "reloading";

  useEffect(() => {
    if (state !== "idle") statusRef.current?.focus();
  }, [state]);

  useEffect(() => {
    console.error("workspace_render_failed", {
      event: "workspace_render_failed",
      reference,
    });
  }, [reference]);

  function currentReturnPath() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function goToSignIn() {
    if (locked.current) return;
    locked.current = true;
    setState("signed-out");
    navigateToSignIn(currentReturnPath());
  }

  async function refreshSession() {
    if (locked.current || !isLoaded) return;
    if (!navigator.onLine) {
      setState("offline");
      return;
    }
    if (!isSignedIn) {
      goToSignIn();
      return;
    }

    locked.current = true;
    setState("refreshing");
    try {
      const token = await getToken({ skipCache: true });
      if (!token) {
        locked.current = false;
        goToSignIn();
        return;
      }
      reset();
    } catch (error) {
      console.error("workspace_recovery_failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        event: "workspace_recovery_failed",
        onlineHint: navigator.onLine,
        reference,
        stage: "clerk_token_refresh",
      });
      locked.current = false;
      setState(navigator.onLine ? "refresh-failed" : "offline");
    }
  }

  function reloadApplication() {
    if (locked.current) return;
    locked.current = true;
    setState("reloading");
    reloadCurrentApplication();
  }

  const status = !isLoaded
    ? "Checking your secure session…"
    : state === "refreshing"
      ? "Refreshing your secure session before retrying…"
      : state === "offline"
        ? "This device appears offline. Online status is only a hint; retry when the connection is stable."
        : state === "signed-out"
          ? "Your session is signed out. Opening the secure sign-in page…"
          : state === "refresh-failed"
            ? "The session refresh could not reach the account service. You can try once more, reload, or sign in again."
            : state === "reloading"
              ? "Reloading the application…"
              : "Refresh the secure session, then retry this page.";

  return (
    <section
      className={
        compact
          ? "mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          : "w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      }
      aria-labelledby="workspace-error-title"
    >
      <p className="text-xs font-semibold text-violet-700">
        Something went wrong
      </p>
      <h1
        id="workspace-error-title"
        className="mt-2 font-heading text-2xl font-semibold sm:text-3xl"
      >
        {title}
      </h1>
      <p className="mt-3 leading-7 text-slate-600">{description}</p>
      {reference ? (
        <p className="mt-4 text-[0.6875rem] font-mono text-slate-500">
          Reference: {reference}
        </p>
      ) : null}
      <p
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {state === "offline" ? (
          <WifiOff className="mr-2 inline size-4" aria-hidden="true" />
        ) : null}
        {status}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {state === "signed-out" ? (
          <Button onClick={goToSignIn} disabled={pending} size="lg">
            <LogIn aria-hidden="true" />
            Sign in again
          </Button>
        ) : (
          <Button
            onClick={() => void refreshSession()}
            disabled={!isLoaded || pending}
            size="lg"
            className="bg-violet-700 text-white hover:bg-violet-800"
          >
            {state === "refreshing" || !isLoaded ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {state === "refresh-failed" || state === "offline"
              ? "Try session refresh again"
              : !isLoaded
                ? "Checking session…"
                : "Refresh session and retry"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={reloadApplication}
        >
          <RotateCcw aria-hidden="true" />
          Reload application
        </Button>
        {state === "refresh-failed" ? (
          <Button type="button" variant="ghost" size="lg" onClick={goToSignIn}>
            <LogIn aria-hidden="true" />
            Sign in again
          </Button>
        ) : null}
      </div>
    </section>
  );
}
