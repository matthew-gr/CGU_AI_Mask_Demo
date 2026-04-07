import { useState } from 'react'
import { ALL_ENTITY_TYPES, IDENTITY_TYPES, DICTIONARY_TYPES, ENTITY_PREFIX_MAP } from '../phiDetector'

// Props:
//   selectedText - the text to tag
//   presetToken  - (optional) if provided, we're creating an entity for an existing token ID (e.g. from unknown rehydrator token)
//   onTag(value, entityType) - create new entity
//   onCreateWithToken(token, canonicalName, entityType) - create entity with a specific token ID
//   onMapToExisting(value, targetToken) - add as alias to existing entity
export default function TaggingPopover({ selectedText, position, identityChart, dictionaries,
  onTag, onMapToExisting, onClose, presetToken, onCreateWithToken }) {

  const isTokenCreate = !!presetToken
  const [entityType, setEntityType] = useState('Person')
  const [mode, setMode] = useState('create')
  const [selectedToken, setSelectedToken] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [canonicalName, setCanonicalName] = useState('')

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
    if (isTokenCreate) {
      // Creating an entity for an unknown token from rehydrator
      if (onCreateWithToken && canonicalName.trim()) {
        onCreateWithToken(presetToken, canonicalName.trim(), entityType)
      }
    } else if (mode === 'create') {
      onTag(selectedText, entityType)
    } else if (mode === 'existing' && selectedToken) {
      onMapToExisting(selectedText, selectedToken)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 100000 }} onClick={onClose}>
      <div
        className="absolute bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-80"
        style={{ top: Math.min(position.y, window.innerHeight - 400), left: Math.min(position.x, window.innerWidth - 340) }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {isTokenCreate ? 'Define Entity' : 'Tag Entity'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        {/* Selected text / token preview */}
        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
          {isTokenCreate ? (
            <>
              <span className="text-xs text-gray-500">Token:</span>
              <p className="text-sm font-mono font-medium text-amber-700 mt-0.5">{presetToken}</p>
              <span className="text-xs text-gray-400 mt-1 block">This token is not in session memory. Define it below.</span>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-500">Selected text:</span>
              <p className="text-sm font-medium text-gray-800 mt-0.5">"{selectedText}"</p>
            </>
          )}
        </div>

        {isTokenCreate ? (
          // Token creation mode: user provides canonical name + entity type
          <>
            <div className="mb-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Display Name (canonical)</label>
              <input
                type="text"
                value={canonicalName}
                onChange={e => setCanonicalName(e.target.value)}
                placeholder="e.g. John Smith, hypertension, metformin"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                autoFocus
              />
            </div>
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
            <button
              onClick={handleSubmit}
              disabled={!canonicalName.trim()}
              className="w-full mt-2 bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Entity
            </button>
          </>
        ) : (
          // Normal tagging mode
          <>
            <div className="flex gap-1 mb-3">
              <button onClick={() => setMode('create')}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium ${mode === 'create' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                Create New
              </button>
              <button onClick={() => setMode('existing')}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium ${mode === 'existing' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                Map to Existing
              </button>
            </div>

            {mode === 'create' ? (
              <>
                <label className="text-xs font-medium text-gray-600 block mb-1">Entity Type</label>
                <select value={entityType} onChange={e => setEntityType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none mb-2">
                  <optgroup label="Identity (PII)">
                    {[...IDENTITY_TYPES].map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                  <optgroup label="Dictionary (Medical)">
                    {[...DICTIONARY_TYPES].map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                </select>
                {isDictType && <p className="text-xs text-amber-600 mb-2">Will also be added to the Dictionaries tab.</p>}
              </>
            ) : (
              <>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search entities..." autoFocus
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none mb-2" />
                <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
                  {filteredEntries.slice(0, 20).map(entry => (
                    <label key={entry.id}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs ${
                        selectedToken === entry.token ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                      }`}>
                      <input type="radio" name="existing" value={entry.token}
                        checked={selectedToken === entry.token}
                        onChange={() => setSelectedToken(entry.token)} className="text-indigo-600" />
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

            <button onClick={handleSubmit}
              disabled={mode === 'existing' && !selectedToken}
              className="w-full mt-2 bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {mode === 'create' ? 'Create Entity' : 'Add as Alias'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
