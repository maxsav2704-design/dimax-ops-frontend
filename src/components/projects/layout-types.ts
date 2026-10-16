// Moved verbatim from ProjectsPage.tsx (monolith split).

export type ProjectDoorsLayoutResponse = {
  project_id: string;
  total_doors: number;
  buckets: LayoutBucket[];
};

export type LayoutBucket = {
  order_number: string | null;
  house_number: string | null;
  floor_label: string | null;
  location_code: string | null;
  door_marking: string | null;
  total: number;
  status_breakdown: Record<string, number>;
  doors: LayoutDoor[];
};

export type LayoutDoor = {
  id: string;
  unit_label: string;
  door_type_id: string;
  order_number: string | null;
  apartment_number: string | null;
  location_code: string | null;
  door_marking: string | null;
  status: string;
  installer_id: string | null;
};
