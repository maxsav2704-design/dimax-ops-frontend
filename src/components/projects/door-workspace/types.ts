// Moved verbatim from ProjectsPage.tsx (monolith split).

export type MatrixRow = {
  door_id: string;
  order_number: string;
  house_number: string;
  floor_label: string;
  apartment_number: string;
  location_code: string;
  door_marking: string;
  unit_label: string;
  door_type_id: string;
  door_type_label: string;
  status: string;
  installer_id: string | null;
  issue_count: number;
  issue_titles: string[];
};

export type MatrixCell = {
  location_code: string;
  doors: MatrixRow[];
  door_count: number;
  issue_count: number;
  statuses: Record<string, number>;
};

export type MatrixApartmentGroup = {
  apartment_number: string;
  order_numbers: string[];
  total_doors: number;
  issue_count: number;
  installed_count: number;
  open_count: number;
  cells: MatrixCell[];
};

export type MatrixFloorGroup = {
  floor_label: string;
  location_codes: string[];
  apartments: MatrixApartmentGroup[];
  total_doors: number;
  issue_count: number;
  installed_count: number;
  open_count: number;
};

export type MatrixHouseGroup = {
  house_number: string;
  floors: MatrixFloorGroup[];
  total_doors: number;
  apartments_count: number;
  issue_count: number;
  installed_count: number;
  open_count: number;
};
