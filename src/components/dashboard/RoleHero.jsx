import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function RoleHero({ eyebrow, title, description, ctaPrimary = 'Take action', ctaSecondary = 'Review details', onPrimaryClick, onSecondaryClick }) {
  return (
    <section className='relative overflow-hidden rounded-3xl border border-slate-800/80 bg-[#161C2C] p-6 shadow-xl shadow-emerald-950/10 md:p-8'>
      <div className='pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl' />
      <div className='relative'>
        {eyebrow && <div className="flex items-center gap-2"><Badge variant="default">{eyebrow}</Badge></div>}
        <h2 className='mt-3 max-w-3xl text-balance text-xl font-bold tracking-tight text-white md:text-3xl'>{title}</h2>
        <p className='mt-2.5 max-w-2xl text-xs leading-relaxed text-slate-300 md:text-sm'>{description}</p>
      </div>
      <div className='mt-6 flex flex-wrap gap-3'>
        {ctaPrimary && <Button onClick={onPrimaryClick}>{ctaPrimary}</Button>}
        {ctaSecondary && <Button variant='outline' onClick={onSecondaryClick}>{ctaSecondary}</Button>}
      </div>
    </section>
  )
}
