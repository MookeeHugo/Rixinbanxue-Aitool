/**
 * 日新教育平台 - UI 组件统一导出
 *
 * 使用方式：
 * import { Button, Card, Badge } from '@/components/ui'
 */

// Button 组件
export { Button, buttonVariants } from './button'
export type { ButtonProps } from './button'

// Card 组件
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './card'

// Badge 组件
export { Badge, badgeVariants } from './badge'
export type { BadgeProps } from './badge'

// Input 组件
export { Input } from './input'
export type { InputProps } from './input'

// Label 组件
export { Label } from './label'

// Textarea 组件
export { Textarea } from './textarea'
export type { TextareaProps } from './textarea'

// Checkbox 组件
export { Checkbox } from './checkbox'

// Select 组件
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select'

// Dialog 组件
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'

// Dropdown Menu 组件
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu'

// Progress 组件
export { Progress } from './progress'

// Toast 组件
export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from './toast'

// Toaster 组件
export { Toaster } from './toaster'
