import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-glow">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-tight">
          Task<span className="text-gradient-primary">Flow</span>
        </span>
      )}
    </div>
  );
}
