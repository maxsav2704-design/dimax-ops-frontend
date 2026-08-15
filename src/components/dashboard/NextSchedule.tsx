import { CalendarDays } from "lucide-react";
import { getDashboardCopy } from "@/components/dashboard/copy";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { Button } from "@/components/ui/button";
import { LtrText } from "@/components/ui/LtrText";
import { useI18n } from "@/lib/i18n";
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
  const { locale } = useI18n();
  const copy = getDashboardCopy(locale).nextSchedule;
  return (
    <WidgetCard
      title={copy.title}
      description={copy.description}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenCalendar}
        >
          {" "}
          {copy.openCalendar}{" "}
        </Button>
      }
    >
      {" "}
      {events.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {" "}
          {events.map((event, i) => (
            <div
              key={`${event.title}-${event.timeRange}-${i}`}
              className="flex w-[296px] flex-shrink-0 flex-col justify-between rounded-lg border border-border bg-surface-subtle p-4 transition-colors duration-150 hover:border-border-strong"
            >
              {" "}
              <p className="mb-4 line-clamp-2 min-h-[48px] text-[14px] font-medium leading-6 text-text">
                {event.title}
              </p>{" "}
              <div className="flex items-center justify-between gap-3">
                {" "}
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--dmx-accent-tint)]">
                  {" "}
                  <span className="text-[11px] font-semibold text-text">
                    {event.initials}
                  </span>{" "}
                </div>{" "}
                <LtrText className="text-[12px] text-text-secondary">
                  {event.timeRange}
                </LtrText>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {" "}
          <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center mb-3">
            {" "}
            <CalendarDays
              className="w-5 h-5 text-text-secondary"
              strokeWidth={1.5}
            />{" "}
          </div>{" "}
          <p className="text-[13px] text-text-secondary">{copy.empty}</p>{" "}
        </div>
      )}{" "}
    </WidgetCard>
  );
}
