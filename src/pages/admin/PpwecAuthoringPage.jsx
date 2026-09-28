import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  BadgeCheck, CheckCircle2, ChevronDown, ChevronRight, Download, FileJson,
  FlaskConical, Lock, Pencil, Plus, Save, ShieldCheck, Snowflake, Upload, XCircle,
} from 'lucide-react'
import { ppwecAdminApi } from '@/api/ppwecAdmin'

const STATUS_STYLES = {
  draft: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  reviewed: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  approved: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  final: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
}

const STAGE_LABELS = {
  content_owner: 'Content Owner',
  md_leadership: 'MD / Leadership',
  ux: 'UX Review',
  pilot: 'Pilot (5-10 employees)',
}

const SECTION_OPTIONS = ['opening', 'learning', 'application', 'assessment', 'reflection', 'commitment', 'challenge', 'closure']
const INTERACTION_OPTIONS = ['content', 'click_reveal', 'choice', 'multi_choice', 'drag_sort', 'classification', 'simulation', 'branching', 'reflection', 'assessment', 'challenge', 'commitment', 'completion']

function StatusBadge({ status, version }) {
  return (
    <span className='flex items-center gap-1.5'>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
        {status}
      </span>
      {version && <span className='font-mono text-[10px] text-slate-500'>{version}</span>}
    </span>
  )
}

/* ─── module list ──────────────────────────────────────────────────────────── */

