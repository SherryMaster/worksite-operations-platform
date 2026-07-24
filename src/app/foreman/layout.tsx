import { ForemanShell } from "@/components/foreman-shell";
import { requireRole } from "@/lib/auth/access";
import { getForemanWorkspace } from "@/lib/phase2/data";

export default async function ForemanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("FOREMAN");
  const project = await getForemanWorkspace();
  return (
    <ForemanShell projectName={project?.name ?? null}>{children}</ForemanShell>
  );
}
