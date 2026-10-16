// Moved verbatim from ProjectsPage.tsx (monolith split).

export type AddonTypeItem = {
  id: string;
  name: string;
  unit: string;
  status?: string;
};

export type ProjectAddonPlanItem = {
  id?: string;
  addon_type_id: string;
  addon_name?: string | null;
  qty_planned: string | number;
  client_price: string | number;
  installer_price: string | number | null;
  notes?: string | null;
};
