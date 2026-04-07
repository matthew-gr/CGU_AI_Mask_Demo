import { useState, useRef, useEffect } from 'react'
import SideBySideView from './SideBySideView'
import TaggingPopover from './TaggingPopover'

function ShieldIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

const VIEW_MODES = [
  { id: 'user', label: 'User View', icon: '👤' },
  { id: 'llm', label: 'LLM View', iconSvg: true },
  { id: 'sidebyside', label: 'Side-by-Side', icon: '⟺' },
]

export default function ChatTab({ messages, onSend, isLoading, identityChart, dictionaries,
  llmReviewEnabled, setLlmReviewEnabled, reviewStatus, onManualTag, onMapToExisting }) {
  const [viewMode, setViewMode] = useState('user')
  const [input, setInput] = useState('')
  const [taggingState, setTaggingState] = useState(null) // { text, position }
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading || reviewStatus === 'reviewing') return
    onSend(input.trim())
    setInput('')
  }

  const handleTextSelect = (e) => {
    if (viewMode === 'user') return // Only tag in LLM or side-by-side views
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (text && text.length > 1 && !text.startsWith('[')) {
      setTaggingState({ text, position: { x: e.clientX, y: e.clientY } })
    }
  }

  const isBusy = isLoading || reviewStatus === 'reviewing'

  return (
    <div className="h-full flex flex-col">
      {/* View mode toggle */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mr-2">View:</span>
        {VIEW_MODES.map(mode => (
          <button key={mode.id} onClick={() => setViewMode(mode.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              viewMode === mode.id ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            }`}>
            {mode.iconSvg ? <ShieldIcon className="w-3 h-3" /> : <span>{mode.icon}</span>}
            {mode.label}
          </button>
        ))}
        {viewMode !== 'sidebyside' && (
          <span className="ml-auto text-xs text-gray-400">
            {viewMode === 'user' ? 'Showing rehydrated conversation' : 'Select text to tag entities manually'}
          </span>
        )}
      </div>

      {/* Messages area */}
      {viewMode === 'sidebyside' ? (
        <SideBySideView messages={messages} onTextSelect={handleTextSelect} />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" onMouseUp={handleTextSelect}>
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">Send a message to start the conversation.</p>
                <p className="text-gray-400 text-xs mt-1">PHI will be automatically detected and anonymized.</p>
              </div>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} viewMode={viewMode} />
          ))}

          {reviewStatus === 'reviewing' && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <ShieldIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs text-amber-700 font-medium">Reviewing for missed PHI...</span>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <ShieldIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input area */}
      <div className="px-6 py-4 bg-white border-t border-gray-200 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Type a message... (PHI will be auto-detected)"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            disabled={isBusy} />
          <button type="submit" disabled={!input.trim() || isBusy}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </form>
        <div className="mt-2 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={llmReviewEnabled} onChange={e => setLlmReviewEnabled(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
            <span className="text-xs text-gray-500">AI-assisted PHI review</span>
          </label>
          {llmReviewEnabled && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Uses an extra LLM call to catch missed PHI before sending
            </span>
          )}
        </div>
      </div>

      {/* Tagging popover */}
      {taggingState && (
        <TaggingPopover
          selectedText={taggingState.text}
          position={taggingState.position}
          identityChart={identityChart}
          dictionaries={dictionaries}
          onTag={onManualTag}
          onMapToExisting={onMapToExisting}
          onClose={() => setTaggingState(null)}
        />
      )}
    </div>
  )
}

function MessageBubble({ message, viewMode }) {
  const isUser = message.role === 'user'
  const text = viewMode === 'user' ? message.hydratedText : message.sanitizedText

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-gray-200' : 'bg-indigo-100'
      }`}>
        {isUser ? <span className="text-sm">👤</span> : <ShieldIcon className="w-4 h-4 text-indigo-600" />}
      </div>
      <div className={`max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
        message.isError ? 'bg-red-50 border border-red-200 text-red-700'
          : isUser ? 'bg-indigo-600 text-white'
          : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
      }`}>
        <p className="whitespace-pre-wrap">{text}</p>
        {viewMode === 'llm' && message.detections.length > 0 && (
          <div className={`mt-2 pt-2 border-t ${isUser ? 'border-indigo-500' : 'border-gray-100'}`}>
            <p className={`text-xs ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
              {message.detections.length} PHI token{message.detections.length !== 1 ? 's' : ''} replaced
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
