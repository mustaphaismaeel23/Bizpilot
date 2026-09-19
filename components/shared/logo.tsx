import { Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-bold text-lg", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Rocket className="h-4.5 w-4.5" />
      </span>
      <span>BizPilot</span>
    </div>
  );
}
