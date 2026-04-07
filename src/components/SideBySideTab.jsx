import { useState, useRef, useEffect } from 'react'
import { detectAndTokenize, rehydrate, DICTIONARY_TYPES } from '../phiDetector'
import { RenderTokenizedText, RenderRehydratedText } from './TokenHighlight'
import TaggingPopover from './TaggingPopover'

export default function SideBySideTab({ messages, identityChart, dictionaries,
  setIdentityChart, setDictionaries, onManualTag, onMapToExisting,
  onCreateWithToken: rawOnCreateWithToken, onNavigateToChart, onNavigateToDictionaries, rows, setRows }) {

  // Wrap onCreateWithToken to re-run full rehydration on existing rows after entity creation
  const onCreateWithToken = (token, canonicalName, entityType) => {
    const result = rawOnCreateWithToken(token, canonicalName, entityType)
    // Build a temporary entity list that includes the just-created entry,
    // since React state won't have updated yet in this tick
    const newEntry = { token, canonicalName, aliases: [], entityType, linkedTo: null }
    const idWithNew = [...identityChart, ...(!DICTIONARY_TYPES.has(entityType) ? [newEntry] : [])]
    const dictWithNew = [...dictionaries, ...(DICTIONARY_TYPES.has(entityType) ? [newEntry] : [])]

    setRows(prev => prev.map(row => {
      if (row.direction !== 'rehydrate') return row
      // Re-run full rehydration with the merged list so ALL tokens resolve
      const newLeft = rehydrate(row.right, idWithNew, dictWithNew)
      const newResolutions = buildResolutions(row.right, idWithNew, dictWithNew)
      return { ...row, left: newLeft, resolutions: newResolutions }
    }))
    return result
  }
  const [dehydrateInput, setDehydrateInput] = useState('')
  const [rehydrateInput, setRehydrateInput] = useState('')
  const [saveToSession, setSaveToSession] = useState(true)
  const [autoAddDict, setAutoAddDict] = useState(true)
  const [useSessionMemory, setUseSessionMemory] = useState(true)
  const [taggingState, setTaggingState] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [rows])

  // Build chat prepopulated rows
  const chatRows = []
  for (const msg of messages) {
    if (msg.isError) continue
    if (msg.role === 'user') {
      chatRows.push({
        id: `chat-user-${msg.id}`, direction: 'dehydrate', fromChat: true,
        left: msg.rawText, right: msg.sanitizedText, detections: msg.detections,
      })
    } else {
      chatRows.push({
        id: `chat-asst-${msg.id}`, direction: 'rehydrate', fromChat: true,
        right: msg.sanitizedText, left: msg.hydratedText, resolutions: buildResolutions(msg.sanitizedText, identityChart, dictionaries),
      })
    }
  }

  const allRows = [...chatRows, ...rows]

  const handleDehydrate = () => {
    if (!dehydrateInput.trim()) return
    const idCopy = saveToSession ? identityChart.map(e => ({ ...e, aliases: [...e.aliases] })) : structuredClone(identityChart)
    const dictCopy = (saveToSession && autoAddDict) ? dictionaries.map(e => ({ ...e, aliases: [...e.aliases] })) : structuredClone(dictionaries)
    const { sanitized, detections } = detectAndTokenize(dehydrateInput, idCopy, dictCopy)

    setRows(prev => [...prev, {
      id: crypto.randomUUID(), direction: 'dehydrate', fromChat: false,
      left: dehydrateInput, right: sanitized, detections,
    }])
    setDehydrateInput('')
    if (saveToSession) { setIdentityChart(idCopy); if (autoAddDict) setDictionaries(dictCopy) }
  }

  const handleRehydrate = () => {
    if (!rehydrateInput.trim()) return
    const idSource = useSessionMemory ? identityChart : []
    const dictSource = useSessionMemory ? dictionaries : []
    const rehydrated = rehydrate(rehydrateInput, idSource, dictSource)
    const resolutions = buildResolutions(rehydrateInput, idSource, dictSource)

    setRows(prev => [...prev, {
      id: crypto.randomUUID(), direction: 'rehydrate', fromChat: false,
      right: rehydrateInput, left: rehydrated, resolutions,
    }])
    setRehydrateInput('')
  }

  const handleTextSelect = (e) => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (text && text.length > 1 && !text.startsWith('[')) {
      setTaggingState({ text, position: { x: e.clientX, y: e.clientY } })
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Dehydrator / Rehydrator</h2>
          <p className="text-xs text-gray-500">Manual PHI abstraction layer — no LLM required. Hover tokens to inspect, click Edit to remap.</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={saveToSession} onChange={e => setSaveToSession(e.target.checked)} className="w-3 h-3 rounded border-gray-300 text-indigo-600" />
            <span className="text-gray-500">Save to session</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={autoAddDict} onChange={e => setAutoAddDict(e.target.checked)} className="w-3 h-3 rounded border-gray-300 text-indigo-600" />
            <span className="text-gray-500">Auto-add dictionaries</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={useSessionMemory} onChange={e => setUseSessionMemory(e.target.checked)} className="w-3 h-3 rounded border-gray-300 text-indigo-600" />
            <span className="text-gray-500">Session memory</span>
          </label>
          <button onClick={() => setRows([])} className="text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">Clear</button>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Dehydrator — Raw / Rehydrated
        </div>
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
          Rehydrator — Tokenized
        </div>
      </div>

      {/* Scrollable rows area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef} onMouseUp={handleTextSelect}>
        {allRows.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-gray-400">Use the input boxes below to dehydrate or rehydrate text.</p>
          </div>
        )}
        {allRows.map((row) => (
          <Row key={row.id} row={row} identityChart={identityChart} dictionaries={dictionaries}
            onManualTag={onManualTag} onMapToExisting={onMapToExisting}
            onCreateWithToken={onCreateWithToken} onNavigateToChart={onNavigateToChart}
            onNavigateToDictionaries={onNavigateToDictionaries} />
        ))}
      </div>

      {/* Two input boxes side by side at bottom */}
      <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200 bg-white shrink-0">
        {/* Left: Dehydrate input */}
        <div className="px-4 py-3">
          <textarea value={dehydrateInput} onChange={e => setDehydrateInput(e.target.value)}
            placeholder="Paste raw text to dehydrate..."
            className="w-full h-16 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleDehydrate() }} />
          <div className="flex gap-2 mt-1.5">
            <button onClick={handleDehydrate} disabled={!dehydrateInput.trim()}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              Dehydrate →
            </button>
          </div>
        </div>
        {/* Right: Rehydrate input */}
        <div className="px-4 py-3">
          <textarea value={rehydrateInput} onChange={e => setRehydrateInput(e.target.value)}
            placeholder="Paste tokenized text to rehydrate, e.g. [PERSON_1] has [CONDITION_1]..."
            className="w-full h-16 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRehydrate() }} />
          <div className="flex gap-2 mt-1.5">
            <button onClick={handleRehydrate} disabled={!rehydrateInput.trim()}
              className="bg-emerald-600 text-white px-4 py-1.5 rounded-md text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              ← Rehydrate
            </button>
          </div>
        </div>
      </div>

      {taggingState && (
        <TaggingPopover selectedText={taggingState.text} position={taggingState.position}
          identityChart={identityChart} dictionaries={dictionaries}
          onTag={onManualTag} onMapToExisting={onMapToExisting}
          onClose={() => setTaggingState(null)} />
      )}
    </div>
  )
}

