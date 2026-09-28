export default function PpwecCertificateModal({ open, onClose }) {
  if (!open) return null
  const url = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'}/ppwec/certificate/html`
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4' role='dialog' aria-modal='true' aria-label='PPWEC certificate' onClick={onClose}>
      <div className='w-full max-w-3xl rounded-3xl border border-slate-700 bg-[#0F1420] p-5' onClick={e => e.stopPropagation()}>
        <div className='mb-3 flex items-center justify-between'>
          <h3 className='text-sm font-bold text-slate-100'>Pulse Professional Workplace Excellence Certification</h3>
          <button onClick={onClose} className='rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800'>Close</button>
        </div>
        <iframe title='PPWEC Certificate' src={url} className='h-[60vh] w-full rounded-2xl border border-slate-800 bg-white' />
        <p className='mt-3 text-[11px] text-slate-500'>
          The certificate becomes your official PPWEC credential once all 18 modules are complete.
          Use your browser&apos;s print dialog to save it as PDF.
        </p>
      </div>
    </div>
  )
}
