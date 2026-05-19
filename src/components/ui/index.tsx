import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }: { className?: string; children: ReactNode; [key: string]: unknown }) {
  return (
    <div className={cn('glass rounded-2xl p-4 transition-all duration-300 hover:border-border-light', className)} {...props}>
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
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  [key: string]: unknown
}) {
  const variantClasses = {
    default: 'bg-surface-alt text-text hover:bg-border-light border border-border/50',
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20',
    danger: 'bg-danger text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
    ghost: 'bg-transparent text-text-muted hover:bg-surface-alt border border-transparent',
    gold: 'bg-gold text-black hover:bg-gold-dark shadow-lg shadow-gold/20 font-bold',
  }
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={cn('inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100', variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({ className, ...props }: { className?: string; [key: string]: unknown }) {
  return (
    <input
      className={cn('w-full px-3 py-2.5 bg-surface-alt border border-border/50 rounded-xl text-sm text-text outline-none transition-all duration-200 placeholder:text-text-dim focus:border-primary focus:ring-1 focus:ring-primary/30', className)}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }: { className?: string; children: ReactNode; [key: string]: unknown }) {
  return (
    <select
      className={cn('w-full px-3 py-2.5 bg-surface-alt border border-border/50 rounded-xl text-sm text-text outline-none transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary/30', className)}
      {...props}
    >
      {children}
    </select>
  )
}

export function Badge({ className, variant = 'default', children }: { className?: string; variant?: 'default' | 'success' | 'danger' | 'warning' | 'gold' | 'primary'; children: ReactNode }) {
  const variantClasses = {
    default: 'bg-surface-alt text-text-muted',
    success: 'bg-green-500/10 text-success border border-green-500/20',
    danger: 'bg-red-500/10 text-danger border border-red-500/20',
    warning: 'bg-yellow-500/10 text-warning border border-yellow-500/20',
    gold: 'bg-gold/10 text-gold border border-gold/20',
    primary: 'bg-primary/10 text-primary border border-primary/20',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide', variantClasses[variant], className)}>
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl animate-shimmer', className)} />
  )
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-20 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="w-6 h-4 rounded" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-xl" />
    </div>
  )
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  )
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center mb-4 text-text-dim">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-text mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-xs">{description}</p>
    </div>
  )
}
