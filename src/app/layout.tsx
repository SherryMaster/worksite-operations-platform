import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import { cn } from "@/lib/utils";
import { WorksiteSerwistProvider } from "@/components/phase4/serwist-provider";

import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-worksite-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Worksite",
  },
  title: {
    default: "Worksite Operations",
    template: "%s · Worksite Operations",
  },
  description: "Secure construction workforce operations.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#6d28d9",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }} ui={ui}>
      <html
        lang="en"
        className={cn(sans.variable)}
        data-scroll-behavior="smooth"
        suppressHydrationWarning
      >
        <body>
          <WorksiteSerwistProvider>{children}</WorksiteSerwistProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
