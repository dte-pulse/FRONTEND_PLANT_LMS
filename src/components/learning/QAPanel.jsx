import { useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const QAPanel = ({ documentId }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await api.post('/qa', {
        document_id: documentId,
        question: userMessage.content
      });

      const botMessage = {
        role: 'assistant',
        content: response.data.answer,
        sourcePages: response.data.page_ref ? [response.data.page_ref] : []
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error("QA error", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "We couldn’t retrieve an answer. Check your connection and try again." }])
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="flex flex-col h-full bg-[#131825] border-l border-slate-800/80 shadow-md w-full max-w-md" aria-label="Document assistant">
      <div className="p-4 border-b border-slate-800 bg-[#161C2C] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
          <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-bold text-xs text-white">SOP assistant</h2>
          <p className="text-[11px] text-slate-400">Ask questions about this document</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5" aria-live="polite" aria-busy={loading}>
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-10 text-xs px-4">
            Ask questions about terms, compliance requirements, or procedures in this document.
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs ${msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-xs'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-xs'
                  }`}
              >
                {msg.content}
              </div>
              {msg.sourcePages && msg.sourcePages.length > 0 && (
                <span className="text-[10px] text-emerald-400 mt-1 pl-1 font-mono">
                  Source pages: {msg.sourcePages.join(', ')}
                </span>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-start">
            <div className="bg-slate-800 text-slate-400 rounded-xl rounded-bl-xs px-3.5 py-2.5 text-xs animate-pulse border border-slate-700/50">
              Searching document context…
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 border-t border-slate-800 bg-[#161C2C]">
        <form onSubmit={handleAsk} className="flex gap-2">
          <Input
            type="text"
            name="document-question"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Ask a question about this document"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
          >
            Send
          </Button>
        </form>
      </div>
    </aside>
  )
}

export default QAPanel
