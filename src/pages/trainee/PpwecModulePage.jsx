import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import ppwecApi from '@/api/ppwec'
import PpwecCertificateModal from '@/components/ppwec/PpwecCertificateModal'
import PpwecCelebration from '@/components/ppwec/PpwecCelebration'
import {
  ChevronLeft, ChevronRight, Home, Lock, CheckCircle2, Volume2, Captions,
  Play, Award, GripVertical, ArrowRight, RotateCcw, Trophy, Medal, Sparkles,
  ClipboardCheck, MousePointerClick,
} from 'lucide-react'

/* ─── content-block renderer (§7: short text + visuals, never walls of text) ─── */

function Blocks({ blocks }) {
  if (!blocks) return null
  const list = Array.isArray(blocks) ? blocks : [blocks]
  return (
    <div className='space-y-4'>
      {list.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return <h3 key={i} className='text-xl font-bold text-slate-100'>{b.text}</h3>
          case 'callout':
            return (
              <div key={i} className='rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200'>
                {b.text}
              </div>
            )
          case 'pulse_moment':
            return (
              <div key={i} className='rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-200'>
                ✦ Pulse Moment — {b.text}
              </div>
            )
          case 'pulse_principle':
            return (
              <div key={i} className='rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm font-semibold text-indigo-200'>
                Pulse Principle — {b.text}
              </div>
            )
          case 'scenario':
          case 'story':
            return (
              <div key={i} className='rounded-2xl border border-slate-700 bg-[#111827] p-4 text-sm leading-relaxed text-slate-200'>
                <span className='mr-2 font-bold uppercase tracking-wider text-cyan-400 text-[10px]'>Scenario</span>
                {b.text}
              </div>
            )
          case 'note':
            return <p key={i} className='text-xs italic text-slate-400'>{b.text}</p>
          case 'checklist':
            return (
              <ul key={i} className='space-y-1.5'>
                {(b.items || []).map((item, j) => (
                  <li key={j} className='flex items-start gap-2 text-sm text-slate-300'>
                    <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-400' /> {item}
                  </li>
                ))}
              </ul>
            )
          case 'steps':
            return (
              <ol key={i} className='space-y-2'>
                {(b.items || []).map((item, j) => (
                  <li key={j} className='flex items-start gap-3 text-sm text-slate-300'>
                    <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300'>{j + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
            )
          case 'animation':
            return (
              <div key={i} className='flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700 bg-[#111827] p-4 text-sm text-slate-200'>
                {b.text.split('→').map((part, j, arr) => (
                  <span key={j} className='flex items-center gap-2'>
                    <span className='rounded-lg bg-slate-800 px-2.5 py-1 font-semibold'>{part.trim()}</span>
                    {j < arr.length - 1 && <ArrowRight className='h-4 w-4 text-cyan-400' />}
                  </span>
                ))}
              </div>
            )
          default:
            return <p key={i} className='text-sm leading-relaxed text-slate-300'>{b.text}</p>
        }
      })}
    </div>
  )
}

/* ─── voice-over player (§23: real <audio> with controls, captions, transcript) ─── */

function AudioBar({ screen, moduleNumber }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [src, setSrc] = useState(null)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef(null)
  const hasAsset = !!screen.audio_url

  // Fetch the signed playback URL lazily on first play (JWT never in media URL).
  const ensureSrc = async () => {
    if (src || !hasAsset || loading) return src
    setLoading(true)
    try {
      const resolved = await ppwecApi.getMediaSrc(moduleNumber, screen.screen_number, 'audio')
      setSrc(resolved)
      return resolved
    } catch {
      toast.error('Voice-over unavailable')
      return null
    } finally { setLoading(false) }
  }

  if (!screen.voice_over && !hasAsset) return null

  return (
    <div className='rounded-2xl border border-slate-800 bg-[#0F1420] p-3'>
      <div className='flex items-center gap-3'>
        <button
          className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50'
          aria-label={hasAsset ? 'Play voice-over' : 'Voice-over script (audio pending)'}
          title={hasAsset ? 'Play voice-over' : 'Audio asset pending — script shown'}
          disabled={loading}
          onClick={async () => {
            if (!hasAsset) return
            const s = await ensureSrc()
            if (s && audioRef.current) {
              try { await audioRef.current.play() } catch { /* user gesture race */ }
            }
          }}
        >
          {loading ? <Volume2 className='h-4 w-4 animate-pulse' /> : <Play className='h-4 w-4' />}
        </button>
        <div className='min-w-0 flex-1'>
          <p className='flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500'>
            <Volume2 className='h-3 w-3' /> Voice-over
          </p>
          <p className='truncate text-xs text-slate-400'>{screen.voice_over || '—'}</p>
        </div>
        {(screen.transcript || screen.voice_over) && (
          <button
            onClick={() => setShowTranscript(v => !v)}
            className='flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-slate-800'
            aria-expanded={showTranscript}
          >
            <Captions className='h-3.5 w-3.5' /> Transcript
          </button>
        )}
      </div>
      {/* §23 audio controls: native element gives play/pause, seek, volume, speed */}
      {hasAsset && src && (
        <audio
          ref={audioRef}
          src={src}
          controls
          preload='none'
          className='mt-2 h-9 w-full'
          aria-label='Voice-over playback'
        >
          {screen.caption_url && <track kind='captions' />}
        </audio>
      )}
      {showTranscript && (
        <p className='mt-2 rounded-xl bg-slate-900 p-3 text-xs leading-relaxed text-slate-300'>
          {screen.transcript || screen.voice_over}
        </p>
      )}
    </div>
  )
}

