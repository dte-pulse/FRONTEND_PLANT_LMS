import { cn } from '@/lib/utils'

export function Card({ className, ...props }) {
  return <div className={cn('rounded-2xl border border-slate-800/80 bg-[#131825] p-5 shadow-xs transition-all duration-200 hover:border-slate-700/80', className)} {...props} />
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('mb-4 flex items-start justify-between gap-4 pb-3 border-b border-slate-800/60', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-bold tracking-tight text-white', className)} {...props} />
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('mt-0.5 text-xs text-slate-400', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('text-slate-200', className)} {...props} />
}

