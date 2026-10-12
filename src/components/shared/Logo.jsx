export function Logo() {
  return (
    <div className='flex items-center gap-2.5 select-none' aria-label='Pulse LMS plant learning portal'>
      <img
        src='/brand/pulselogo.jpeg'
        alt='Pulse LMS logo'
        className='h-9 w-9 rounded-xl object-contain shadow-sm'
        width='36'
        height='36'
      />
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-extrabold tracking-tight text-white">PULSE</span>
          <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">LMS</span>
        </div>
        <p className='text-[9px] font-semibold tracking-wider text-slate-400'>Plant learning portal</p>
      </div>
    </div>
  )
}