function ModuleList({ modules, selected, onSelect }) {
  const [open, setOpen] = useState(false)
  return (
    <div className='rounded-2xl border border-slate-800 bg-[#131825]'>
      <button onClick={() => setOpen(o => !o)} className='flex w-full items-center justify-between px-4 py-3'>
        <p className='text-sm font-bold text-slate-200'>Modules ({modules.length})</p>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className='max-h-72 overflow-y-auto border-t border-slate-800'>
          {modules.map(m => (
            <button key={m.module_number}
              onClick={() => onSelect(m.module_number)}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-800/40 ${selected === m.module_number ? 'bg-cyan-500/10' : ''}`}>
              <span className='truncate text-xs font-semibold text-slate-200'>
                M{String(m.module_number).padStart(2, '0')} · {m.title}
              </span>
              <StatusBadge status={m.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── §X validation report ─────────────────────────────────────────────────── */

function ValidationReport({ report }) {
  if (!report) return null
  return (
    <div className={`rounded-2xl border p-4 ${report.ok ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
      <div className='flex items-center justify-between'>
        <p className='flex items-center gap-2 text-sm font-bold text-slate-100'>
          {report.ok ? <CheckCircle2 className='h-4 w-4 text-emerald-400' /> : <XCircle className='h-4 w-4 text-rose-400' />}
          §X QA Validation {report.ok ? 'PASSED' : 'FAILED'}
        </p>
        <span className='text-[11px] text-slate-400'>
          {report.summary.screens} screens · {report.summary.questions} questions · {report.summary.errors} errors · {report.summary.warnings} warnings
        </span>
      </div>
      {report.errors.length > 0 && (
        <ul className='mt-2 space-y-1'>
          {report.errors.slice(0, 8).map((e, i) => (
            <li key={i} className='text-[11px] text-rose-300'>
              <span className='font-mono font-bold'>{e.code}</span>{e.screen ? ` (screen ${e.screen})` : ''}: {e.message}
            </li>
          ))}
          {report.errors.length > 8 && <li className='text-[11px] text-rose-300'>+{report.errors.length - 8} more…</li>}
        </ul>
      )}
      {report.warnings.length > 0 && (
        <details className='mt-2'>
          <summary className='cursor-pointer text-[11px] font-semibold text-amber-400'>{report.warnings.length} warnings</summary>
          <ul className='mt-1 space-y-1'>
            {report.warnings.slice(0, 8).map((w, i) => (
              <li key={i} className='text-[11px] text-amber-300/90'>
                <span className='font-mono font-bold'>{w.code}</span>{w.screen ? ` (screen ${w.screen})` : ''}: {w.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

/* ─── gate panel (§Y) ──────────────────────────────────────────────────────── */

function GatePanel({ moduleNumber, gate, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')

  const act = async (fn, okMsg) => {
    setBusy(true)
    try {
      await fn()
      toast.success(okMsg)
      onChanged?.()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Action failed')
    } finally { setBusy(false) }
  }

  if (!gate) return null

  return (
    <div className='rounded-2xl border border-slate-800 bg-[#131825] p-4'>
      <div className='flex items-center justify-between'>
        <p className='flex items-center gap-2 text-sm font-bold text-slate-100'>
          <ShieldCheck className='h-4 w-4 text-indigo-400' /> §Y Approval Gate
        </p>
        {gate.gate_open
          ? <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400'>GATE GREEN</span>
          : <span className='rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400'>IN REVIEW</span>}
      </div>

      {/* stage pills */}
      <div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4'>
        {Object.entries(gate.stages).map(([stage, state]) => (
          <div key={stage} className={`rounded-xl border p-2 ${
            state === 'approved' ? 'border-emerald-500/40 bg-emerald-500/5'
              : state === 'changes_requested' ? 'border-rose-500/40 bg-rose-500/5'
                : 'border-slate-700 bg-slate-800/30'}`}>
            <p className='text-[10px] font-bold text-slate-300'>{STAGE_LABELS[stage]}</p>
            <p className={`text-[10px] font-bold ${state === 'approved' ? 'text-emerald-400' : state === 'changes_requested' ? 'text-rose-400' : 'text-slate-500'}`}>
              {state === 'approved' ? '✓ approved' : state === 'changes_requested' ? '✗ changes requested' : 'pending'}
            </p>
            {stage === 'pilot' && (
              <p className='mt-0.5 text-[9px] text-slate-500'>{gate.pilot.responses}/{gate.pilot.target_responses} responses</p>
            )}
          </div>
        ))}
      </div>

      {/* pilot aggregate */}
      {gate.pilot.responses > 0 && (
        <div className='mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400'>
          <span>Engagement <b className='text-slate-200'>{gate.pilot.avg.engagement ?? '—'}</b></span>
          <span>Relevance <b className='text-slate-200'>{gate.pilot.avg.relevance ?? '—'}</b></span>
          <span>Realism <b className='text-slate-200'>{gate.pilot.avg.realism ?? '—'}</b></span>
          <span>Clarity <b className='text-slate-200'>{gate.pilot.avg.clarity ?? '—'}</b></span>
          <span>Functions: <b className='text-slate-200'>{gate.pilot.functions_covered.join(', ') || '—'}</b></span>
        </div>
      )}

      {/* actions */}
      <div className='mt-3 flex flex-wrap items-center gap-2'>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder='review notes (optional)'
          className='min-w-40 flex-1 rounded-xl border border-slate-700 bg-[#0D1320] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600' />
        <button disabled={busy} onClick={() => act(() => ppwecAdminApi.signoff(moduleNumber, { stage: 'content_owner', decision: 'approved', notes }), 'Content-owner sign-off recorded')}
          className='rounded-xl bg-sky-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-sky-500 disabled:opacity-50'>Sign-off CO</button>
        <button disabled={busy} onClick={() => act(() => ppwecAdminApi.signoff(moduleNumber, { stage: 'md_leadership', decision: 'approved', notes }), 'MD sign-off recorded')}
          className='rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-indigo-500 disabled:opacity-50'>Sign-off MD</button>
        <button disabled={busy} onClick={() => act(() => ppwecAdminApi.signoff(moduleNumber, { stage: 'ux', decision: 'approved', notes }), 'UX sign-off recorded')}
          className='rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-violet-500 disabled:opacity-50'>Sign-off UX</button>
        <button disabled={busy} onClick={() => act(() => ppwecAdminApi.signoff(moduleNumber, { stage: 'pilot', decision: 'approved', notes }), 'Pilot sign-off recorded')}
          className='rounded-xl bg-cyan-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-cyan-500 disabled:opacity-50'>Sign-off Pilot</button>
        {gate.design_frozen ? (
          <button disabled={busy} onClick={() => act(() => ppwecAdminApi.freeze(moduleNumber, false), 'Design freeze lifted')}
            className='flex items-center gap-1.5 rounded-xl bg-rose-600/80 px-3 py-2 text-[11px] font-bold text-white hover:bg-rose-500 disabled:opacity-50'>
            <Snowflake className='h-3.5 w-3.5' /> Unfreeze
          </button>
        ) : (
          <button disabled={busy} onClick={() => act(() => ppwecAdminApi.freeze(moduleNumber, true), 'Design frozen — template locked')}
            className='flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50'>
            <Lock className='h-3.5 w-3.5' /> Design Freeze
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── screens editor ───────────────────────────────────────────────────────── */

function ScreenEditor({ moduleNumber, screen, onSaved }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(screen)
  const [busy, setBusy] = useState(false)

  useEffect(() => setForm({ ...screen, interaction_payload: screen.interaction_payload || {} }), [screen])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setBusy(true)
    try {
      await ppwecAdminApi.upsertScreen(moduleNumber, {
        screen_number: form.screen_number, section: form.section, title: form.title,
        on_screen_text: form.on_screen_text ?? [], voice_over: form.voice_over ?? null,
        audio_url: form.audio_url ?? null, caption_url: form.caption_url ?? null,
        transcript: form.transcript ?? null, video_url: form.video_url ?? null,
        visual_direction: form.visual_direction ?? null,
        interaction_type: form.interaction_type,
        interaction_payload: form.interaction_payload ?? {},
        is_mandatory: form.is_mandatory ?? true,
        estimated_seconds: form.estimated_seconds ?? 60,
        pulse_anchor: form.pulse_anchor ?? null, md_philosophy: form.md_philosophy ?? false,
      })
      toast.success(`Screen ${form.screen_number} saved`)
      onSaved?.()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed')
    } finally { setBusy(false) }
  }

  const payloadOk = (() => {
    try { JSON.stringify(form.interaction_payload); return true } catch { return false }
  })()

  return (
    <div className='rounded-2xl border border-slate-800 bg-[#131825]'>
      <button onClick={() => setOpen(o => !o)} className='flex w-full items-center gap-2 px-4 py-2.5 text-left'>
        {open ? <ChevronDown className='h-3.5 w-3.5 text-slate-500' /> : <ChevronRight className='h-3.5 w-3.5 text-slate-500' />}
        <span className='w-10 shrink-0 font-mono text-[10px] text-slate-500'>S{String(screen.screen_number).padStart(2, '0')}</span>
        <span className='min-w-0 flex-1 truncate text-xs font-semibold text-slate-200'>{screen.title}</span>
        <span className='hidden shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-400 sm:inline'>{screen.interaction_type}</span>
        {screen.audio_url ? <span className='h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500' title='audio ready' /> : <span className='h-1.5 w-1.5 shrink-0 rounded-full bg-slate-700' title='no audio' />}
      </button>

      {open && (
        <div className='space-y-2.5 border-t border-slate-800 p-4'>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
            <label className='text-[10px] font-bold text-slate-400'>Screen #<input type='number' value={form.screen_number} onChange={e => set('screen_number', Number(e.target.value))} className='mt-0.5 w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200' /></label>
            <label className='text-[10px] font-bold text-slate-400'>Section
              <select value={form.section} onChange={e => set('section', e.target.value)} className='mt-0.5 w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200'>
                {SECTION_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select></label>
            <label className='text-[10px] font-bold text-slate-400'>Interaction
              <select value={form.interaction_type} onChange={e => set('interaction_type', e.target.value)} className='mt-0.5 w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200'>
                {INTERACTION_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select></label>
            <label className='text-[10px] font-bold text-slate-400'>Est. seconds<input type='number' value={form.estimated_seconds ?? 60} onChange={e => set('estimated_seconds', Number(e.target.value))} className='mt-0.5 w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200' /></label>
          </div>

          <label className='block text-[10px] font-bold text-slate-400'>Title<input value={form.title || ''} onChange={e => set('title', e.target.value)} className='mt-0.5 w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200' /></label>

          <label className='block text-[10px] font-bold text-slate-400'>Voice-over script<textarea rows={2} value={form.voice_over || ''} onChange={e => set('voice_over', e.target.value)} className='mt-0.5 w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200' /></label>

          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
            <label className='block text-[10px] font-bold text-slate-400'>Audio URL<input value={form.audio_url || ''} onChange={e => set('audio_url', e.target.value || null)} placeholder='ppwec/M01-S01.mp3' className='mt-0.5 w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 font-mono text-[11px] text-slate-200 placeholder:text-slate-600' /></label>
            <label className='block text-[10px] font-bold text-slate-400'>Captions URL (.vtt)<input value={form.caption_url || ''} onChange={e => set('caption_url', e.target.value || null)} placeholder='ppwec/M01-S01.vtt' className='mt-0.5 w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 font-mono text-[11px] text-slate-200 placeholder:text-slate-600' /></label>
          </div>

          <label className='block text-[10px] font-bold text-slate-400'>Interaction payload (JSON)
            <textarea rows={5} value={JSON.stringify(form.interaction_payload ?? {}, null, 2)}
              onChange={e => set('interaction_payload', (() => { try { return JSON.parse(e.target.value) } catch { return form.interaction_payload } })())}
              className={`mt-0.5 w-full rounded-lg border bg-[#0D1320] px-2 py-1.5 font-mono text-[11px] ${payloadOk ? 'border-slate-700 text-slate-200' : 'border-rose-600 text-rose-300'}`} />
          </label>

          <div className='flex items-center justify-between'>
            <label className='flex items-center gap-1.5 text-[11px] font-semibold text-slate-300'>
              <input type='checkbox' checked={!!form.is_mandatory} onChange={e => set('is_mandatory', e.target.checked)} /> Mandatory
            </label>
            <button onClick={save} disabled={busy || !payloadOk}
              className='flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50'>
              <Save className='h-3.5 w-3.5' /> Save screen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── questions editor ─────────────────────────────────────────────────────── */

function QuestionsEditor({ moduleNumber, questions, onChanged }) {
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)

  const blank = { question_type: 'knowledge', case_context: '', question_text: '', options: [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }], correct_option: 'A', feedback_why: '', feedback_better: '', is_active: true }

  const save = async () => {
    setBusy(true)
    try {
      await ppwecAdminApi.upsertQuestion(moduleNumber, draft)
      toast.success('Question added to the bank')
      setDraft(null)
      onChanged?.()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed')
    } finally { setBusy(false) }
  }

  return (
    <div className='rounded-2xl border border-slate-800 bg-[#131825] p-4'>
      <div className='flex items-center justify-between'>
        <p className='text-sm font-bold text-slate-200'>Assessment bank ({questions.length} questions)</p>
        <button onClick={() => setDraft({ ...blank })} className='flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-cyan-500'>
          <Plus className='h-3.5 w-3.5' /> Add question
        </button>
      </div>
      <ul className='mt-2 space-y-1'>
        {questions.slice(0, 5).map((q, i) => (
          <li key={q.id ?? i} className='truncate text-[11px] text-slate-400'>
            <span className='mr-1.5 rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-slate-500'>{q.question_type}</span>
            {q.question_text} <span className='font-mono text-emerald-500'>→ {q.correct_option}</span>
          </li>
        ))}
        {questions.length > 5 && <li className='text-[11px] text-slate-500'>+{questions.length - 5} more…</li>}
      </ul>

      {draft && (
        <div className='mt-3 space-y-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3'>
          <input value={draft.question_text} onChange={e => setDraft(d => ({ ...d, question_text: e.target.value }))} placeholder='Question text'
            className='w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200' />
          {draft.options.map((o, i) => (
            <div key={i} className='flex items-center gap-2'>
              <button onClick={() => setDraft(d => ({ ...d, correct_option: o.key }))}
                title='mark correct'
                className={`h-6 w-6 shrink-0 rounded-full text-[10px] font-bold ${draft.correct_option === o.key ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {o.key}
              </button>
              <input value={o.text} onChange={e => setDraft(d => ({
                ...d, options: d.options.map((oo, j) => j === i ? { ...oo, text: e.target.value } : oo),
              }))} placeholder={`Option ${o.key}`} className='flex-1 rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200' />
            </div>
          ))}
          <textarea rows={2} value={draft.feedback_why || ''} onChange={e => setDraft(d => ({ ...d, feedback_why: e.target.value }))} placeholder='§17 Why this matters…' className='w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200' />
          <textarea rows={2} value={draft.feedback_better || ''} onChange={e => setDraft(d => ({ ...d, feedback_better: e.target.value }))} placeholder='§17 Better approach…' className='w-full rounded-lg border border-slate-700 bg-[#0D1320] px-2 py-1.5 text-xs text-slate-200' />
          <div className='flex justify-end gap-2'>
            <button onClick={() => setDraft(null)} className='rounded-xl border border-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-300'>Cancel</button>
            <button onClick={save} disabled={busy || !draft.question_text} className='rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50'>Save question</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── main page ────────────────────────────────────────────────────────────── */

export default function PpwecAuthoringPage() {
  const [modules, setModules] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [validation, setValidation] = useState(null)
  const [gate, setGate] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const [importReport, setImportReport] = useState(null)

  const loadCatalog = useCallback(async () => {
    const { data } = await ppwecAdminApi.listModules()
    setModules(data)
    if (!selected && data.length) setSelected(data[0].module_number)
  }, [selected])

  const loadModule = useCallback(async (n) => {
    const [d, v, g] = await Promise.all([
      ppwecAdminApi.getModule(n).catch(() => null),
      ppwecAdminApi.validate(n).catch(() => null),
      ppwecAdminApi.gateStatus(n).catch(() => null),
    ])
    setDetail(d?.data || null)
    setValidation(v?.data || null)
    setGate(g?.data || null)
  }, [])

  useEffect(() => { loadCatalog() }, [loadCatalog])
  useEffect(() => { if (selected) loadModule(selected) }, [selected, loadModule])

  const refreshAll = () => { loadModule(selected); loadCatalog() }

  const doExport = async () => {
    try {
      const data = await ppwecAdminApi.exportModule(selected)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `ppwec-module-${String(selected).padStart(2, '0')}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success('Module JSON exported')
    } catch { toast.error('Export failed') }
  }

  const doImport = async (file) => {
    setBusy(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const { data } = await ppwecAdminApi.importModule({ ...parsed, replace: true })
      setImportReport(data.validation)
      toast.success(`Imported: ${data.screens} screens, ${data.questions} questions`)
      refreshAll()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Import failed (invalid JSON or payload)')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const screens = detail?.screens || []
  const questions = validation?.summary ? [] : [] // questions come from export payload
  const [questions_, setQuestions_] = useState([])

  useEffect(() => {
    if (!selected) return
    ppwecAdminApi.exportModule(selected)
      .then(data => setQuestions_(data.questions || []))
      .catch(() => setQuestions_([]))
  }, [selected, detail])

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='flex items-center gap-2 text-xl font-bold text-slate-100'>
            <Pencil className='h-5 w-5 text-cyan-400' /> PPWEC Content Studio
          </h1>
          <p className='mt-0.5 text-xs text-slate-400'>
            Author screens & banks, validate against the §X checklist, run the §Y gate, freeze the design.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button onClick={doExport} className='flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800'>
            <Download className='h-3.5 w-3.5' /> Export JSON
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className='flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50'>
            <Upload className='h-3.5 w-3.5' /> Import JSON
          </button>
          <input ref={fileRef} type='file' accept='application/json,.json' hidden onChange={e => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
      </div>

      <ModuleList modules={modules} selected={selected} onSelect={setSelected} />

      {detail && (
        <>
          {/* module header */}
          <div className='rounded-2xl border border-slate-800 bg-[#131825] p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-widest text-cyan-400'>Module {detail.module_number} of 18</p>
                <h2 className='text-base font-bold text-slate-100'>{detail.title}</h2>
                <p className='text-xs italic text-slate-400'>&quot;{detail.theme}&quot;</p>
              </div>
              <div className='flex items-center gap-2'>
                <StatusBadge status={detail.status} version={detail.version} />
                {gate?.design_frozen && (
                  <span className='flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-300'>
                    <Snowflake className='h-3 w-3' /> frozen {gate.frozen_at?.slice(0, 10)}
                  </span>
                )}
              </div>
            </div>
            <p className='mt-2 text-[11px] text-slate-500'>
              Content owner: {detail.content_owner || '—'} · {screens.length} screens · passing {detail.passing_score}%
            </p>
          </div>

          <ValidationReport report={validation} />
          {importReport && <ValidationReport report={importReport} />}

          <GatePanel moduleNumber={selected} gate={gate} onChanged={refreshAll} />

          <QuestionsEditor moduleNumber={selected} questions={questions_} onChanged={refreshAll} />

          {/* screens */}
          <div className='space-y-2'>
            <p className='text-sm font-bold text-slate-200'>Screens ({screens.length})</p>
            {screens.map(s => (
              <ScreenEditor key={s.id} moduleNumber={selected} screen={s} onSaved={refreshAll} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
