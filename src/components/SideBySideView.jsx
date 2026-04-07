const ENTITY_COLORS = {
  Person: 'bg-blue-100 text-blue-800 border-blue-200',
  Phone: 'bg-green-100 text-green-800 border-green-200',
  Email: 'bg-purple-100 text-purple-800 border-purple-200',
  Address: 'bg-orange-100 text-orange-800 border-orange-200',
  SSN: 'bg-red-100 text-red-800 border-red-200',
  Date: 'bg-amber-100 text-amber-800 border-amber-200',
  Condition: 'bg-rose-100 text-rose-800 border-rose-200',
  Medication: 'bg-violet-100 text-violet-800 border-violet-200',
  Dosage: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  Procedure: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Symptom: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Facility: 'bg-teal-100 text-teal-800 border-teal-200',
  Provider: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Medical_Date: 'bg-lime-100 text-lime-800 border-lime-200',
  Lab: 'bg-sky-100 text-sky-800 border-sky-200',
  Allergy: 'bg-pink-100 text-pink-800 border-pink-200',
  Treatment: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

export default function SideBySideView({ messages, onTextSelect }) {
  const userMessages = messages.filter(m => m.role === 'user')

  if (userMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">No messages to compare yet.</p>
          <p className="text-gray-400 text-xs mt-1">Send a message to see the sanitization side-by-side.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" onMouseUp={onTextSelect}>
      <div className="sticky top-0 bg-gray-50 border-b border-gray-200 grid grid-cols-2 z-10">
        <div className="px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
          Raw Input
        </div>
        <div className="px-6 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Sanitized Output <span className="font-normal text-gray-400 normal-case">· select text to tag</span>
        </div>
      </div>

      {userMessages.map((msg, i) => (
        <div key={msg.id} className={`grid grid-cols-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
          <div className="px-6 py-4 border-r border-gray-200">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.rawText}</p>
          </div>
          <div className="px-6 py-4">
            <HighlightedSanitized message={msg} />
            {msg.detections.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {msg.detections.map((d, j) => (
                  <span key={j} className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${
                    ENTITY_COLORS[d.entityType] || 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {d.originalText} → [{d.token}]
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function HighlightedSanitized({ message }) {
  const { sanitizedText, detections } = message
  if (!detections.length) {
    return <p className="text-sm text-gray-800 whitespace-pre-wrap">{sanitizedText}</p>
  }

  const tokenTypeMap = {}
  for (const d of detections) {
    tokenTypeMap[d.token] = d.entityType
  }

  // Match both [TOKEN] and [TOKEN|ALIAS_N] formats
  const tokenRegex = /\[([A-Z_]+_\d+)(?:\|ALIAS_\d+)?\]/g
  const matches = []
  let m
  while ((m = tokenRegex.exec(sanitizedText)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, token: m[1], full: m[0] })
  }

  if (matches.length === 0) {
    return <p className="text-sm text-gray-800 whitespace-pre-wrap">{sanitizedText}</p>
  }

  const result = []
  let lastEnd = 0
  for (const match of matches) {
    if (match.start > lastEnd) {
      result.push(<span key={`t-${lastEnd}`}>{sanitizedText.slice(lastEnd, match.start)}</span>)
    }
    const entityType = tokenTypeMap[match.token]
    const colorClass = entityType
      ? (ENTITY_COLORS[entityType] || 'bg-gray-100 text-gray-700 border-gray-200')
      : 'bg-gray-100 text-gray-700 border-gray-200'
    result.push(
      <span key={`h-${match.start}`} className={`inline px-1 py-0.5 rounded text-xs font-mono font-medium border ${colorClass}`}>
        {match.full}
      </span>
    )
    lastEnd = match.end
  }
  if (lastEnd < sanitizedText.length) {
    result.push(<span key="tail">{sanitizedText.slice(lastEnd)}</span>)
  }

  return <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{result}</p>
}
