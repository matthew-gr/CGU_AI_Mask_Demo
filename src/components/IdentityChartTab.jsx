import { useState } from 'react'
import LinkModal from './LinkModal'
import { IDENTITY_TYPES, ENTITY_PREFIX_MAP } from '../phiDetector'

const ID_TYPES = [...IDENTITY_TYPES]
const ROLES = ['', 'patient', 'spouse', 'caregiver', 'clinician', 'family', 'guardian', 'other']

const TYPE_COLORS = {
  Person: 'bg-blue-50 text-blue-700',
  Phone: 'bg-green-50 text-green-700',
  Email: 'bg-purple-50 text-purple-700',
  Address: 'bg-orange-50 text-orange-700',
  SSN: 'bg-red-50 text-red-700',
  Date: 'bg-amber-50 text-amber-700',
  Dosage: 'bg-fuchsia-50 text-fuchsia-700',
  Facility: 'bg-teal-50 text-teal-700',
  Provider: 'bg-indigo-50 text-indigo-700',
  Medical_Date: 'bg-lime-50 text-lime-700',
}

export default function IdentityChartTab({ identityChart, setIdentityChart }) {
  const [linkModalTarget, setLinkModalTarget] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEntry, setNewEntry] = useState({ canonicalName: '', entityType: 'Person', aliases: '', role: '' })
  const [filterType, setFilterType] = useState('All')

  const updateEntry = (id, field, value) => {
    setIdentityChart(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const deleteEntry = (id) => {
    setIdentityChart(prev => prev.filter(e => e.id !== id))
  }

  const addAlias = (id, alias) => {
    if (!alias.trim()) return
    setIdentityChart(prev => prev.map(e =>
      e.id === id ? { ...e, aliases: [...e.aliases, alias.trim()] } : e
    ))
  }

  const removeAlias = (id, index) => {
    setIdentityChart(prev => prev.map(e =>
      e.id === id ? { ...e, aliases: e.aliases.filter((_, i) => i !== index) } : e
    ))
  }

  const handleLink = (sourceId, targetToken) => {
    setIdentityChart(prev => {
      const source = prev.find(e => e.id === sourceId)
      const target = prev.find(e => e.token === targetToken)
      if (!source || !target) return prev
      const newTargetAliases = [...target.aliases, source.canonicalName, ...source.aliases]
        .filter((v, i, a) => a.indexOf(v) === i)
      return prev.map(e => {
        if (e.id === target.id) return { ...e, aliases: newTargetAliases }
        if (e.id === source.id) return { ...e, linkedTo: target.token }
        return e
      })
    })
    setLinkModalTarget(null)
  }

  const handleAddEntry = () => {
    if (!newEntry.canonicalName.trim()) return
    const prefix = ENTITY_PREFIX_MAP[newEntry.entityType] || 'ENTITY'
    const existingCount = identityChart.filter(e => e.token.startsWith(prefix + '_')).length
    const token = `${prefix}_${existingCount + 1}`
    const aliases = newEntry.aliases.split(',').map(a => a.trim()).filter(Boolean)
    setIdentityChart(prev => [...prev, {
      id: crypto.randomUUID(), token, canonicalName: newEntry.canonicalName.trim(),
      aliases, entityType: newEntry.entityType, firstSeen: new Date().toISOString(),
      linkedTo: null, role: newEntry.role,
    }])
    setNewEntry({ canonicalName: '', entityType: 'Person', aliases: '', role: '' })
    setShowAddForm(false)
  }

  const filtered = filterType === 'All' ? identityChart : identityChart.filter(e => e.entityType === filterType)

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Identity Chart</h2>
          <p className="text-xs text-gray-500">{identityChart.length} tracked entities (people, contacts, facilities, providers)</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-md text-gray-600 focus:ring-1 focus:ring-indigo-500 outline-none">
            <option value="All">All ({identityChart.length})</option>
            {ID_TYPES.map(t => {
              const c = identityChart.filter(e => e.entityType === t).length
              return c > 0 ? <option key={t} value={t}>{t} ({c})</option> : null
            })}
          </select>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Entity
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 shrink-0">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-40">
              <label className="text-xs font-medium text-gray-600 block mb-1">Name / Value</label>
              <input type="text" value={newEntry.canonicalName}
                onChange={e => setNewEntry(p => ({ ...p, canonicalName: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="e.g. John Smith, 555-1234" autoFocus />
            </div>
            <div className="w-32">
              <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
              <select value={newEntry.entityType} onChange={e => setNewEntry(p => ({ ...p, entityType: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-gray-600 block mb-1">Role</label>
              <select value={newEntry.role} onChange={e => setNewEntry(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                {ROLES.map(r => <option key={r} value={r}>{r || '(none)'}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="text-xs font-medium text-gray-600 block mb-1">Aliases</label>
              <input type="text" value={newEntry.aliases}
                onChange={e => setNewEntry(p => ({ ...p, aliases: e.target.value }))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="comma-separated" />
            </div>
            <button onClick={handleAddEntry} disabled={!newEntry.canonicalName.trim()}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">Add</button>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 px-2 py-1.5 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Token</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name / Value</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aliases</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <IdRow key={entry.id} entry={entry} onUpdate={updateEntry} onDelete={deleteEntry}
                onAddAlias={addAlias} onRemoveAlias={removeAlias}
                onLink={() => setLinkModalTarget(entry)} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">No entities found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {linkModalTarget && (
        <LinkModal source={linkModalTarget} identityChart={identityChart}
          onLink={handleLink} onClose={() => setLinkModalTarget(null)} />
      )}
    </div>
  )
}

function IdRow({ entry, onUpdate, onDelete, onAddAlias, onRemoveAlias, onLink }) {
  const [newAlias, setNewAlias] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(entry.canonicalName)

  const saveName = () => {
    if (nameValue.trim()) onUpdate(entry.id, 'canonicalName', nameValue.trim())
    setEditingName(false)
  }

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 ${entry.linkedTo ? 'opacity-60' : ''}`}>
      <td className="px-6 py-3">
        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{entry.token}</code>
        {entry.linkedTo && <span className="block mt-1 text-xs text-indigo-600 font-medium">→ {entry.linkedTo}</span>}
      </td>
      <td className="px-6 py-3">
        {editingName ? (
          <input value={nameValue} onChange={e => setNameValue(e.target.value)}
            onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()}
            className="px-2 py-1 border border-indigo-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none w-full" autoFocus />
        ) : (
          <span className="cursor-pointer hover:text-indigo-600" onClick={() => { setNameValue(entry.canonicalName); setEditingName(true) }}>
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
            <input value={newAlias} onChange={e => setNewAlias(e.target.value)} placeholder="+ alias"
              className="w-16 text-xs px-1.5 py-0.5 border border-dashed border-gray-300 rounded text-gray-500 focus:border-indigo-400 outline-none focus:w-24 transition-all" />
          </form>
        </div>
      </td>
      <td className="px-6 py-3">
        <select value={entry.entityType} onChange={e => onUpdate(entry.id, 'entityType', e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${TYPE_COLORS[entry.entityType] || 'bg-gray-100 text-gray-700'}`}>
          {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td className="px-6 py-3">
        <select value={entry.role || ''} onChange={e => onUpdate(entry.id, 'role', e.target.value)}
          className="text-xs px-2 py-1 rounded border-0 bg-gray-50 text-gray-600 cursor-pointer">
          {ROLES.map(r => <option key={r} value={r}>{r || '(none)'}</option>)}
        </select>
      </td>
      <td className="px-6 py-3">
        <div className="flex gap-1">
          <button onClick={onLink} disabled={!!entry.linkedTo}
            className="text-xs px-2 py-1 rounded text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Link</button>
          <button onClick={() => onDelete(entry.id)}
            className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 transition-colors">Delete</button>
        </div>
      </td>
    </tr>
  )
}
