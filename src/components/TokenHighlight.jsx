import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { IDENTITY_TYPES, DICTIONARY_TYPES } from '../phiDetector'
import TaggingPopover from './TaggingPopover'

export const ENTITY_COLORS = {
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

// context:
//   'dehydrate' / undefined / 'chat': resolved → "Edit mapping"; unresolved → "Create entity"
//   'rehydrate': resolved → "View in Identity Chart" or "View in Dictionaries"; unresolved → "Create entity"

export function TokenChip({ display, token, entityType, tooltipLines, resolved = true,
  identityChart, dictionaries, onManualTag, onMapToExisting,
  context, onNavigateToChart, onNavigateToDictionaries, onCreateWithToken }) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editPos, setEditPos] = useState({ x: 0, y: 0 })
  const chipRef = useRef(null)
  const hideTimer = useRef(null)

  const color = resolved
    ? (ENTITY_COLORS[entityType] || 'bg-gray-100 text-gray-700 border-gray-200')
    : 'bg-amber-100 text-amber-800 border-amber-300'

  const showTooltip = useCallback(() => {
    clearTimeout(hideTimer.current)
    setHovered(true)
  }, [])

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setHovered(false), 250)
  }, [])

  const handleEditClick = (e) => {
    e.stopPropagation()
    setEditPos({ x: e.clientX, y: e.clientY })
    setEditing(true)
    setHovered(false)
  }

  const isDictType = entityType && DICTIONARY_TYPES.has(entityType)
  const isRehydrateContext = context === 'rehydrate'

  const getTooltipStyle = () => {
    if (!chipRef.current) return {}
    const rect = chipRef.current.getBoundingClientRect()
    return {
      position: 'fixed',
      left: Math.min(rect.left, window.innerWidth - 280),
      bottom: window.innerHeight - rect.top + 4,
    }
  }

  return (
    <span className="relative inline-block">
      <span ref={chipRef}
        className={`inline px-1 py-0.5 rounded text-xs font-mono font-medium border cursor-help transition-shadow ${color} ${hovered ? 'ring-2 ring-indigo-400' : ''}`}
        onMouseEnter={showTooltip} onMouseLeave={scheduleHide}>
        {display}
        {!resolved && <span className="ml-0.5 text-amber-600">?</span>}
      </span>

      {hovered && createPortal(
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl pointer-events-auto"
          style={{ ...getTooltipStyle(), zIndex: 99999 }}
          onMouseEnter={showTooltip} onMouseLeave={scheduleHide}>
          {tooltipLines.map((line, i) => (
            <span key={i} className={`block ${i === 0 ? 'font-semibold' : 'text-gray-300'}`}>{line}</span>
          ))}

          {/* UNRESOLVED — always show "Create entity" regardless of context */}
          {!resolved && (
            <button onClick={handleEditClick}
              className="mt-1.5 block w-full text-left text-amber-300 hover:text-amber-100 font-medium">
              Create entity for this token
            </button>
          )}

          {/* RESOLVED in rehydrate context → view-only links, no edit */}
          {resolved && isRehydrateContext && isDictType && onNavigateToDictionaries && (
            <button onClick={(e) => { e.stopPropagation(); setHovered(false); onNavigateToDictionaries() }}
              className="mt-1.5 block w-full text-left text-indigo-300 hover:text-indigo-100 font-medium">
              View in Dictionaries
            </button>
          )}
          {resolved && isRehydrateContext && !isDictType && onNavigateToChart && (
            <button onClick={(e) => { e.stopPropagation(); setHovered(false); onNavigateToChart() }}
              className="mt-1.5 block w-full text-left text-indigo-300 hover:text-indigo-100 font-medium">
              View in Identity Chart
            </button>
          )}

          {/* RESOLVED in dehydrate/chat context → edit mapping */}
          {resolved && !isRehydrateContext && (onManualTag || onMapToExisting) && (
            <button onClick={handleEditClick}
              className="mt-1.5 block w-full text-left text-indigo-300 hover:text-indigo-100 font-medium">
              Edit mapping
            </button>
          )}
        </div>,
        document.body
      )}

      {editing && (
        !resolved ? (
          <TaggingPopover selectedText={display} presetToken={token} position={editPos}
            identityChart={identityChart || []} dictionaries={dictionaries || []}
            onTag={onManualTag || (() => {})} onMapToExisting={onMapToExisting || (() => {})}
            onCreateWithToken={onCreateWithToken || (() => {})}
            onClose={() => setEditing(false)} />
        ) : onManualTag ? (
          <TaggingPopover selectedText={tooltipLines[0] || display} position={editPos}
            identityChart={identityChart || []} dictionaries={dictionaries || []}
            onTag={onManualTag} onMapToExisting={onMapToExisting || (() => {})}
            onClose={() => setEditing(false)} />
        ) : null
      )}
    </span>
  )
}

