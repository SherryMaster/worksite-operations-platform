"use client";

import { WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";

export function ConnectionIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <span className="flex min-h-8 items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900">
      <WifiOff className="size-3.5" aria-hidden="true" />
      Offline
    </span>
  );
}
