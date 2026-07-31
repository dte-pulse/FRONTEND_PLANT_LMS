import { cn } from '@/lib/utils'

export function Table({ children, className }) {
  return <div className={cn('overflow-hidden rounded-2xl border border-slate-800/80 bg-[#131825]', className)}>{children}</div>
}

export function TableRoot({ children, className }) {
  return <table className={cn('w-full text-left text-xs border-collapse', className)}>{children}</table>
}

export function TableHead({ children, className }) {
  return <thead className={cn('bg-[#161C2C] text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80', className)}>{children}</thead>
}

export function TableBody({ children, className }) {
  return <tbody className={cn('divide-y divide-slate-800/60 text-slate-300', className)}>{children}</tbody>
}

export function TableRow({ children, className }) {
  return <tr className={cn('hover:bg-slate-800/40 transition-colors', className)}>{children}</tr>
}

export function TableHeader({ children, className }) {
  return <th className={cn('px-4 py-3 font-bold text-slate-300', className)}>{children}</th>
}

export function TableCell({ children, className = '' }) {
  return <td className={cn('px-4 py-3.5 align-middle', className)}>{children}</td>
}

