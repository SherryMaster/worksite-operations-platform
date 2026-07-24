import { CeoShell } from "@/components/ceo-shell";
import { requireRole } from "@/lib/auth/access";

export default async function CeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("CEO");
  return <CeoShell>{children}</CeoShell>;
}
