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
    <div className="glass-card card-lift rounded-[1.2rem] p-5 animate-fade-in">
      <div className="panel-heading mb-5">
        <div>
          <h3 className="panel-title">Next schedule</h3>
          <p className="panel-subtitle mt-1">Upcoming operational slots with clear time windows.</p>
        </div>
        <button
          onClick={onOpenCalendar}
          className="btn-premium rounded-xl border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
        >
          Open calendar
        </button>
      </div>

      {events.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {events.map((event, i) => (
            <div
              key={i}
              className="group/event flex w-[296px] flex-shrink-0 flex-col justify-between rounded-[1.15rem] border border-accent/15 bg-accent/[0.04] p-4 transition-all duration-250 ease-in-out hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent/[0.07] hover:shadow-[0_12px_28px_-16px_hsl(var(--accent)/0.18)]"
            >
              <p className="mb-4 text-[14px] font-semibold leading-6 text-card-foreground">{event.title}</p>
              <div className="flex items-center justify-between gap-3">
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
