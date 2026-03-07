import type { ReactNode } from "react";
import { RequireAuth } from "@/components/RequireAuth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
