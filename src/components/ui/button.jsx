import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs border border-indigo-500/40 font-bold',
        secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/80',
        outline: 'bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white border border-slate-700/80',
        ghost: 'bg-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white',
        danger: 'bg-rose-500/10 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30',
        subtle: 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-xs',
        lg: 'h-11 px-5 text-sm',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

