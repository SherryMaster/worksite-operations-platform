"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

import { clearAttendanceDeviceData } from "@/lib/phase4/offline-store";

export function DeviceSignOutButton({
  variant = "icon",
}: {
  variant?: "icon" | "menu";
}) {
  return (
    <SignOutButton redirectUrl="/sign-in">
      <button
        type="button"
        onClick={() => void clearAttendanceDeviceData()}
        aria-label="Sign out and remove saved attendance from this device"
        className={
          variant === "menu"
            ? "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            : "grid size-10 touch-manipulation place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
        }
      >
        <LogOut className="size-4" aria-hidden="true" />
        {variant === "menu" ? "Sign out" : null}
      </button>
    </SignOutButton>
  );
}
