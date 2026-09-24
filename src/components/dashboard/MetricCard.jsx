import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export function MetricCard({ label, value, hint, trend }) {
  return (
    <Card className='group relative overflow-hidden hover:border-emerald-500/30 hover:-translate-y-0.5' role='group' aria-label={`${label}: ${value}`}>
      <div className='flex items-center justify-between gap-4'>
        <p className='text-xs font-semibold tracking-wide text-slate-400'>{label}</p>
        {trend ? <Badge variant='success'>{trend}</Badge> : null}
      </div>
      <p className='mt-2.5 text-2xl font-bold tracking-tight text-white tabular-nums'>{value}</p>
      {hint && <p className='mt-1 max-w-[30ch] text-xs leading-relaxed text-slate-400'>{hint}</p>}
    </Card>
  )
}
