import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-neutral-800 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-border bg-white dark:bg-card text-foreground shadow-2xs hover:bg-neutral-50 dark:hover:bg-[#222430] hover:text-accent-foreground",
        secondary:
          "border border-border bg-white dark:bg-card text-secondary-foreground shadow-2xs hover:bg-neutral-50 dark:hover:bg-[#222430]",
        ghost: "hover:bg-muted hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        purple:
          "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-sm shadow-purple-500/20 active:scale-[0.98]",
        emerald:
          "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2 text-xs font-semibold",
        sm: "h-8 rounded-md px-3 text-xs font-medium",
        lg: "h-10 rounded-md px-6 text-sm font-semibold",
        icon: "h-9 w-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