// --- Single row: shows left + right, with arrow indicating direction ---

function Row({ row, identityChart, dictionaries, onManualTag, onMapToExisting, onCreateWithToken, onNavigateToChart, onNavigateToDictionaries }) {
  const isDehydrate = row.direction === 'dehydrate'
  const borderColor = row.fromChat ? 'border-gray-100' : (isDehydrate ? 'border-indigo-50' : 'border-emerald-50')

  return (
    <div className={`grid grid-cols-2 border-b ${borderColor} hover:bg-gray-50/50 transition-colors`}>
      {/* LEFT PANE */}
      <div className="px-4 py-3 border-r border-gray-200">
        {isDehydrate ? (
          // Dehydrate: left = raw input (the source)
          <div>
            {row.fromChat && <span className="text-xs text-gray-400 mb-1 block">Chat message</span>}
            <div className="flex items-start gap-1.5">
              <span className="text-indigo-500 text-xs mt-0.5 shrink-0">IN →</span>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{row.left}</p>
            </div>
          </div>
        ) : (
          // Rehydrate: left = rehydrated output (the result)
          <div>
            {row.fromChat && <span className="text-xs text-gray-400 mb-1 block">AI response (rehydrated)</span>}
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-500 text-xs mt-0.5 shrink-0">← OUT</span>
              {row.resolutions ? (
                <RenderRehydratedText text={row.left} resolutions={row.resolutions}
                  identityChart={identityChart} dictionaries={dictionaries}
                  onManualTag={onManualTag} onMapToExisting={onMapToExisting}
                  onNavigateToChart={onNavigateToChart} onNavigateToDictionaries={onNavigateToDictionaries}
                  onCreateWithToken={onCreateWithToken} />
              ) : (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{row.left}</p>
              )}
            </div>
            <button onClick={() => navigator.clipboard.writeText(row.left)}
              className="text-xs text-emerald-600 hover:text-emerald-800 mt-1.5 ml-8 transition-colors">Copy</button>
          </div>
        )}
      </div>

      {/* RIGHT PANE */}
      <div className="px-4 py-3">
        {isDehydrate ? (
          // Dehydrate: right = tokenized output (the result)
          <div>
            {row.fromChat && <span className="text-xs text-gray-400 mb-1 block">Sanitized</span>}
            <div className="flex items-start gap-1.5">
              <span className="text-indigo-500 text-xs mt-0.5 shrink-0">OUT →</span>
              <RenderTokenizedText text={row.right} detections={row.detections || []}
                identityChart={identityChart} dictionaries={dictionaries}
                onManualTag={onManualTag} onMapToExisting={onMapToExisting}
                context="dehydrate" onCreateWithToken={onCreateWithToken} />
            </div>
            <button onClick={() => navigator.clipboard.writeText(row.right)}
              className="text-xs text-indigo-600 hover:text-indigo-800 mt-1.5 ml-8 transition-colors">Copy</button>
          </div>
        ) : (
          // Rehydrate: right = tokenized input (the source)
          <div>
            {row.fromChat && <span className="text-xs text-gray-400 mb-1 block">AI response (tokenized)</span>}
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-500 text-xs mt-0.5 shrink-0">IN ←</span>
              <RenderTokenizedText text={row.right} detections={[]}
                identityChart={identityChart} dictionaries={dictionaries}
                onManualTag={onManualTag} onMapToExisting={onMapToExisting}
                context="rehydrate" onNavigateToChart={onNavigateToChart}
                onNavigateToDictionaries={onNavigateToDictionaries} onCreateWithToken={onCreateWithToken}
                monoFont />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Build resolution summary for rehydration
function buildResolutions(tokenizedText, identityChart, dictionaries) {
  const tokenRegex = /\[([A-Za-z_]+_\d+)(?:\|ALIAS_(\d+))?\]/gi
  const resolutions = []
  const allEntries = [...identityChart, ...dictionaries]
  let m
  while ((m = tokenRegex.exec(tokenizedText)) !== null) {
    const token = m[1].toUpperCase()
    const aliasIdx = m[2] ? parseInt(m[2], 10) - 1 : null
    const entry = allEntries.find(e => e.token.toUpperCase() === token)
    resolutions.push({
      full: m[0], token, aliasIdx, resolved: !!entry,
      canonicalName: entry?.canonicalName || null,
      entityType: entry?.entityType || null,
      aliasUsed: aliasIdx !== null && entry?.aliases?.[aliasIdx] ? entry.aliases[aliasIdx] : null,
      outputForm: entry
        ? (aliasIdx !== null && entry.aliases?.[aliasIdx] ? entry.aliases[aliasIdx] : entry.canonicalName)
        : m[0],
    })
  }
  return resolutions
}
