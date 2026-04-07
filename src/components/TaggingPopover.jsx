import { useState } from 'react'
import { ALL_ENTITY_TYPES, IDENTITY_TYPES, DICTIONARY_TYPES } from '../phiDetector'

export default function TaggingPopover({ selectedText, position, identityChart, dictionaries, onTag, onMapToExisting, onClose }) {
  const [entityType, setEntityType] = useState('Person')
  const [mode, setMode] = useState('create') // 'create' | 'existing'
  const [selectedToken, setSelectedToken] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const isDictType = DICTIONARY_TYPES.has(entityType)
  const allEntries = [...identityChart, ...dictionaries]
  const filteredEntries = allEntries.filter(e => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return e.canonicalName.toLowerCase().includes(q) ||
           e.token.toLowerCase().includes(q) ||
           e.aliases.some(a => a.toLowerCase().includes(q))
  })

  const handleSubmit = () => {
    if (mode === 'create') {
      onTag(selectedText, entityType)
    } else if (mode === 'existing' && selectedToken) {
      onMapToExisting(selectedText, selectedToken)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-80"
        style={{ top: Math.min(position.y, window.innerHeight - 400), left: Math.min(position.x, window.innerWidth - 340) }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Tag Entity</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        {/* Selected text preview */}
        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
          <span className="text-xs text-gray-500">Selected text:</span>
          <p className="text-sm font-medium text-gray-800 mt-0.5">"{selectedText}"</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium ${
              mode === 'create' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setMode('existing')}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium ${
              mode === 'existing' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Map to Existing
          </button>
        </div>

        {mode === 'create' ? (
          <>
            <label className="text-xs font-medium text-gray-600 block mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none mb-2"
            >
              <optgroup label="Identity (PII)">
                {[...IDENTITY_TYPES].map(t => <option key={t} value={t}>{t}</option>)}
              </optgroup>
              <optgroup label="Dictionary (Medical)">
                {[...DICTIONARY_TYPES].map(t => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            </select>
            {isDictType && (
              <p className="text-xs text-amber-600 mb-2">Will also be added to the Dictionaries tab.</p>
            )}
          </>
        ) : (
          <>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search entities..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none mb-2"
              autoFocus
            />
            <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
              {filteredEntries.slice(0, 20).map(entry => (
                <label
                  key={entry.id}
                  className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs ${
                    selectedToken === entry.token
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="existing"
                    value={entry.token}
                    checked={selectedToken === entry.token}
                    onChange={() => setSelectedToken(entry.token)}
                    className="text-indigo-600"
                  />
                  <div className="min-w-0">
                    <code className="text-gray-400">{entry.token}</code>
                    <span className="ml-1.5 text-gray-700">{entry.canonicalName}</span>
                    {entry.aliases.length > 0 && (
                      <span className="ml-1 text-gray-400">({entry.aliases.slice(0, 3).join(', ')})</span>
                    )}
                  </div>
                </label>
              ))}
              {filteredEntries.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No matching entities</p>
              )}
            </div>
            <p className="text-xs text-gray-500">"{selectedText}" will be added as an alias.</p>
          </>
        )}

        <button
          onClick={handleSubmit}
          disabled={mode === 'existing' && !selectedToken}
          className="w-full mt-2 bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mode === 'create' ? 'Create Entity' : 'Add as Alias'}
        </button>
      </div>
    </div>
  )
}
