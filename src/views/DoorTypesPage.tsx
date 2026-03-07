import { CatalogCrudPage } from "@/components/catalogs/CatalogCrudPage";

export default function DoorTypesPage() {
  return (
    <CatalogCrudPage
      title="Door Types"
      subtitle="Manage door type catalog used in rates and project door allocation"
      endpoint="/api/v1/admin/door-types"
      queryKey="door-types"
      entityLabel="Door Type"
    />
  );
}
