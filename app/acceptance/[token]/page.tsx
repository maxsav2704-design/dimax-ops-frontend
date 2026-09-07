import AcceptancePage from "@/views/public/AcceptancePage";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <AcceptancePage token={token} />;
}
