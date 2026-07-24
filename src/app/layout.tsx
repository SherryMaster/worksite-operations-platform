import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Sans } from "next/font/google";

import { cn } from "@/lib/utils";
import { WorksiteSerwistProvider } from "@/components/phase4/serwist-provider";

import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-worksite-sans",
  weight: ["400", "500", "600"],
});

const heading = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-worksite-heading",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Worksite",
  },
  title: {
    default: "Worksite Operations",
    template: "%s · Worksite Operations",
  },
  description: "Secure construction workforce operations.",
  icons: {
    apple: "/icons/worksite-192.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <html
        lang="en"
        className={cn(sans.variable, heading.variable)}
        suppressHydrationWarning
      >
        <body>
          <WorksiteSerwistProvider>{children}</WorksiteSerwistProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
