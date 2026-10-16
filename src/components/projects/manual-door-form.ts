// Moved verbatim from ProjectsPage.tsx (monolith split).

export type ManualDoorFormState = {
  product_id: string;
  door_code: string;
  unit: string;
  floor: string;
  location_code: string;
  order_number: string;
  install_type: string;
  is_critical: boolean;
  assigned_installer_id: string;
  planned_install_date: string;
};

export function emptyManualDoorForm(): ManualDoorFormState {
  return {
    product_id: "",
    door_code: "",
    unit: "",
    floor: "",
    location_code: "",
    order_number: "",
    install_type: "",
    is_critical: false,
    assigned_installer_id: "",
    planned_install_date: "",
  };
}
