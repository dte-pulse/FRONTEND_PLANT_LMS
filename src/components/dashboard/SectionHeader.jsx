export function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      <p className='text-xs text-indigo-500 font-medium'>{eyebrow}</p>
      <h3 className='mt-1.5 text-lg font-semibold text-slate-900'>{title}</h3>
      {description ? <p className='mt-1.5 max-w-2xl text-sm leading-6 text-slate-500'>{description}</p> : null}
    </div>
  )
}
