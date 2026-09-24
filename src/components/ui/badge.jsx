import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  secondary: 'bg-slate-800 text-slate-300 border-slate-700',
}

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold tracking-wide border',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  )
}
