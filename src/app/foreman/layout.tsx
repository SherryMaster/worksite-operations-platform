import { ForemanShell } from "@/components/foreman-shell";
import { requireRole } from "@/lib/auth/access";

export default async function ForemanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("FOREMAN");
  return <ForemanShell>{children}</ForemanShell>;
}
