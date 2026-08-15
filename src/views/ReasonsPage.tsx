import { CatalogCrudPage } from "@/components/catalogs/CatalogCrudPage";

export default function ReasonsPage() {
  return (
    <CatalogCrudPage
      title="Issue reasons"
      eyebrow="Catalog / field control"
      subtitle="Maintain the reason catalog used when a door cannot be installed or a field problem needs classification."
      purpose="Reasons keep NOT_INSTALLED flows, installer issue reports, dispatcher follow-up and admin analytics speaking the same operational language."
      endpoint="/api/v1/admin/reasons"
      queryKey="reasons"
      entityLabel="Reason"
    />
  );
}
