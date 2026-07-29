"use client";

import { Wifi, WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";

export function ConnectionIndicator() {
  const online = useOnlineStatus();

  return (
    <span
      className={
        online
          ? "flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
          : "flex min-h-9 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-xs font-semibold text-amber-800"
      }
    >
      {online ? (
        <Wifi className="size-3.5" aria-hidden="true" />
      ) : (
        <WifiOff className="size-3.5" aria-hidden="true" />
      )}
      {online ? "Online" : "Offline"}
    </span>
  );
}
