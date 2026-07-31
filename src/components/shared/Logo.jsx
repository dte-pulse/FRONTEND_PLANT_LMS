export function Logo() {
  return (
    <div className='flex items-center gap-2.5 group cursor-pointer select-none'>
      <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105'>
        <svg viewBox='0 0 64 64' className='h-4 w-4 text-white' fill='none' stroke='currentColor' strokeWidth='4.5' strokeLinecap="round">
          <path d='M14 18h20c9 0 16 7 16 16s-7 16-16 16H14z' />
          <path d='M20 26h13c4 0 8 3 8 8s-4 8-8 8H20z' />
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-extrabold tracking-tight text-white">PULSE</span>
          <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">LMS</span>
        </div>
        <p className='text-[9px] font-semibold uppercase tracking-wider text-slate-400'>Plant AI Portal</p>
      </div>
    </div>
  )
}



