import { useState } from 'react'
import { DICTIONARY_TYPES, ENTITY_PREFIX_MAP } from '../phiDetector'

const DICT_TYPES = [...DICTIONARY_TYPES]

const TYPE_COLORS = {
  Condition: 'bg-rose-50 text-rose-700',
  Medication: 'bg-violet-50 text-violet-700',
  Procedure: 'bg-cyan-50 text-cyan-700',
  Symptom: 'bg-yellow-50 text-yellow-700',
  Lab: 'bg-sky-50 text-sky-700',
  Allergy: 'bg-pink-50 text-pink-700',
  Treatment: 'bg-emerald-50 text-emerald-700',
}

const SOURCE_COLORS = {
  seeded: 'bg-gray-100 text-gray-600',
  auto: 'bg-blue-50 text-blue-600',
  manual: 'bg-green-50 text-green-600',
}

export default function DictionariesTab({ dictionaries, setDictionaries }) {
  const [filterType, setFilterType] = useState('All')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEntry, setNewEntry] = useState({ canonicalName: '', entityType: 'Condition', aliases: '', notes: '' })

  const updateEntry = (id, field, value) => {
    setDictionaries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const deleteEntry = (id) => {
    setDictionaries(prev => prev.filter(e => e.id !== id))
  }

  const addAlias = (id, alias) => {
    if (!alias.trim()) return
    setDictionaries(prev => prev.map(e =>
      e.id === id ? { ...e, aliases: [...e.aliases, alias.trim()] } : e
    ))
  }

  const removeAlias = (id, index) => {
    setDictionaries(prev => prev.map(e =>
      e.id === id ? { ...e, aliases: e.aliases.filter((_, i) => i !== index) } : e
    ))
  }

  const handleAddEntry = () => {
    if (!newEntry.canonicalName.trim()) return
    const prefix = ENTITY_PREFIX_MAP[newEntry.entityType] || 'ENTITY'
    const existingCount = dictionaries.filter(e => e.token.startsWith(prefix + '_')).length
    const token = `${prefix}_${existingCount + 1}`
    const aliases = newEntry.aliases.split(',').map(a => a.trim()).filter(Boolean)

    setDictionaries(prev => [...prev, {
      id: crypto.randomUUID(),
      token,
      canonicalName: newEntry.canonicalName.trim(),
      aliases,
      entityType: newEntry.entityType,
      firstSeen: new Date().toISOString(),
      linkedTo: null,
      source: 'manual',
      notes: newEntry.notes.trim(),
    }])
    setNewEntry({ canonicalName: '', entityType: 'Condition', aliases: '', notes: '' })
    setShowAddForm(false)
  }

  const filtered = filterType === 'All' ? dictionaries : dictionaries.filter(e => e.entityType === filterType)

  const typeCounts = {}
  for (const t of DICT_TYPES) {
    typeCounts[t] = dictionaries.filter(e => e.entityType === t).length
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Medical Dictionaries</h2>
          <p className="text-xs text-gray-500">
            {dictionaries.length} terms
            <span className="mx-1">·</span>
            {dictionaries.filter(e => e.source === 'auto').length} auto-detected
            <span className="mx-1">·</span>
            {dictionaries.filter(e => e.source === 'manual').length} manual
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-md text-gray-600 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="All">All Types ({dictionaries.length})</option>
            {DICT_TYPES.map(t => typeCounts[t] > 0 ? (
              <option key={t} value={t}>{t} ({typeCounts[t]})</option>
            ) : null)}
          </select>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Term
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 shrink-0">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="text-xs font-medium text-gray-600 block mb-1">Term</label>
              <input
                type="text"
                value={newEntry.canonicalName}
                onChange={e => setNewEntry(p => ({ ...p, canonicalName: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="e.g. hypertension, metformin"
                autoFocus
              />
            </div>
            <div className="w-36">
              <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
              <select
                value={newEntry.entityType}
                onChange={e => setNewEntry(p => ({ ...p, entityType: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                {DICT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="text-xs font-medium text-gray-600 block mb-1">Synonyms (comma-separated)</label>
              <input
                type="text"
                value={newEntry.aliases}
                onChange={e => setNewEntry(p => ({ ...p, aliases: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="e.g. high blood pressure, HTN"
              />
            </div>
            <div className="w-48">
              <label className="text-xs font-medium text-gray-600 block mb-1">Notes (optional)</label>
              <input
                type="text"
                value={newEntry.notes}
                onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Optional notes"
              />
            </div>
            <button onClick={handleAddEntry} disabled={!newEntry.canonicalName.trim()}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              Add
            </button>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 px-2 py-1.5 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Token</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Term</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Synonyms</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Source</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <DictRow key={entry.id} entry={entry} onUpdate={updateEntry}
                onDelete={deleteEntry} onAddAlias={addAlias} onRemoveAlias={removeAlias} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">
                  {dictionaries.length === 0 ? 'No dictionary entries yet. Send a message with medical terms to auto-populate.' : `No ${filterType} entries found.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DictRow({ entry, onUpdate, onDelete, onAddAlias, onRemoveAlias }) {
  const [newAlias, setNewAlias] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(entry.canonicalName)

  const saveName = () => {
    if (nameValue.trim()) onUpdate(entry.id, 'canonicalName', nameValue.trim())
    setEditingName(false)
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-6 py-3">
        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{entry.token}</code>
      </td>
      <td className="px-6 py-3">
        {editingName ? (
          <input value={nameValue} onChange={e => setNameValue(e.target.value)}
            onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()}
            className="px-2 py-1 border border-indigo-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none w-full" autoFocus />
        ) : (
          <span className="cursor-pointer hover:text-indigo-600 transition-colors"
            onClick={() => { setNameValue(entry.canonicalName); setEditingName(true) }}>
            {entry.canonicalName}
          </span>
        )}
      </td>
      <td className="px-6 py-3">
        <div className="flex flex-wrap gap-1 items-center">
          {entry.aliases.map((alias, i) => (
            <span key={i} className="inline-flex items-center bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full group">
              {alias}
              <button onClick={() => onRemoveAlias(entry.id, i)}
                className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            </span>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); onAddAlias(entry.id, newAlias); setNewAlias('') }} className="inline-flex">
            <input value={newAlias} onChange={e => setNewAlias(e.target.value)} placeholder="+ synonym"
              className="w-20 text-xs px-1.5 py-0.5 border border-dashed border-gray-300 rounded text-gray-500 focus:border-indigo-400 outline-none focus:w-28 transition-all" />
          </form>
        </div>
      </td>
      <td className="px-6 py-3">
        <select value={entry.entityType} onChange={e => onUpdate(entry.id, 'entityType', e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${TYPE_COLORS[entry.entityType] || 'bg-gray-100 text-gray-700'}`}>
          {DICT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td className="px-6 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[entry.source] || 'bg-gray-100 text-gray-600'}`}>
          {entry.source || 'auto'}
        </span>
      </td>
      <td className="px-6 py-3">
        <button onClick={() => onDelete(entry.id)}
          className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 transition-colors">Delete</button>
      </td>
    </tr>
  )
}
