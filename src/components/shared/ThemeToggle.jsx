import { MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 px-2.5 2xl:px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-xs shrink-0"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-pressed={theme === 'dark'}
    >
      {theme === 'dark' ? (
        <>
          <SunMedium className="h-3.5 w-3.5 text-amber-400" aria-hidden='true' />
          <span className="hidden 2xl:inline">Light mode</span>
        </>
      ) : (
        <>
          <MoonStar className="h-3.5 w-3.5 text-emerald-400" aria-hidden='true' />
          <span className="hidden 2xl:inline">Dark mode</span>
        </>
      )}
    </button>
  )
}
