export function Progress({ value = 0 }) {
  return (
    <div className='h-2 w-full overflow-hidden rounded-full bg-white/10'>
      <div className='h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-500' style={{ width: `${value}%` }} />
    </div>
  )
}
