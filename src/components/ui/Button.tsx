// src/components/ui/Button.tsx
import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    children,
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-black-cat-orange-600 text-white hover:bg-black-cat-orange-700 focus:ring-black-cat-orange-500 shadow-sm hover:shadow-md',
      secondary: 'bg-white text-black-cat-gray-700 border border-black-cat-gray-300 hover:bg-black-cat-gray-50 focus:ring-black-cat-orange-500 shadow-sm hover:shadow',
      ghost: 'text-black-cat-gray-600 hover:bg-black-cat-gray-100 focus:ring-black-cat-orange-500'
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5'
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          loading && 'cursor-wait',
          className
        )}
        {...props}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        
        {!loading && Icon && iconPosition === 'left' && (
          <Icon className={cn(
            size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
            children ? '' : '' // No margin if no children
          )} />
        )}

        {children}

        {!loading && Icon && iconPosition === 'right' && (
          <Icon className={cn(
            size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
            children ? '' : '' // No margin if no children
          )} />
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
