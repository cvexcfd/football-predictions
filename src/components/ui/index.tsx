import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }: { className?: string; children: ReactNode; [key: string]: unknown }) {
  return (
    <div className={cn('bg-white rounded-xl border border-border/50 shadow-sm p-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mb-3', className)}>{children}</div>
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cn('font-semibold text-lg text-text', className)}>{children}</h3>
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('', className)}>{children}</div>
}

export function Button({ className, variant = 'default', size = 'md', children, ...props }: {
  className?: string
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  [key: string]: unknown
}) {
  const variantClasses = {
    default: 'bg-gray-100 text-text hover:bg-gray-200',
    primary: 'bg-primary text-white hover:bg-primary-dark',
    danger: 'bg-danger text-white hover:bg-red-700',
    ghost: 'bg-transparent text-text-muted hover:bg-gray-100',
  }
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={cn('inline-flex items-center justify-center rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed', variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({ className, ...props }: { className?: string; [key: string]: unknown }) {
  return (
    <input
      className={cn('w-full px-3 py-2 border border-border/50 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all', className)}
      {...props}
    />
  )
}

export function Badge({ className, variant = 'default', children }: { className?: string; variant?: 'default' | 'success' | 'danger' | 'warning'; children: ReactNode }) {
  const variantClasses = {
    default: 'bg-gray-100 text-text-muted',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  )
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  )
}
