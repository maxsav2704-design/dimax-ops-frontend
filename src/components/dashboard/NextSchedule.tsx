import { CalendarDays } from "lucide-react";

interface ScheduleEvent {
  title: string;
  timeRange: string;
  initials: string;
  color?: string;
}

interface NextScheduleProps {
  events: ScheduleEvent[];
  onOpenCalendar?: () => void;
}

export function NextSchedule({ events, onOpenCalendar }: NextScheduleProps) {
  return (
    <div className="glass-card card-lift rounded-xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-card-foreground">Next schedule</h3>
        <button
          onClick={onOpenCalendar}
          className="btn-premium text-[12px] font-medium text-muted-foreground hover:text-accent px-3 py-1.5 rounded-lg border border-border"
        >
          Open calendar
        </button>
      </div>

      {events.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {events.map((event, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] rounded-xl border border-accent/15 bg-accent/[0.04] p-4 cursor-pointer group/event transition-all duration-250 ease-in-out hover:border-accent/35 hover:bg-accent/[0.07] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_-4px_hsl(var(--accent)/0.12)]"
            >
              <p className="text-[13px] font-semibold text-card-foreground mb-3">{event.title}</p>
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center transition-all duration-250 group-hover/event:bg-accent/20 group-hover/event:shadow-[0_0_8px_hsl(var(--accent)/0.2)]">
                  <span className="text-[11px] font-semibold text-accent">{event.initials}</span>
                </div>
                <span className="text-[12px] text-muted-foreground tabular-nums">{event.timeRange}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <CalendarDays className="w-5 h-5 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-muted-foreground">No upcoming events.</p>
        </div>
      )}
    </div>
  );
}
