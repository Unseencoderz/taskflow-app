import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-2xl",
};

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, color, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-background select-none",
        sizes[size],
        className,
      )}
      style={{
        background: color
          ? `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 55%, white 20%))`
          : "linear-gradient(135deg, var(--primary), var(--primary-glow))",
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

interface AvatarStackProps {
  users: { id: string; name: string; avatarColor: string }[];
  max?: number;
  size?: AvatarProps["size"];
}

export function AvatarStack({ users, max = 4, size = "sm" }: AvatarStackProps) {
  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => (
        <Avatar key={u.id} name={u.name} color={u.avatarColor} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold ring-2 ring-background",
            sizes[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
