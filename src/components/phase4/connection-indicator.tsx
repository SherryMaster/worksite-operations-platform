"use client";

import { Wifi, WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";

export function ConnectionIndicator() {
  const online = useOnlineStatus();

  return (
    <span
      className={
        online
          ? "flex items-center gap-1.5 text-xs text-emerald-400"
          : "flex items-center gap-1.5 text-xs text-amber-300"
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
