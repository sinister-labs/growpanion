import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-emerald-200/[0.22] bg-[linear-gradient(180deg,rgba(32,214,132,0.98),rgba(12,164,94,0.98)_52%,rgba(3,122,72,0.98))] text-primary-foreground shadow-[0_0_0_1px_rgba(52,255,154,0.10),0_0_28px_rgba(16,185,129,0.28),0_12px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-110",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-white/[0.12] bg-white/[0.045] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-emerald-300/[0.22] hover:bg-emerald-300/10 hover:text-emerald-100",
        secondary: "border border-white/[0.12] bg-[linear-gradient(145deg,rgba(20,30,38,0.92),rgba(7,13,18,0.92))] text-slate-100 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10",
        ghost: "text-slate-300 hover:bg-white/[0.06] hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
