export type InstallerFinancialCoverage = {
  pricing_mode?: "LEGACY" | "FACTORY";
  unrecorded_completed_works?: number;
  missing_client_prices?: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
};

export type InstallerMatrixCoverage = {
  pricing_mode?: "LEGACY" | "FACTORY";
  incomplete_items?: number;
  unassigned_completed_works?: number;
};

export function installerFinancialDataRisk(data: InstallerFinancialCoverage) {
  return data.pricing_mode === "FACTORY"
    ? (data.unrecorded_completed_works ?? 0) + (data.missing_client_prices ?? 0)
    : data.missing_rates_installed_doors + data.missing_addon_plans_facts;
}
