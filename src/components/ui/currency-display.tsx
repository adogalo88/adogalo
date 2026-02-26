"use client";

import { formatCurrency as formatCurrencyLib } from "@/lib/financial";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  /** "sm" = compact (text-sm), "md" = default, "lg" = emphasis */
  size?: "sm" | "md" | "lg";
  /** Prevent overflow in flex cards; nominal responsif mengikuti card */
  responsive?: boolean;
}

const sizeClasses = {
  sm: "text-xs sm:text-sm",
  md: "text-sm sm:text-base",
  lg: "text-base sm:text-lg",
};

export function CurrencyDisplay({
  amount,
  className,
  size = "md",
  responsive = true,
}: CurrencyDisplayProps) {
  return (
    <span
      className={cn(
        sizeClasses[size],
        responsive && "min-w-0 overflow-hidden text-ellipsis break-all",
        className
      )}
      title={formatCurrencyLib(amount)}
    >
      {formatCurrencyLib(amount)}
    </span>
  );
}
