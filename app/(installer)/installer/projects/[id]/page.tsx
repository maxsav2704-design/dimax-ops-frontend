"use client";

import InstallerProjectPage from "@/views/installer/ProjectPage";

export default function Page({ params }: { params: { id: string } }) {
  return <InstallerProjectPage projectId={params.id} />;
}
