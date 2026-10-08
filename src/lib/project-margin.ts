export type ProjectMarginCoverage = {
  pricing_mode?: "LEGACY" | "FACTORY";
  unrecorded_completed_works?: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
};

export function projectMarginDataRisk(data: ProjectMarginCoverage) {
  return (data.pricing_mode === "FACTORY"
    ? data.unrecorded_completed_works ?? 0
    : data.missing_rates_installed_doors) + data.missing_addon_plans_facts;
}
