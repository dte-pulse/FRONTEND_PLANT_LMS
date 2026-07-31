import { MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-xs"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
    >
      {theme === 'dark' ? (
        <>
          <SunMedium className="h-3.5 w-3.5 text-amber-400" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <MoonStar className="h-3.5 w-3.5 text-indigo-400" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  )
}

