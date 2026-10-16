// Moved verbatim from ProjectsPage.tsx (monolith split).

export type UrgencySurchargeItem = {
  id?: string;
  scope: "PROJECT" | "ORDER_NUMBER";
  order_number?: string | null;
  reason: string;
  client_amount: string | number;
  installer_amount: string | number;
  effective_date?: string | null;
  notes?: string | null;
};

export type UrgencySurchargeFormState = {
  scope: "PROJECT" | "ORDER_NUMBER";
  order_number: string;
  reason: string;
  client_amount: string;
  installer_amount: string;
  effective_date: string;
  notes: string;
};

export function emptyUrgencySurchargeForm(): UrgencySurchargeFormState {
  return {
    scope: "PROJECT",
    order_number: "",
    reason: "",
    client_amount: "",
    installer_amount: "",
    effective_date: "",
    notes: "",
  };
}
