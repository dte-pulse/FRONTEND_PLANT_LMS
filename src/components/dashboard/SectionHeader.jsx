export function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      {eyebrow && <p className='text-xs text-emerald-600 dark:text-emerald-400 font-semibold tracking-wide'>{eyebrow}</p>}
      <h3 className={`${eyebrow ? 'mt-1.5' : ''} text-lg font-semibold text-slate-900 dark:text-white text-balance`}>{title}</h3>
      {description ? <p className='mt-1.5 max-w-2xl text-sm leading-6 text-slate-500'>{description}</p> : null}
    </div>
  )
}
