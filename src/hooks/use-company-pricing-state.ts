import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { companyPricingStateSchema } from "@/lib/api-schemas";
import { onAuthChanged } from "@/lib/auth-session";
import { PRICE_API, type CompanyPricingState } from "@/lib/factory-prices";

export function useCompanyPricingState(enabled = true) {
  const client = useQueryClient();
  const [epoch, setEpoch] = useState(0);
  useEffect(() => onAuthChanged(() => {
    void client.cancelQueries({ queryKey: ["company-pricing-state"] });
    client.removeQueries({ queryKey: ["company-pricing-state"] });
    setEpoch((value) => value + 1);
  }), [client]);
  const query = useQuery({
    queryKey: ["company-pricing-state", epoch], enabled,
    queryFn: ({ signal }) => apiFetch<CompanyPricingState>(`${PRICE_API}/state`, { signal }, { schema: companyPricingStateSchema }),
    retry: false, gcTime: 0, staleTime: 0, refetchInterval: 30_000,
  });
  const state = enabled && !query.isError ? query.data : undefined;
  return { state, loading: query.isFetching, error: query.isError,
    legacyWritable: enabled && query.isSuccess && !query.isFetching && !query.isError && state?.mode === "LEGACY",
    refresh: () => void query.refetch() };
}
