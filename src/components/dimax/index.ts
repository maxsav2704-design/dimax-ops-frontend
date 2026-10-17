export { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";
export { EmptyState } from "./EmptyState";
export { InlineNotice, type InlineNoticeTone } from "./InlineNotice";
export { CardSkeleton, TableSkeleton } from "./LoadingSkeleton";
export { COMPANY_CURRENCY, DateTime, Money, NumberValue } from "./Value";
export { FabButton, type FabButtonSize } from "./FabButton";
export { KpiCard, type KpiBarColor } from "./KpiCard";
export { MetricRow } from "./MetricRow";
export {
  PillButton,
  type PillButtonSize,
  type PillButtonVariant,
} from "./PillButton";
export { WidgetCard } from "./WidgetCard";
export { MAIN_CONTENT_ID, SkipToContent } from "./SkipToContent";
// Premium visual primitives (2026-10-17): state-driven behaviours shared by every section.
export { attentionAttr, attentionLevel, byAttention, type AttentionFlags, type AttentionLevel } from "./attention";
export { KpiTile } from "./KpiTile";
export { resolveKpiTone, sparklineGeometry, type KpiThresholds, type KpiTone } from "./kpi-logic";
export { entityKey, useEntityHighlight } from "./useEntityHighlight";
export { FreshnessBadge } from "./FreshnessBadge";
export { DEFAULT_STALE_AFTER_MS, resolveFreshness, type FreshnessState } from "./freshness";
export { CONDENSE_SCROLL_PX, useScrolledPast } from "./useScrolledPast";
export { FilterChip } from "./FilterChip";
export { ConfirmActionDialog } from "./ConfirmActionDialog";
