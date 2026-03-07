export type ScheduleExportEvent = {
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  waze_url: string | null;
  description: string | null;
  project_id: string | null;
};

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvCell(value: string | null | undefined): string {
  return escapeCsvCell(value ?? "");
}

export function buildScheduleCsv(events: ScheduleExportEvent[]): string {
  const header = [
    "title",
    "event_type",
    "starts_at",
    "ends_at",
    "location",
    "waze_url",
    "description",
    "project_id",
  ].join(",");

  const rows = events.map((event) =>
    [
      toCsvCell(event.title),
      toCsvCell(event.event_type),
      toCsvCell(event.starts_at),
      toCsvCell(event.ends_at),
      toCsvCell(event.location),
      toCsvCell(event.waze_url),
      toCsvCell(event.description),
      toCsvCell(event.project_id),
    ].join(",")
  );

  return [header, ...rows].join("\n");
}

export function scheduleExportFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `installer_schedule_${date}.csv`;
}

export function downloadScheduleCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
}
