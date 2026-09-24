export function Progress({ value = 0, className = '', label = 'Progress' }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-white/10 ${className}`} role='progressbar' aria-label={label} aria-valuemin='0' aria-valuemax='100' aria-valuenow={safeValue}>
      <div className='h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-[width] duration-500' style={{ width: `${safeValue}%` }} />
    </div>
  )
}
