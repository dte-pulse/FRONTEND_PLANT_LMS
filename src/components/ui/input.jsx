import { cn } from '@/lib/utils'

export function Input({ className, type = 'text', ...props }) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40',
        className
      )}
      type={type}
      {...props}
    />
  )
}
