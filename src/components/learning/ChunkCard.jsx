import React from 'react';
import { Button } from '@/components/ui/button';

const ChunkCard = ({ chunk, onUnderstood }) => {
  return (
    <div className="bg-[#131825] p-6 rounded-2xl border border-slate-800/80 shadow-md">
      <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-3">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
          Page {chunk.page_no || '1'}
        </h2>
      </div>
      
      <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed whitespace-pre-wrap mb-6">
        {chunk.content}
      </div>
      
      {chunk.learning_card && (
        <div className="bg-indigo-500/10 p-4 rounded-xl mb-6 border border-indigo-500/20">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">Key Takeaways</h3>
          <p className="text-xs text-indigo-200 leading-relaxed">{chunk.learning_card}</p>
        </div>
      )}

      <div className="flex justify-end border-t pt-4 border-slate-800/80">
        <Button onClick={onUnderstood}>
          I understand this content
        </Button>
      </div>
    </div>
  );
};

export default ChunkCard;

