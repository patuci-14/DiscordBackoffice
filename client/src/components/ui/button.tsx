import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from 'framer-motion'
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-discord-blurple text-white hover:bg-discord-blurple/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-gray-700 bg-discord-bg-tertiary hover:bg-discord-bg-secondary text-discord-text-secondary hover:text-white",
        secondary:
          "bg-discord-bg-tertiary text-discord-text-secondary hover:bg-discord-bg-secondary hover:text-white",
        ghost: "hover:bg-discord-bg-tertiary hover:text-white",
        link: "text-discord-blurple underline-offset-4 hover:underline",
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
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  iconLeft?: string;
  iconRight?: string;
  animationType?: 'bounce' | 'pulse' | 'scale' | 'slide' | 'glow' | 'none';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    iconLeft,
    iconRight,
    animationType = 'bounce',
    isLoading = false,
    children,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Definir as animações
    const animations = {
      bounce: {
        whileHover: { y: -3 },
        whileTap: { y: 1 },
      },
      pulse: {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.98 },
      },
      scale: {
        whileHover: { scale: 1.03 },
        whileTap: { scale: 0.97 },
      },
      slide: {
        whileHover: { x: 3 },
        whileTap: { x: 0 },
      },
      glow: {
        whileHover: { boxShadow: '0 0 8px rgba(114, 137, 218, 0.6)' },
        whileTap: { boxShadow: 'none' },
      },
      none: {},
    };

    const currentAnimation = animations[animationType];

    return (
      <motion.div
        className="inline-block"
        {...currentAnimation}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={isLoading || props.disabled}
          {...props}
        >
          {isLoading && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-inherit rounded-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <i className="fas fa-circle-notch spin text-lg"></i>
            </motion.div>
          )}
          
          <motion.div
            className="flex items-center justify-center gap-2"
            animate={{ opacity: isLoading ? 0 : 1 }}
          >
            {iconLeft && <i className={iconLeft}></i>}
            {children}
            {iconRight && <i className={iconRight}></i>}
          </motion.div>
        </Comp>
      </motion.div>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
