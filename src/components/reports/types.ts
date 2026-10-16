// Response shapes shared by ReportsPage and its sections.

export type OperationsCenterResponse = {
  generated_at: string;
  imports: {
    window_hours: number;
    total_runs: number;
    analyze_runs: number;
    import_runs: number;
    retry_runs: number;
    success_runs: number;
    partial_runs: number;
    failed_runs: number;
    empty_runs: number;
  };
  outbox: {
    total: number;
    failed_total: number;
    pending_overdue_15m: number;
    by_channel: Record<string, number>;
  };
  alerts: {
    unread_count: number;
    total_last_24h: number;
    warn_last_24h: number;
    danger_last_24h: number;
    latest_created_at: string | null;
  };
  top_failing_projects: Array<{
    project_id: string;
    project_name: string;
    failure_runs: number;
    last_run_at: string;
    last_error: string | null;
  }>;
};
