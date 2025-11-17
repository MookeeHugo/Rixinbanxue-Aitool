/**
 * 日新平台 - Button 组件
 * 基于 shadcn/ui，扩展了设计令牌和渐变样式
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // 主按钮 - 紫色渐变（日新平台特色）
        default:
          "bg-gradient-to-r from-purple-600 to-purple-800 text-primary-foreground shadow-primary hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",

        // 次要按钮 - 灰色背景
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",

        // 轮廓按钮 - 透明背景 + 边框
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",

        // 危险按钮 - 红色
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",

        // 幽灵按钮 - 完全透明
        ghost: "hover:bg-accent hover:text-accent-foreground",

        // 链接样式
        link: "text-primary underline-offset-4 hover:underline",

        // 成功按钮 - 绿色渐变（用于确认操作）
        success:
          "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5",

        // AI按钮 - 特殊渐变（用于AI功能）
        ai:
          "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm hover:shadow-lg hover:scale-105",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
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
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && leftIcon && <span className="button-icon-left">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="button-icon-right">{rightIcon}</span>}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
