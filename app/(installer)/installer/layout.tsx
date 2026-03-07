import type { ReactNode } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { InstallerShell } from "@/components/installer/InstallerShell";

export default function InstallerLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth scope="installer">
      <InstallerShell>{children}</InstallerShell>
    </RequireAuth>
  );
}
