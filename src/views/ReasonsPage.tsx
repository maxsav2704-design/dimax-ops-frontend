import { CatalogCrudPage } from "@/components/catalogs/CatalogCrudPage";

export default function ReasonsPage() {
  return (
    <CatalogCrudPage
      title="Reasons"
      subtitle="Manage incident reasons used in NOT_INSTALLED flows and analytics"
      endpoint="/api/v1/admin/reasons"
      queryKey="reasons"
      entityLabel="Reason"
    />
  );
}
