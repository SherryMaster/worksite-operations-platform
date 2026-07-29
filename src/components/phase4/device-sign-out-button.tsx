"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

import { clearAttendanceDeviceData } from "@/lib/phase4/offline-store";

export function DeviceSignOutButton() {
  return (
    <SignOutButton redirectUrl="/sign-in">
      <button
        type="button"
        onClick={() => void clearAttendanceDeviceData()}
        aria-label="Sign out and remove saved attendance from this device"
        className="grid size-11 touch-manipulation place-items-center rounded-xl border border-violet-100 bg-white text-slate-500 shadow-sm hover:border-violet-200 hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </SignOutButton>
  );
}
