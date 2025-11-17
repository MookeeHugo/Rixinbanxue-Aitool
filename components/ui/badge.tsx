/**
 * 日新平台 - Badge 组件
 * 扩展了难度等级和AI标识
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",

        // 难度等级徽章
        easy:
          "border-transparent bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
        medium:
          "border-transparent bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
        hard:
          "border-transparent bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",

        // AI徽章 - 紫粉渐变
        ai:
          "border-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm",

        // 成功徽章
        success:
          "border-transparent bg-success-50 text-success-700 dark:bg-success-900/20",

        // 警告徽章
        warning:
          "border-transparent bg-warning-50 text-warning-700 dark:bg-warning-900/20",

        // 错误徽章
        error:
          "border-transparent bg-error-50 text-error-700 dark:bg-error-900/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