/* ─── video block (§12 / §W: MD & leadership videos drop in without redesign) ─── */

function VideoBlock({ screen, moduleNumber }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)
  const hasAsset = !!screen.video_url
  if (!hasAsset) return null

  // External URLs render directly; local assets need a signed playback URL.
  const isExternal = /^https?:\/\//.test(screen.video_url)
  if (isExternal && !src) { setSrc(screen.video_url) }

  if (failed) {
    return (
      <div className='rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200'>
        Video could not be loaded — please continue; the transcript above covers the narration.
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-2xl border border-slate-700 bg-black' role='region' aria-label={`Video: ${screen.title}`}>
      {!src ? (
        <button
          onClick={async () => {
            try {
              setSrc(await ppwecApi.getMediaSrc(moduleNumber, screen.screen_number, 'video'))
            } catch { setFailed(true) }
          }}
          className='flex h-44 w-full flex-col items-center justify-center gap-2 text-slate-300 hover:bg-slate-900 text-white-force'
        >
          <Play className='h-10 w-10 text-white-force' />
          <span className='text-xs font-semibold text-white-force'>Load video</span>
        </button>
      ) : (
        <video src={src} controls preload='metadata' className='h-44 w-full' onError={() => setFailed(true)}>
          {screen.caption_url && <track kind='captions' />}
        </video>
      )}
    </div>
  )
}

/* ─── interaction renderers ─── */

