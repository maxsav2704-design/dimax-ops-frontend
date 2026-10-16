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

export type LibraryProductItem = {
  id: string;
  sku: string;
  name_ru: string;
  name_he: string;
  install_type: string;
  manufacturer: string | null;
  unit: string;
  status: string;
};

export type InstallerListItem = {
  id: string;
  full_name: string;
  email: string | null;
  status: string;
  is_active: boolean;
};
