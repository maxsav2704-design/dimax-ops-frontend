import type { ApprovalCandidate, PublicCommercialApproval } from "@/lib/commercial-approvals";

export const contractId = "63982c70-23a7-4ae7-9a23-9c661372c4be";
const owner = "1cac48c4-1b12-43fd-a02e-cab93c669e24";
const common = { contract_id: contractId, status: "DRAFT" as const, created_by: owner, created_at: "2026-10-21T10:00:00Z",
  currency: "ILS" as const, vat_basis: "EXCLUSIVE" as const, factory_confirmed: false as const, usable_for_billing: false as const,
  is_demo: true, proposed_from: "2026-11-10", reason: "Test only", agreement_reference: "Synthetic agreement" };
export const candidate: ApprovalCandidate = {
  snapshot_hash: "a".repeat(64),
  contact: { id: owner, factory_name: "Synthetic factory", recipient_name: "Factory Representative", recipient_email: "factory@example.com", authority_reference: "Test authorisation" },
  snapshot: { company_id: owner, company_name: "Test DIMAX", contract_id: contractId, contract_reference: "TEST-2026",
    factory_name: "Synthetic factory", is_demo: true,
    terms: { ...common, id: "ccf5a0c4-3142-4826-9c34-9a595b42bcf6", version: 2, created_by_name: "Test Owner",
      factory_legal_name: "Synthetic Factory Ltd", registration_number: "TEST-123", address: "Synthetic address",
      contact_name: null, contact_email: null, contact_phone: null, proposed_until: null, billing_basis: "FULL_INSTALLATION",
      payment_terms: "30 days after signed journals", retention_terms: "No retention", period_start_day: 10, period_timezone: "Asia/Jerusalem" },
    price: { ...common, id: "1ed04b7a-13c5-40b9-9ae8-1cd918fb212b", version: 3,
      items: [{ kind: "INSTALLATION", target_id: owner, stage_code: "", name: "Test entrance door", unit: "pcs", unit_price_ex_vat: "400.00" }] },
  },
};
export const publicApproval: PublicCommercialApproval = { snapshot: candidate.snapshot, snapshot_hash: candidate.snapshot_hash,
  recipient_name: candidate.contact!.recipient_name, expires_at: "2099-01-01T12:00:00Z", status: "PENDING",
  confirmed_at: null, confirmed_name: null, usable_for_billing: false };
