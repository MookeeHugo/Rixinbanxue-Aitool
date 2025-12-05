import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20",
  {
    variants: {
      variant: {
        default:
          "bg-gray-100 text-gray-700 border-transparent",
        secondary:
          "bg-[hsl(var(--background-secondary))] text-foreground border border-border/60",
        primary:
          "bg-primary-50 text-primary-700 border-primary-200/50",
        accent:
          "bg-accent-50 text-accent-700 border-accent-200/50",
        success:
          "bg-success-50 text-success-700 border-success-200/60",
        warning:
          "bg-amber-50 text-amber-700 border-amber-200/60",
        error:
          "bg-red-50 text-red-700 border-red-200/60",
        outline:
          "bg-white text-gray-700 border-gray-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
