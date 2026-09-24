// Shared mind-map helpers — single source of truth for all mind-map surfaces
// (LearnSessionPage, QaPage, AssessmentsPage, MindMapPage).

export const NODE_W = 180
export const NODE_H = 36
export const CHILD_W = 180
export const CHILD_H = 32
export const COL_GAP = 110 // horizontal gap between columns
export const ROW_GAP = 14 // vertical gap between sibling nodes
export const EXPANDER_R = 10 // expand/collapse hit-circle radius
export const EXPANDER_GAP = 18 // gap between parent node edge and expander center

// ─── Node status → Tailwind classes (used by list-style views) ──────────────
export const STATUS_CONFIG = {
  completed:   { dot: 'bg-emerald-500', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Completed' },
  in_progress: { dot: 'bg-amber-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'In Progress' },
  locked:      { dot: 'bg-slate-700', border: 'border-slate-800', bg: 'bg-slate-900/60', text: 'text-slate-500', label: 'Locked' },
}

// ─── Derive a human-readable title from raw chunk content ───────────────────
export function getChildTitle(content, fallback) {
  if (!content) return fallback
  let cleanContent = content.trim()
  if (cleanContent.startsWith('[Preceding Section:')) {
    const closeBracketIdx = cleanContent.indexOf(']')
    if (closeBracketIdx !== -1) {
      cleanContent = cleanContent.slice(closeBracketIdx + 1).trim()
      if (cleanContent.startsWith('...')) {
        const firstNewlineIdx = cleanContent.indexOf('\n')
        if (firstNewlineIdx !== -1) {
          cleanContent = cleanContent.slice(firstNewlineIdx + 1).trim()
        }
      }
    }
  }
  const lines = cleanContent.split('\n')
  for (const line of lines) {
    const clean = line
      .replace(/<[^>]+>/g, '')
      .replace(/\|\d+\|?/g, '')
      .replace(/^#{1,6}\s+/, '')
      .replace(/[*_`~]/g, '')
      .replace(/[\{\}\/\*#`\[\]]/g, '')
      .replace(/^\s*[-•>|]/g, '')
      .trim()
    if (clean.length > 3 && !/^[{}();,\\]/.test(clean)) return clean.length > 50 ? clean.slice(0, 47) + '…' : clean
  }
  return fallback
}

// ─── Truncate a label for a fixed-width SVG node ────────────────────────────
export function truncateLabel(text, max = 20) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max - 2) + '…' : text
}
