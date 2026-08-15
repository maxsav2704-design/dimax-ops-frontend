import InstallerProjectPage from "@/views/installer/ProjectPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <InstallerProjectPage projectId={id} />;
}
