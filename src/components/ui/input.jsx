import { cn } from '@/lib/utils'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40',
        className
      )}
      {...props}
    />
  )
}

