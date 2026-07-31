import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export function MetricCard({ label, value, hint, trend }) {
  return (
    <Card className='hover:border-slate-700/80 transition-all'>
      <div className='flex items-center justify-between gap-4'>
        <p className='text-xs font-semibold uppercase tracking-wider text-slate-400'>{label}</p>
        {trend ? <Badge variant='success'>{trend}</Badge> : null}
      </div>
      <p className='mt-2.5 text-2xl font-bold tracking-tight text-white'>{value}</p>
      {hint && <p className='mt-1 text-xs text-slate-400'>{hint}</p>}
    </Card>
  )
}

