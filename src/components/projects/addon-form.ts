// Moved verbatim from ProjectsPage.tsx (monolith split).

export type AdditionalWorkFormState = {
  addon_type_id: string;
  qty_planned: string;
  client_price: string;
  installer_price: string;
  notes: string;
};

export function emptyAdditionalWorkForm(): AdditionalWorkFormState {
  return {
    addon_type_id: "",
    qty_planned: "1",
    client_price: "",
    installer_price: "",
    notes: "",
  };
}
