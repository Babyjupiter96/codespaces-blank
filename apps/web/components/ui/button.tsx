"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#C6A15B] text-[#111111] hover:bg-[#D4B483] font-semibold shadow-[0_0_20px_rgba(198,161,91,0.3)] hover:shadow-[0_0_30px_rgba(198,161,91,0.5)]",
        destructive:
          "bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/30",
        outline:
          "border border-[#2A2A2A] bg-transparent text-[#F9FAFB] hover:bg-[#1A1A1A] hover:border-[#C6A15B]",
        secondary:
          "bg-[#1F2937] text-[#F9FAFB] hover:bg-[#374151] border border-[#374151]",
        ghost:
          "text-[#F9FAFB] hover:bg-[#1A1A1A] hover:text-[#C6A15B]",
        link:
          "text-[#C6A15B] underline-offset-4 hover:underline p-0 h-auto",
        gold:
          "bg-transparent border border-[#C6A15B] text-[#C6A15B] hover:bg-[#C6A15B] hover:text-[#111111] font-semibold hover:shadow-[0_0_25px_rgba(198,161,91,0.4)] transition-all duration-300",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-sm px-4 text-xs",
        lg: "h-13 px-8 py-3 text-base",
        xl: "h-14 px-10 py-4 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
