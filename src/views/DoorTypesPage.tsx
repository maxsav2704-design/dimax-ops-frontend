import { CatalogCrudPage } from "@/components/catalogs/CatalogCrudPage";

export default function DoorTypesPage() {
  return (
    <CatalogCrudPage
      title="Door types"
      eyebrow="Catalog / door installation"
      subtitle="Control the door categories used by imports, project allocation, installer rates and payroll."
      purpose="Door types connect imported factory rows to installer pricing, project plan/fact reports, and the real door categories DIMAX installs on site."
      endpoint="/api/v1/admin/door-types"
      queryKey="door-types"
      entityLabel="Door Type"
    />
  );
}
