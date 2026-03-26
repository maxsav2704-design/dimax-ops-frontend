import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useRef, useState, useCallback } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  progress?: number;
  progressColor?: "accent" | "success" | "destructive" | "primary";
  icon?: LucideIcon;
  onClick?: () => void;
  detail?: string;
}

const progressColorMap = {
  accent: "bg-accent",
  success: "bg-success",
  destructive: "bg-destructive",
  primary: "bg-primary",
};

export function KpiCard({
  title,
  value,
  subtitle,
  progress = 0,
  progressColor = "accent",
  onClick,
  detail,
}: KpiCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [transform, setTransform] = useState("");
  const [sheenPos, setSheenPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * 3;
    const rotateY = (x - 0.5) * 3;
    setTransform(`perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.03)`);
    setSheenPos({ x: x * 100, y: y * 100 });
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTransform("");
  }, []);

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="glass-card group relative w-full cursor-pointer overflow-hidden rounded-[1.2rem] p-5 text-left animate-fade-in"
      style={{
        transform: transform || undefined,
        transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        boxShadow: isHovered
          ? "0 18px 40px -22px hsl(var(--accent) / 0.16), 0 10px 24px -18px hsl(var(--foreground) / 0.1), 0 0 0 1px hsl(var(--accent) / 0.08)"
          : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.2rem]"
        style={{
          background: isHovered
            ? `radial-gradient(ellipse 280px 180px at ${sheenPos.x}% ${sheenPos.y}%, hsl(var(--accent) / 0.05), transparent 72%)`
            : "none",
          transition: "opacity 300ms ease-out",
          opacity: isHovered ? 1 : 0,
        }}
      />

      <div className="relative z-10 flex min-h-[148px] flex-col">
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-[60%] text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-200 group-hover:text-foreground/70">
            {title}
          </p>
          <span className="text-[1.95rem] font-semibold leading-none tracking-tight text-card-foreground tabular-nums">
            {value}
          </span>
        </div>

        <div className="mt-4 w-full overflow-hidden rounded-full bg-secondary/90">
          <div
            className={cn(
              "kpi-progress rounded-full transition-all duration-500 progress-glow",
              progressColorMap[progressColor]
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="min-w-0 text-[12px] leading-6 text-muted-foreground">{subtitle}</p>
          {detail && <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{detail}</p>}
        </div>
      </div>
    </button>
  );
}