function ClickReveal({ payload, onFirstReveal }) {
  const [revealed, setRevealed] = useState({})
  const items = payload?.items || []
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {items.map(item => {
        const open = !!revealed[item.key]
        return (
          <button
            key={item.key}
            onClick={() => {
              setRevealed(r => {
                if (!r[item.key]) onFirstReveal?.()
                return { ...r, [item.key]: !r[item.key] }
              })
            }}
            className='group rounded-2xl border border-slate-700 bg-[#111827] p-4 text-left transition hover:border-cyan-500/50 hover:bg-slate-800/60'
            aria-expanded={open}
          >
            <span className='flex items-center justify-between gap-2'>
              <span className='text-sm font-bold text-slate-100'>{item.title}</span>
              <MousePointerClick className='h-4 w-4 text-slate-600 group-hover:text-cyan-400' />
            </span>
            <span className='mt-1 block text-xs text-slate-400'>{item.text}</span>
            {open && (
              <span className='mt-3 block rounded-xl bg-cyan-500/10 p-2.5 text-xs text-cyan-200'>
                {item.example}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function ChoiceInteraction({ payload, locked, feedback, onSelect }) {
  const options = payload?.options || []
  return (
    <div className='space-y-3'>
      <p className='text-sm font-semibold text-slate-200'>{payload?.prompt}</p>
      <div className='space-y-2.5' role='radiogroup' aria-label={payload?.prompt}>
        {options.map(o => {
          const chosen = feedback && feedback._selected === o.key
          const isRight = feedback && o.correct
          return (
            <button
              key={o.key}
              disabled={locked}
              onClick={() => onSelect(o.key)}
              className={[
                'w-full rounded-2xl border p-4 text-left text-sm transition',
                chosen && o.correct ? 'border-emerald-500 bg-emerald-500/10 text-emerald-100' : '',
                chosen && !o.correct ? 'border-rose-500 bg-rose-500/10 text-rose-100' : '',
                !chosen && feedback && o.correct ? 'border-emerald-500/40 bg-emerald-500/5 text-slate-200' : '',
                !feedback ? 'border-slate-700 bg-[#111827] text-slate-200 hover:border-cyan-500/50 hover:bg-slate-800/60' : '',
                feedback && !chosen && !o.correct ? 'border-slate-800 bg-[#0D1320] text-slate-500' : '',
              ].filter(Boolean).join(' ')}
              role='radio' aria-checked={chosen}
            >
              <span className='mr-2 font-bold text-cyan-400'>{o.key}.</span>{o.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DragSort({ payload, locked, onFirstDrop }) {
  const items = payload?.items || []
  const targets = payload?.targets || [{ key: 'circle', label: 'Target' }]
  const [placed, setPlaced] = useState({})
  const allPlaced = items.length > 0 && Object.keys(placed).length === items.length

  // click-to-place fallback + HTML5 drag (same learning intent, §V technical adaptation)
  return (
    <div className='space-y-4'>
      <p className='text-sm font-semibold text-slate-200'>{payload?.prompt}</p>
      <div className='flex flex-wrap gap-2'>
        {items.filter(i => !placed[i.key]).map(i => (
          <button
            key={i.key}
            draggable={!locked}
            onDragStart={e => e.dataTransfer.setData('text/plain', i.key)}
            onClick={() => { if (!locked && !placed[i.key]) { setPlaced(p => ({ ...p, [i.key]: targets[0].key })); onFirstDrop?.() } }}
            className='flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:border-cyan-400'
          >
            <GripVertical className='h-3.5 w-3.5 text-slate-500' /> {i.text}
          </button>
        ))}
        {items.every(i => placed[i.key]) && <span className='text-xs italic text-slate-500'>All placed ✓</span>}
      </div>
      {targets.map(t => (
        <div
          key={t.key}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const key = e.dataTransfer.getData('text/plain')
            if (!locked && key && !placed[key]) { setPlaced(p => ({ ...p, [key]: t.key })); onFirstDrop?.() }
          }}
          className={[
            'min-h-[110px] rounded-3xl border-2 border-dashed p-4 transition',
            allPlaced ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-cyan-500/40 bg-cyan-500/5',
          ].join(' ')}
          aria-label={t.label}
        >
          <p className='mb-2 text-xs font-bold uppercase tracking-wider text-cyan-300'>{t.label}</p>
          <div className='flex flex-wrap gap-2'>
            {items.filter(i => placed[i.key] === t.key).map(i => (
              <span key={i.key} className='rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200'>{i.text}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Classification({ payload, locked, onSubmit }) {
  const buckets = payload?.buckets || []
  const items = payload?.items || []
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [done, setDone] = useState(false)
  const current = items[idx]

  if (done) {
    return (
      <div className='space-y-3'>
        {items.map((it, i) => {
          const a = answers[i]
          const right = a === it.answer
          return (
            <div key={i} className={`rounded-2xl border p-3 text-xs ${right ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
              <p className='text-slate-300'>{it.text}</p>
              <p className={`mt-1 font-bold ${right ? 'text-emerald-300' : 'text-rose-300'}`}>
                {right ? '✓' : `✗ You: ${a} · Correct: ${it.answer}`}
              </p>
              <p className='mt-1 text-slate-400'>{it.feedback}</p>
            </div>
          )
        })}
        {!locked && (
          <button onClick={() => { setIdx(0); setAnswers([]); setDone(false) }}
            className='flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:underline'>
            <RotateCcw className='h-3.5 w-3.5' /> Practise again
          </button>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <span className='text-[10px] font-bold uppercase tracking-wider text-slate-500'>Situation {idx + 1} of {items.length}</span>
        <div className='h-1 flex-1 overflow-hidden rounded-full bg-slate-800'>
          <div className='h-full bg-cyan-500 transition-all' style={{ width: `${(idx / items.length) * 100}%` }} />
        </div>
      </div>
      <p className='rounded-2xl border border-slate-700 bg-[#111827] p-4 text-sm text-slate-200'>{current.text}</p>
      <div className='grid gap-2 sm:grid-cols-3'>
        {buckets.map(b => (
          <button
            key={b}
            disabled={locked}
            onClick={() => {
              const next = [...answers]; next[idx] = b; setAnswers(next)
              if (idx + 1 < items.length) setIdx(idx + 1)
              else { setDone(true); onSubmit?.(answers => answers) }
            }}
            className='rounded-2xl border border-slate-600 bg-slate-800 p-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400 hover:bg-slate-700'
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  )
}

function Simulation({ payload, locked, onComplete }) {
  const stages = payload?.stages || []
  const [stage, setStage] = useState(0)
  const [picks, setPicks] = useState([])
  const [showFeedback, setShowFeedback] = useState(false)
  const current = stages[stage]
  if (!current) return null

  const choose = (opt) => {
    const next = [...picks]; next[stage] = opt; setPicks(next); setShowFeedback(true)
  }
  const advance = () => {
    setShowFeedback(false)
    if (stage + 1 < stages.length) setStage(stage + 1)
    else onComplete?.(picks)
  }
  const pick = picks[stage]

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <span className='text-[10px] font-bold uppercase tracking-wider text-cyan-400'>Decision {stage + 1} / {stages.length}</span>
        <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800'>
          <div className='h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all' style={{ width: `${((stage + (showFeedback ? 1 : 0)) / stages.length) * 100}%` }} />
        </div>
      </div>
      <p className='text-sm font-bold text-slate-100'>{current.title}</p>
      <div className='space-y-2.5'>
        {current.options.map(o => {
          const chosen = showFeedback && pick?.key === o.key
          return (
            <button
              key={o.key}
              disabled={locked || showFeedback}
              onClick={() => choose(o)}
              className={[
                'w-full rounded-2xl border p-4 text-left text-sm transition',
                chosen && o.correct ? 'border-emerald-500 bg-emerald-500/10 text-emerald-100' : '',
                chosen && !o.correct ? 'border-rose-500 bg-rose-500/10 text-rose-100' : '',
                !showFeedback ? 'border-slate-700 bg-[#111827] text-slate-200 hover:border-cyan-500/50 hover:bg-slate-800/60' : '',
                showFeedback && !chosen ? 'border-slate-800 bg-[#0D1320] text-slate-500' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className='mr-2 font-bold text-cyan-400'>{o.key}.</span>{o.text}
            </button>
          )
        })}
      </div>
      {showFeedback && pick && (
        <div className={`rounded-2xl border p-4 text-xs leading-relaxed ${pick.correct ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-200' : 'border-amber-500/40 bg-amber-500/5 text-amber-200'}`}>
          <p className='font-bold'>{pick.correct ? '✓ Strong professional choice' : '— Consequence'}</p>
          <p className='mt-1'>{pick.feedback}</p>
          {!pick.correct && current.options.some(o => o.correct) && (
            <p className='mt-2 text-slate-300'>
              <span className='font-bold'>Better approach: </span>
              {current.options.find(o => o.correct)?.text}
            </p>
          )}
          <button onClick={advance} className='mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500'>
            {stage + 1 < stages.length ? 'Next decision' : 'See my learning profile'} <ArrowRight className='h-3.5 w-3.5' />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── assessment runner (§16: random order, 80% pass, retry, §17 feedback) ─── */

function AssessmentRunner({ moduleNumber, passingScore, onPassed }) {
  const [phase, setPhase] = useState('idle') // idle | active | result
  const [start, setStart] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const begin = async () => {
    setBusy(true)
    try {
      const { data } = await ppwecApi.startAssessment(moduleNumber)
      setStart(data); setAnswers({}); setResult(null); setPhase('active')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not start assessment')
    } finally { setBusy(false) }
  }

  const submit = async () => {
    setBusy(true)
    try {
      const { data } = await ppwecApi.submitAssessment(moduleNumber, {
        attempt_id: start.attempt_id, answers,
      })
      setResult(data); setPhase('result')
      if (data.passed) onPassed?.(data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Submission failed')
    } finally { setBusy(false) }
  }

  if (phase === 'idle') {
    return (
      <div className='space-y-4 rounded-3xl border border-slate-800 bg-[#111827] p-6 text-center'>
        <ClipboardCheck className='mx-auto h-10 w-10 text-cyan-400' />
        <h3 className='text-lg font-bold text-slate-100'>Module Assessment</h3>
        <p className='mx-auto max-w-md text-xs leading-relaxed text-slate-400'>
          10 randomized, scenario-based questions. Passing score {passingScore}%. Retry permitted —
          the objective is learning, not failure. Rich feedback after each question.
        </p>
        <button onClick={begin} disabled={busy}
          className='rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50'>
          {busy ? 'Preparing…' : 'Start Assessment'}
        </button>
      </div>
    )
  }

  if (phase === 'active') {
    const answered = Object.keys(answers).length
    return (
      <div className='space-y-4'>
        <div className='sticky top-16 z-10 flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#0F1420] p-3'>
          <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800'>
            <div className='h-full bg-cyan-500 transition-all' style={{ width: `${(answered / start.questions.length) * 100}%` }} />
          </div>
          <span className='text-xs font-semibold text-slate-400'>{answered} / {start.questions.length}</span>
        </div>
        {start.questions.map((q, i) => (
          <div key={q.id} className='rounded-3xl border border-slate-800 bg-[#111827] p-5'>
            {q.case_context && (
              <p className='mb-3 rounded-xl bg-slate-900 p-3 text-xs italic text-slate-400'>{q.case_context}</p>
            )}
            <p className='mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500'>
              Question {i + 1} · {q.question_type.replace(/_/g, ' ')}
            </p>
            <p className='mb-3 text-sm font-semibold text-slate-100'>{q.question_text}</p>
            <div className='space-y-2' role='radiogroup' aria-label={q.question_text}>
              {(q.options || []).map(o => (
                <button key={o.key}
                  onClick={() => setAnswers(a => ({ ...a, [q.id]: o.key }))}
                  className={[
                    'w-full rounded-xl border p-3 text-left text-xs transition',
                    answers[q.id] === o.key ? 'border-cyan-500 bg-cyan-500/10 text-cyan-100' : 'border-slate-700 bg-[#0D1320] text-slate-300 hover:border-slate-500',
                  ].join(' ')}
                  role='radio' aria-checked={answers[q.id] === o.key}
                >
                  <span className='mr-2 font-bold text-cyan-400'>{o.key}.</span>{o.text}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={submit} disabled={busy || answered < start.questions.length}
          className='w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40'>
          {busy ? 'Scoring…' : answered < start.questions.length ? `Answer all questions (${answered}/${start.questions.length})` : 'Submit Assessment'}
        </button>
      </div>
    )
  }

  // result — §17 rich feedback per question
  return (
    <div className='space-y-4'>
      <div className={`rounded-3xl border p-6 text-center ${result.passed ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-amber-500/50 bg-amber-500/10'}`}>
        {result.passed
          ? <Trophy className='mx-auto h-10 w-10 text-emerald-400' />
          : <RotateCcw className='mx-auto h-10 w-10 text-amber-400' />}
        <p className='mt-2 text-3xl font-black text-slate-100'>{result.score}%</p>
        <p className='text-sm font-semibold text-slate-300'>
          {result.correct_count} / {result.total} correct · passing {result.passing_score}%
        </p>
        <p className={`mt-1 text-xs font-bold ${result.passed ? 'text-emerald-300' : 'text-amber-300'}`}>
          {result.passed ? `Passed! Badge earned: ${result.badge_awarded}` : 'Retry permitted — review the feedback and try again.'}
        </p>
      </div>
      {result.results.map((r, i) => (
        <div key={i} className={`rounded-2xl border p-4 text-xs ${r.correct ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
          <p className='font-bold text-slate-200'>Q{i + 1}: {r.correct ? '✓ Correct' : '✗ Incorrect'}</p>
          <p className='mt-1 text-slate-400'><span className='font-bold text-slate-300'>Why this matters: </span>{r.feedback_why}</p>
          {r.feedback_better && <p className='mt-1 text-slate-400'><span className='font-bold text-slate-300'>Better approach: </span>{r.feedback_better}</p>}
        </div>
      ))}
      <div className='flex gap-3'>
        {!result.passed && (
          <button onClick={begin} disabled={busy} className='flex-1 rounded-2xl bg-cyan-600 py-3 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50'>
            Retry Assessment
          </button>
        )}
        <button onClick={() => setPhase('idle')} className='flex-1 rounded-2xl border border-slate-700 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800'>
          Back to Module
        </button>
      </div>
    </div>
  )
}

/* ─── 7-day challenge (§Q) ─── */

const CHALLENGE_DAYS = [
  'Be exceptionally punctual.',
  'Practise active listening.',
  'Complete one commitment ahead of time.',
  'Give someone constructive appreciation.',
  'Identify and correct one process or work-quality issue.',
  'Learn one new thing relevant to your role.',
  'Ask a colleague: "What is one thing I could do to be more effective professionally?"',
]

function ChallengePanel({ moduleNumber }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    ppwecApi.startChallenge(moduleNumber)
      .then(({ data }) => setData(data))
      .catch(() => {})
  }, [moduleNumber])

  const tick = async (day, done) => {
    try {
      const { data } = await ppwecApi.tickChallenge(moduleNumber, { day, done })
      setData(data)
      if (done && data.newly_completed_day) toast.success(`Day ${day} complete · +10 points`)
      if (data.completed_at) toast.success('7-Day Challenge complete! +70 bonus points')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not update challenge')
    }
  }

  if (!data) return null
  const doneCount = (data.days_completed || []).length
  return (
    <div className='space-y-3 rounded-3xl border border-slate-800 bg-[#111827] p-5'>
      <div className='flex items-center justify-between'>
        <h4 className='flex items-center gap-2 text-sm font-bold text-slate-100'>
          <Sparkles className='h-4 w-4 text-amber-400' /> 7-Day Professionalism in Practice Challenge
        </h4>
        <span className='text-xs font-semibold text-amber-300'>{doneCount * 10} / 70 pts</span>
      </div>
      <p className='text-[11px] text-slate-500'>Post-module workplace application — not required for module completion.</p>
      <div className='space-y-2'>
        {CHALLENGE_DAYS.map((title, i) => {
          const day = i + 1
          const done = (data.days_completed || []).includes(day)
          return (
            <label key={day} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-xs transition ${done ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-200' : 'border-slate-700 bg-[#0D1320] text-slate-300 hover:border-slate-500'}`}>
              <input type='checkbox' checked={done} onChange={e => tick(day, e.target.checked)} className='h-4 w-4 accent-emerald-500' />
              <span className='font-bold'>Day {day}</span> {title}
            </label>
          )
        })}
      </div>
    </div>
  )
}

/* ─── main page ─── */

export default function PpwecModulePage() {
  const { moduleNumber } = useParams()
  const navigate = useNavigate()
  const modNum = Number(moduleNumber)

  const [detail, setDetail] = useState(null)
  const [state, setState] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [completed, setCompleted] = useState(new Set())
  const [unlocked, setUnlocked] = useState(new Set())
  const [timeOnScreen, setTimeOnScreen] = useState(0)
  const [showCertificate, setShowCertificate] = useState(false)
  const [celebration, setCelebration] = useState(null) // {badgeName, coins, score}
  const timerRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const [d, s] = await Promise.all([ppwecApi.getModule(modNum), ppwecApi.getState(modNum)])
      setDetail(d.data)
      setState(s.data)
      const doneSet = new Set(s.data.completed_screen_ids)
      setCompleted(doneSet)
      setUnlocked(new Set(s.data.unlocked_screen_ids))
      const resumeIdx = d.data.screens.findIndex(
        sc => sc.id === (s.data.resume_screen_id || d.data.screens[0]?.id)
      )
      setCurrentIdx(Math.max(0, resumeIdx))
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Module not available yet')
      navigate('/trainee/ppwec')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [modNum])
  useEffect(() => {
    setTimeOnScreen(0)
    timerRef.current = setInterval(() => setTimeOnScreen(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [currentIdx])

  const screens = detail?.screens || []
  const screen = screens[currentIdx]
  const mandatoryScreens = useMemo(() => screens.filter(s => s.is_mandatory), [screens])
  const allMandatoryDone = mandatoryScreens.every(s => completed.has(s.id))
  const modulePassed = state?.passed || completed.has(screens[screens.length - 1]?.id)

  if (loading || !screen) {
    return (
      <div className='flex min-h-[60vh] items-center justify-center'>
        <div className='h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-500' />
      </div>
    )
  }

  const isLast = currentIdx === screens.length - 1
  const go = (idx) => { setFeedback(null); setCurrentIdx(idx) }

  // Header coin/streak widgets listen for this and refetch their data.
  const notifyRewardChange = () => window.dispatchEvent(new Event('coins:refresh'))

  const completeAndAdvance = async (interactionResult = null) => {
    try {
      const { data } = await ppwecApi.completeScreen(modNum, {
        screen_id: screen.id,
        interaction_result: interactionResult,
        time_spent_seconds: timeOnScreen,
      })
      setCompleted(new Set([...completed, screen.id]))
      setUnlocked(new Set(data.unlocked_screen_ids))
      if (data.points_delta > 0) toast.success(`+${data.points_delta} points`)
      if (data.coins_delta > 0) {
        notifyRewardChange()
        toast.success(`+${data.coins_delta} coins 🪙`)
      }
      if (data.feedback) setFeedback({ ...data.feedback, _selected: interactionResult?.selected })
      if (!data.feedback && !isLast) setTimeout(() => go(currentIdx + 1), 350)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not save progress')
    }
  }

  const nextDisabled = screen.is_mandatory &&
    !['content', 'completion', 'assessment', 'challenge'].includes(screen.interaction_type) &&
    !feedback &&
    screen.interaction_type !== 'click_reveal' &&
    screen.interaction_type !== 'drag_sort'

  const pct = Math.round((completed.size / Math.max(1, screens.length)) * 100)

  return (
    <div className='ppwec-scope mx-auto max-w-4xl space-y-5 p-4 pb-10'>
      {/* module header + progress (§V.2) — PPWEC identity frame */}
      <div className='relative rounded-3xl border border-[color:var(--ppwec-line)] bg-[color:var(--ppwec-surface-2)]/60 p-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <span className='ppwec-section-chip'>Module {detail.module_number} of 18 · {screen.section}</span>
            <h1 className='mt-2 text-lg font-bold text-[color:var(--ppwec-ink)]'>{detail.title}</h1>
            <p className='text-xs italic text-[color:var(--ppwec-ink-dim)]'>"{detail.theme}"</p>
            {screen.pulse_anchor && (
              <span className='ppwec-price-tag mt-2'>PULSE · {screen.pulse_anchor}</span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {detail.badge_name && (
              <span className='flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold text-amber-300'>
                <Medal className='h-3.5 w-3.5' /> {detail.badge_name}
              </span>
            )}
            <button onClick={() => navigate('/trainee/ppwec')}
              className='flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800'>
              <Home className='h-3.5 w-3.5' /> Passport
            </button>
          </div>
        </div>
        <div className='mt-4 flex items-center gap-3'>
          <div className='ppwec-progress-track flex-1'>
            <div className='ppwec-progress-fill' style={{ width: `${pct}%` }} />
          </div>
          <span className='text-xs font-bold text-[color:var(--ppwec-ink-dim)]'>Screen {screen.screen_number} of {detail.screen_count} · {pct}%</span>
        </div>
      </div>

      {/* screen body */}
      <div className='relative rounded-3xl border border-[color:var(--ppwec-line)] bg-[color:var(--ppwec-surface-2)]/60 p-6'>
        <p className='mb-1 text-[10px] font-bold uppercase tracking-widest text-[color:var(--ppwec-ink-dim)]'>
          {screen.section} {screen.is_mandatory ? '· mandatory' : '· optional'}
        </p>
        <h2 className='mb-4 text-xl font-bold text-[color:var(--ppwec-ink)]'>{screen.title}</h2>
        {screen.md_philosophy && (
          <div className='ppwec-md-callout mb-4 text-xs'>
            This screen connects to the Managing Director's philosophy — leadership is behaviour, not position.
          </div>
        )}

        <div className='space-y-5'>
          <Blocks blocks={screen.on_screen_text} />
          <AudioBar screen={screen} moduleNumber={modNum} />
          <VideoBlock screen={screen} moduleNumber={modNum} />

          {screen.interaction_type === 'click_reveal' && (
            <ClickReveal payload={screen.interaction_payload} onFirstReveal={() => completeAndAdvance(null)} />
          )}

          {['choice', 'branching'].includes(screen.interaction_type) && (
            <ChoiceInteraction
              payload={screen.interaction_payload}
              locked={!!feedback}
              feedback={feedback}
              onSelect={(key) => completeAndAdvance({ selected: key })}
            />
          )}

          {screen.interaction_type === 'drag_sort' && (
            <DragSort payload={screen.interaction_payload} onFirstDrop={() => completeAndAdvance(null)} />
          )}

          {screen.interaction_type === 'classification' && !completed.has(screen.id) && (
            <Classification payload={screen.interaction_payload} onSubmit={() => completeAndAdvance(null)} />
          )}
          {screen.interaction_type === 'classification' && completed.has(screen.id) && (
            <p className='rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300'>
              ✓ Completed — review the scenarios above or continue.
            </p>
          )}

          {screen.interaction_type === 'simulation' && (
            <Simulation
              payload={screen.interaction_payload}
              locked={completed.has(screen.id) && !!feedback}
              onComplete={() => completeAndAdvance({ selected: 'B' })}
            />
          )}

          {screen.interaction_type === 'assessment' && (
            <AssessmentRunner
              moduleNumber={modNum}
              passingScore={detail.passing_score}
              onPassed={(result) => {
                load()
                notifyRewardChange()
                setCelebration({
                  badgeName: result.badge_awarded,
                  coins: result.coins_earned || 0,
                  score: result.score,
                })
              }}
            />
          )}

          {screen.interaction_type === 'challenge' && <ChallengePanel moduleNumber={modNum} />}

          {feedback && (
            <div className={`rounded-2xl border p-4 text-xs leading-relaxed ${feedback.correct ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-200' : 'border-amber-500/40 bg-amber-500/5 text-amber-200'}`}>
              <p className='font-bold'>{feedback.title}</p>
              <p className='mt-1'>{feedback.message}</p>
              {feedback.consequence && <p className='mt-1 italic'>{feedback.consequence}</p>}
              {!feedback.correct && feedback.better_approach && (
                <p className='mt-2 text-slate-300'><span className='font-bold'>Better approach: </span>{feedback.better_approach}</p>
              )}
              {!isLast && (
                <button onClick={() => go(currentIdx + 1)}
                  className='mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500'>
                  Continue <ArrowRight className='h-3.5 w-3.5' />
                </button>
              )}
            </div>
          )}
        </div>

        {/* completion screen extras (§U) */}
        {screen.interaction_type === 'completion' && (
          <div className='mt-5 space-y-3 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent p-5 text-center'>
            <Award className='mx-auto h-10 w-10 text-amber-400' />
            <p className='text-sm font-bold text-slate-100'>
              {detail.badge_name ? `Badge earned: ${detail.badge_name}` : 'Module journey continues'}
            </p>
            <p className='text-xs text-slate-400'>Completed: {state?.status === 'completed' ? '1' : '0'} / 18 modules</p>
            <button onClick={() => setShowCertificate(true)}
              className='rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20'>
              <Trophy className='mr-1.5 inline h-3.5 w-3.5' /> View Certificate
            </button>
          </div>
        )}
      </div>

      {/* navigation (§V.1) */}
      <div className='flex items-center justify-between rounded-3xl border border-slate-800 bg-[#0F1420] p-3'>
        <button onClick={() => go(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
          className='flex items-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-30'>
          <ChevronLeft className='h-4 w-4' /> Back
        </button>
        <div className='flex items-center gap-1.5'>
          {screens.map((s, i) => (
            <button key={s.id}
              onClick={() => unlocked.has(s.id) && go(i)}
              aria-label={`Go to screen ${s.screen_number}`}
              className={[
                'h-2 w-2 rounded-full transition',
                i === currentIdx ? 'w-6 bg-cyan-400' : completed.has(s.id) ? 'bg-emerald-500' : unlocked.has(s.id) ? 'bg-slate-500' : 'bg-slate-800',
              ].join(' ')}
            />
          ))}
        </div>
        {isLast ? (
          <button onClick={() => navigate('/trainee/ppwec')}
            className='flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500'>
            Finish <Home className='h-4 w-4' />
          </button>
        ) : (
          <button
            onClick={() => !nextDisabled && go(currentIdx + 1)}
            disabled={nextDisabled || !unlocked.has(screens[currentIdx + 1]?.id)}
            title={nextDisabled ? 'Complete the interaction to continue' : ''}
            className='flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-30'
          >
            {nextDisabled ? <Lock className='h-4 w-4' /> : null} Continue <ChevronRight className='h-4 w-4' />
          </button>
        )}
      </div>
      <PpwecCertificateModal open={showCertificate} onClose={() => setShowCertificate(false)} />
      <PpwecCelebration
        show={!!celebration}
        badgeName={celebration?.badgeName}
        coins={celebration?.coins}
        score={celebration?.score}
        onClose={() => setCelebration(null)}
      />
    </div>
  )
}