// Render tokenized text with interactive chips
export function RenderTokenizedText({ text, detections = [], identityChart, dictionaries,
  onManualTag, onMapToExisting, monoFont = true, context, onNavigateToChart, onNavigateToDictionaries, onCreateWithToken }) {
  const tokenTypeMap = {}
  for (const d of detections) tokenTypeMap[d.token.toUpperCase()] = d

  // Also look up entity types from chart/dict for tokens not in detections
  const allEntries = [...(identityChart || []), ...(dictionaries || [])]

  const tokenRegex = /\[([A-Za-z_]+_\d+)(?:\|ALIAS_\d+)?\]/gi
  const matches = []
  let m
  while ((m = tokenRegex.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, token: m[1].toUpperCase(), full: m[0] })
  }

  if (!matches.length) {
    return <p className={`text-sm text-gray-800 whitespace-pre-wrap ${monoFont ? 'font-mono' : ''}`}>{text}</p>
  }

  const result = []
  let lastEnd = 0
  for (const match of matches) {
    if (match.start > lastEnd) result.push(<span key={`t-${lastEnd}`}>{text.slice(lastEnd, match.start)}</span>)
    const det = tokenTypeMap[match.token] // already uppercased
    const entry = allEntries.find(e => e.token.toUpperCase() === match.token)
    const entityType = det?.entityType || entry?.entityType
    const isResolved = !!(det || entry)
    const tooltipLines = det
      ? [det.originalText, `Type: ${det.entityType}`, `Token: ${det.token}`]
      : entry
        ? [entry.canonicalName, `Type: ${entry.entityType}`, `Token: ${entry.token}`]
        : [match.full, 'Unresolved — not in session memory']

    result.push(
      <TokenChip key={`h-${match.start}`} display={match.full} token={match.token}
        entityType={entityType} tooltipLines={tooltipLines} resolved={isResolved}
        identityChart={identityChart} dictionaries={dictionaries}
        onManualTag={onManualTag} onMapToExisting={onMapToExisting}
        context={context} onNavigateToChart={onNavigateToChart}
        onNavigateToDictionaries={onNavigateToDictionaries} onCreateWithToken={onCreateWithToken} />
    )
    lastEnd = match.end
  }
  if (lastEnd < text.length) result.push(<span key="tail">{text.slice(lastEnd)}</span>)

  return <p className={`text-sm text-gray-800 whitespace-pre-wrap leading-relaxed ${monoFont ? 'font-mono' : ''}`}>{result}</p>
}

// Render rehydrated text with highlighted entities + contextual actions
export function RenderRehydratedText({ text, resolutions = [], identityChart, dictionaries,
  onManualTag, onMapToExisting, onNavigateToChart, onNavigateToDictionaries, onCreateWithToken }) {
  if (!resolutions.length) return <p className="text-sm text-gray-800 whitespace-pre-wrap">{text}</p>

  const parts = []
  let remaining = text
  for (const res of resolutions) {
    const outputForm = res.outputForm
    const idx = remaining.indexOf(outputForm, 0)
    if (idx >= 0) {
      if (idx > 0) parts.push({ type: 'text', value: remaining.slice(0, idx) })
      parts.push({ type: 'resolved', value: outputForm, resolution: res })
      remaining = remaining.slice(idx + outputForm.length)
    }
  }
  if (remaining) parts.push({ type: 'text', value: remaining })

  return (
    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.value}</span>
        const res = part.resolution
        const tooltipLines = res.resolved
          ? [res.full, `Type: ${res.entityType}`, `Canonical: ${res.canonicalName}`,
             ...(res.aliasUsed ? [`Alias: ${res.aliasUsed}`] : []), `Output: ${res.outputForm}`]
          : [res.full, 'Unresolved — not in session memory']

        return (
          <TokenChip key={i} display={part.value} token={res.token}
            entityType={res.entityType} tooltipLines={tooltipLines} resolved={res.resolved}
            identityChart={identityChart} dictionaries={dictionaries}
            onManualTag={onManualTag} onMapToExisting={onMapToExisting}
            context="rehydrate" onNavigateToChart={onNavigateToChart}
            onNavigateToDictionaries={onNavigateToDictionaries} onCreateWithToken={onCreateWithToken} />
        )
      })}
    </p>
  )
}
