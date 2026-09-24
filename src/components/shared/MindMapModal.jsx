import { useState, useEffect, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react'
import {
  NODE_W, NODE_H, CHILD_W, CHILD_H, COL_GAP, ROW_GAP, EXPANDER_GAP,
  getChildTitle,
} from './mindMapUtils'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.15

const STATUS_STROKE = {
  completed: '#10b981',
  in_progress: '#f59e0b',
  locked: 'var(--mm-node-stroke)',
}

/**
 * Unified SVG mind-map modal (NotebookLM-style).
 *
 * Replaces the four duplicated copies that lived in LearnSessionPage,
 * QaPage, AssessmentsPage and MindMapPage.
 *
 * Behavior modes:
 * - `onJump(flatParentIdx, childIdx)` — LearnSession mode: node clicks close
 *   the modal and jump into the learning session. Chapter/section children
 *   resolve to their `flat_parent_idx` so navigation lands on the right parent.
 * - `onNodeClick(title)` — Q&A / Assessments mode: node clicks forward the
 *   node title (e.g. to summarize in Q&A or scroll to the matching chunk).
 *
 * Theme: all SVG paints use CSS custom properties (`--mm-*`) defined in
 * index.css for `:root` (light) and `html.dark`, so the modal follows the
 * app theme toggle without per-component logic.
 *
 * A11y: role="dialog" + aria-modal, Escape closes, focus moves to the close
 * button on open and returns to the trigger on close, all interactive SVG
 * nodes are focusable buttons with labels and Enter/Space handlers.
 */
export default function MindMapModal({
  open,
  onClose,
  docCode,
  docTitle,
  nodes,
  currentParentIdx = -1,
  onJump,
  onNodeClick,
  hintText = null,
}) {
  const [expanded, setExpanded] = useState({})
  const [tooltip, setTooltip] = useState(null)
  const [zoom, setZoom] = useState(1)
  const closeBtnRef = useRef(null)
  const restoreFocusRef = useRef(null)

  // Reset per-open state: expand everything, restore default zoom
  useEffect(() => {
    if (open && nodes?.length) {
      const m = {}
      nodes.forEach((_, i) => { m[i] = true })
      setExpanded(m)
      setTooltip(null)
      setZoom(1)
    }
  }, [open, nodes])

  // Focus management + Escape to close
  useEffect(() => {
    if (!open) return
    restoreFocusRef.current = document.activeElement
    closeBtnRef.current?.focus()
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      restoreFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  const clampZoom = useCallback((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100)), [])
  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + ZOOM_STEP)), [clampZoom])
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z - ZOOM_STEP)), [clampZoom])

  // Ctrl/Cmd + wheel zooms; plain wheel keeps native scrolling
  const onWheel = useCallback((e) => {
    if (!(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)))
  }, [clampZoom])

  if (!open) return null

  const parents = nodes || []
  const hasJump = typeof onJump === 'function'
  const hasClick = typeof onNodeClick === 'function'

  const activateNode = (node, pi, ci = 0) => {
    if (hasJump) {
      const target = node?.flat_parent_idx ?? node?.children?.[0]?.flat_parent_idx ?? pi
      onClose()
      onJump(target, ci)
    } else if (hasClick) {
      onNodeClick(node?.title)
    }
  }

  const nodeKeyHandler = (node, pi) => (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activateNode(node, pi)
    }
  }

  // ── Layout calculation ────────────────────────────────────────────────────
  const PADDING = 40
  const parentLayouts = parents.map((p, pi) => {
    const isExp = expanded[pi]
    const childCount = isExp ? (p.children?.length ?? 0) : 0
    const childrenH = childCount > 0 ? childCount * (CHILD_H + ROW_GAP) - ROW_GAP : 0
    const height = Math.max(NODE_H, childrenH)
    return { height, childCount, isExp }
  })

  const totalParentH = parentLayouts.reduce((s, l) => s + l.height + ROW_GAP, -ROW_GAP)
  const SVG_H = Math.max(totalParentH + PADDING * 2, 300)
  const SVG_W = PADDING + NODE_W + COL_GAP + NODE_W + EXPANDER_GAP + COL_GAP + CHILD_W + PADDING

  const rootX = PADDING
  const rootY = SVG_H / 2 - NODE_H / 2
  const parentX = rootX + NODE_W + COL_GAP
  const rootCx = rootX + NODE_W
  const rootCy = rootY + NODE_H / 2

  let cursor = (SVG_H - totalParentH) / 2
  const layouts = parentLayouts.map((l, pi) => {
    const parentY = cursor + l.height / 2 - NODE_H / 2
    const childStartY = cursor + l.height / 2 - (l.childCount * (CHILD_H + ROW_GAP) - ROW_GAP) / 2
    const children = (parents[pi].children || []).map((c, ci) => ({
      x: parentX + NODE_W + EXPANDER_GAP + COL_GAP,
      y: childStartY + ci * (CHILD_H + ROW_GAP),
      label: c.title || getChildTitle(c.content, `Sub-topic ${ci + 1}`),
      node: c,
      ci,
    }))
    cursor += l.height + ROW_GAP
    return { parentY, children, pi }
  })

  // A chapter is "active" when the current flat parent lives inside it
  const isChapterActive = (pi) => {
    if (currentParentIdx < 0) return false
    const chapter = parents[pi]
    if (chapter?.type !== 'chapter') return pi === currentParentIdx
    return (chapter.children || []).some((c) => (c.flat_parent_idx ?? -1) === currentParentIdx)
  }

  const truncate = (text, max = 20) => (!text ? '' : text.length > max ? text.slice(0, max - 2) + '…' : text)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-lg p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${docCode || 'Document'} mind map`}
        className="relative w-full max-w-6xl h-[88vh] rounded-3xl border border-slate-800 bg-[#0B0F17] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-300 text-base">🗺</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{docCode} — Document Mind Map</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click <span className="text-emerald-300 font-semibold">›</span> to expand sections
                {hintText
                  ? <> · Click any <span className="text-emerald-300 font-semibold">node</span> {hintText}</>
                  : <> · Click <span className="text-emerald-300 font-semibold">sub-topic nodes</span> to jump to content</>}
                {hasJump ? '' : ''} · Ctrl + scroll to zoom
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close mind map"
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 overflow-auto bg-[#080D18] relative mind-map-canvas" onWheel={onWheel}>
          <svg
            width={SVG_W * zoom}
            height={SVG_H * zoom}
            className="block"
            style={{ minHeight: SVG_H * zoom, minWidth: SVG_W * zoom }}
            role="img"
            aria-label={`Mind map of ${docTitle || docCode}`}
          >
            <g transform={`scale(${zoom})`}>
              <defs>
                <filter id="mm-glow-indigo">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <linearGradient id="mm-rootGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>

              {/* Root → Parent connector lines */}
              {layouts.map(({ parentY, pi }) => {
                const px = parentX
                const py = parentY + NODE_H / 2
                const cx1 = rootCx + (px - rootCx) * 0.5
                const active = isChapterActive(pi)
                return (
                  <path
                    key={`rp-${pi}`}
                    d={`M ${rootCx} ${rootCy} C ${cx1} ${rootCy}, ${cx1} ${py}, ${px} ${py}`}
                    fill="none"
                    stroke={active ? 'var(--mm-line-active)' : 'var(--mm-line)'}
                    strokeWidth={active ? 2 : 1.5}
                    strokeDasharray={active ? '' : '5 4'}
                    opacity={0.7}
                  />
                )
              })}

              {/* Parent → Child connector lines */}
              {layouts.map(({ parentY, children, pi }) => {
                if (!expanded[pi] || !children.length) return null
                const pRx = parentX + NODE_W + EXPANDER_GAP
                const pCy = parentY + NODE_H / 2
                return children.map(({ x, y, ci }) => {
                  const cy = y + CHILD_H / 2
                  const cx1 = pRx + (x - pRx) * 0.5
                  return (
                    <path
                      key={`pc-${pi}-${ci}`}
                      d={`M ${pRx} ${pCy} C ${cx1} ${pCy}, ${cx1} ${cy}, ${x} ${cy}`}
                      fill="none" stroke="var(--mm-child-stroke)" strokeWidth={1.5} opacity={0.35}
                    />
                  )
                })
              })}

              {/* Root Node */}
              <g
                role="button" tabIndex={0} aria-label={`Document root: ${docTitle || docCode}`}
                style={{ cursor: hasClick || hasJump ? 'pointer' : 'default' }}
                onClick={() => activateNode({ title: docTitle, flat_parent_idx: 0 }, 0)}
                onKeyDown={nodeKeyHandler({ title: docTitle, flat_parent_idx: 0 }, 0)}
              >
                <rect x={rootX} y={rootY} width={NODE_W} height={NODE_H} rx={18}
                  fill="url(#mm-rootGrad)" filter="url(#mm-glow-indigo)" />
                <text x={rootX + NODE_W / 2} y={rootY + NODE_H / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#ffffff" fontSize={11} fontWeight="bold" fontFamily="var(--mm-font)">
                  {truncate(docTitle, 22)}
                </text>
              </g>

              {/* Parent Section Nodes */}
              {layouts.map(({ parentY, children, pi }) => {
                const parent = parents[pi]
                const isExp = expanded[pi]
                const hasChildren = children.length > 0
                const active = isChapterActive(pi)
                const stroke = active ? 'var(--mm-node-active-stroke)' : (STATUS_STROKE[parent?.status] ?? 'var(--mm-node-stroke)')

                return (
                  <g key={`par-${pi}`}>
                    <g
                      role="button" tabIndex={0}
                      aria-label={`${parent.title}${active ? ' (current section)' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => activateNode(parent, pi)}
                      onKeyDown={nodeKeyHandler(parent, pi)}
                    >
                      <rect x={parentX} y={parentY} width={NODE_W} height={NODE_H} rx={10}
                        fill={active ? 'var(--mm-node-active-fill)' : 'var(--mm-node-fill)'}
                        stroke={stroke}
                        strokeWidth={active ? 2 : 1.5}
                      />
                      <text x={parentX + 10} y={parentY + NODE_H / 2}
                        dominantBaseline="middle"
                        fill={active ? 'var(--mm-node-active-text)' : 'var(--mm-node-text)'}
                        fontSize={10.5} fontWeight={active ? 'bold' : '500'} fontFamily="var(--mm-font)"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {truncate(parent.title)}
                      </text>
                    </g>

                    {hintText && (
                      <text x={parentX + 10} y={parentY + NODE_H + 10}
                        fill="var(--mm-hint-text)" fontSize={8.5} fontFamily="var(--mm-font)"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                        opacity={0.7}
                      >
                        ✨ {hintText}
                      </text>
                    )}

                    {/* Expand/Collapse button */}
                    {hasChildren && (
                      <g
                        className={`mind-map-expander ${isExp ? 'is-expanded' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`${isExp ? 'Collapse' : 'Expand'} ${parent.title}`}
                        aria-expanded={isExp}
                        onClick={() => setExpanded(prev => ({ ...prev, [pi]: !prev[pi] }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setExpanded(prev => ({ ...prev, [pi]: !prev[pi] }))
                          }
                        }}
                      >
                        <circle cx={parentX + NODE_W + EXPANDER_GAP} cy={parentY + NODE_H / 2} r={10}
                          fill="var(--mm-chip-fill)" stroke={isExp ? 'var(--mm-expander-stroke-active)' : 'var(--mm-chip-stroke)'} strokeWidth={1.5} />
                        <text x={parentX + NODE_W + EXPANDER_GAP} y={parentY + NODE_H / 2}
                          textAnchor="middle" dominantBaseline="middle"
                          fill={isExp ? 'var(--mm-chip-text-active)' : 'var(--mm-chip-text)'}
                          fontSize={12} fontFamily="var(--mm-font)" fontWeight="bold"
                          style={{ pointerEvents: 'none' }}>
                          ›
                        </text>
                      </g>
                    )}

                    {/* Child Sub-topic Nodes */}
                    {isExp && children.map(({ x, y, label, node, ci }) => (
                      <g key={`ch-${pi}-${ci}-${isExp ? 'open' : 'closed'}`} className="mind-map-child" style={{ animationDelay: `${Math.min(ci * 28, 140)}ms` }}>
                        <g
                          role="button" tabIndex={0} aria-label={label}
                          style={{ cursor: 'pointer' }}
                          onClick={() => activateNode(node, pi, 0)}
                          onKeyDown={nodeKeyHandler(node, pi)}
                          onMouseEnter={() => setTooltip({ text: label, svgX: x, svgY: y - 14 })}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <rect x={x} y={y} width={CHILD_W} height={CHILD_H} rx={8}
                            fill="var(--mm-child-fill)" stroke="var(--mm-child-stroke)" strokeWidth={1} opacity={0.85} />
                          <circle cx={x + 10} cy={y + CHILD_H / 2} r={3} fill="var(--mm-child-dot)" style={{ pointerEvents: 'none' }} />
                          <text x={x + 20} y={y + CHILD_H / 2}
                            dominantBaseline="middle" fill="var(--mm-child-text)"
                            fontSize={10} fontFamily="var(--mm-font)" fontWeight="500"
                            style={{ userSelect: 'none', pointerEvents: 'none' }}>
                            {label}
                          </text>
                        </g>
                      </g>
                    ))}
                  </g>
                )
              })}

              {/* Tooltip */}
              {tooltip && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={tooltip.svgX} y={tooltip.svgY - 16}
                    width={Math.min(tooltip.text.length * 6.5 + 16, 280)} height={22}
                    rx={6} fill="var(--mm-tooltip-fill)" stroke="var(--mm-chip-stroke)" strokeWidth={1} />
                  <text x={tooltip.svgX + 8} y={tooltip.svgY - 5}
                    fill="var(--mm-tooltip-text)" fontSize={10} fontFamily="var(--mm-font)">{tooltip.text}</text>
                </g>
              )}
            </g>
          </svg>

          {/* Zoom controls */}
          <div
            className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/90 backdrop-blur px-1.5 py-1 shadow-lg"
            role="toolbar"
            aria-label="Zoom controls"
          >
            <button
              onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-semibold text-slate-300 w-10 text-center tabular-nums" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <span className="w-px h-4 bg-slate-700 mx-0.5" aria-hidden="true" />
            <button
              onClick={() => setZoom(1)} aria-label="Reset zoom"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
