import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-sm border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2 text-sm text-[#F9FAFB] placeholder:text-[#4B5563] transition-all duration-200",
          "focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B] focus:shadow-[0_0_12px_rgba(198,161,91,0.15)]",
          "hover:border-[#3A3A3A]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
