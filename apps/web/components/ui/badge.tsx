import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#1F2937] text-[#F9FAFB] hover:bg-[#374151]",
        secondary:
          "border-transparent bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#2A2A2A]",
        destructive:
          "border-transparent bg-red-900/20 text-red-400",
        outline:
          "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#C6A15B] hover:text-[#C6A15B]",
        gold:
          "border-[#C6A15B]/40 bg-[#C6A15B]/10 text-[#C6A15B] hover:bg-[#C6A15B]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
