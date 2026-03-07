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
      className="glass-card rounded-xl p-5 text-left w-full group animate-fade-in cursor-pointer relative overflow-hidden"
      style={{
        transform: transform || undefined,
        transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        boxShadow: isHovered
          ? "0 16px 40px -12px hsl(var(--accent) / 0.12), 0 6px 16px -4px hsl(var(--foreground) / 0.08), 0 0 0 1px hsl(var(--accent) / 0.08)"
          : undefined,
      }}
    >
      {/* Light sheen overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background: isHovered
            ? `radial-gradient(ellipse 280px 180px at ${sheenPos.x}% ${sheenPos.y}%, hsl(var(--accent) / 0.07), transparent 70%)`
            : "none",
          transition: "opacity 300ms ease-out",
          opacity: isHovered ? 1 : 0,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[13px] font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground/70">
            {title}
          </p>
          <span className="text-2xl font-semibold text-card-foreground tabular-nums">{value}</span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-secondary mb-2.5 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 progress-glow",
              progressColorMap[progressColor]
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          {detail && <p className="text-[11px] text-muted-foreground">{detail}</p>}
        </div>
      </div>
    </button>
  );
}
