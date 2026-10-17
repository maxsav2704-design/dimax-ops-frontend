// E4 threshold tile logic, kept apart from the component for fast refresh and tests.

export type KpiTone = "neutral" | "ok" | "warn" | "bad";

export type KpiThresholds = {
  warn: number;
  bad: number;
  /** "up": higher is worse (problems, failures). "down": lower is worse (SLA, margin). */
  direction?: "up" | "down";
};

export function resolveKpiTone(value: number | null | undefined, thresholds?: KpiThresholds): KpiTone {
  if (value == null || !Number.isFinite(value) || !thresholds) return "neutral";
  const { warn, bad, direction = "up" } = thresholds;
  if (direction === "up") {
    if (value >= bad) return "bad";
    if (value >= warn) return "warn";
    return "ok";
  }
  if (value <= bad) return "bad";
  if (value <= warn) return "warn";
  return "ok";
}

export type SparklineGeometry = { line: string; area: string; end: { x: number; y: number } | null };

export function sparklineGeometry(series: number[], width = 180, height = 32): SparklineGeometry {
  const points = series.filter((v) => Number.isFinite(v));
  if (points.length < 2) return { line: "", area: "", end: null };
  const max = Math.max(...points, 0);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const xy = points.map((v, i) => ({ x: i * step, y: height - 2 - ((v - min) / span) * (height - 4) }));
  const line = xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return { line, area, end: { x: last.x, y: last.y } };
}
