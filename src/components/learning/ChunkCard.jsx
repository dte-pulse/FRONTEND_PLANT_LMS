import { BookOpenCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ChunkCard = ({ chunk, onUnderstood }) => {
  return (
    <article className="bg-[#131825] p-6 rounded-2xl border border-slate-800/80 shadow-md shadow-emerald-950/10">
      <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-3">
        <h2 className="text-sm font-bold text-slate-200">
          Learning page {chunk.page_no || '1'}
        </h2>
      </div>
      
      <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed whitespace-pre-wrap mb-6">
        {chunk.content}
      </div>
      
      {chunk.learning_card && (
        <aside className="bg-emerald-500/10 p-4 rounded-xl mb-6 border border-emerald-500/20">
          <h3 className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1"><BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />Key takeaways</h3>
          <p className="text-xs text-emerald-100 leading-relaxed">{chunk.learning_card}</p>
        </aside>
      )}

      <div className="flex justify-end border-t pt-4 border-slate-800/80">
        <Button onClick={onUnderstood}>
          I understand this content
        </Button>
      </div>
    </article>
  )
}

export default ChunkCard
