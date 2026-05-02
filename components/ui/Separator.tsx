import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/cn";

export function Separator({ className }: { className?: string }) {
  return (
    <SeparatorPrimitive.Root
      className={cn("shrink-0 bg-gray-800", className)}
      style={{ height: "1px" }}
    />
  );
}
