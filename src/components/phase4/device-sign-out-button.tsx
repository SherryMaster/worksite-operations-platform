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
        className="grid size-8 touch-manipulation place-items-center border border-stone-700 text-stone-300 hover:border-stone-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </SignOutButton>
  );
}
