import { useState } from 'react'

export default function LinkModal({ source, identityChart, onLink, onClose }) {
  const [selectedToken, setSelectedToken] = useState('')

  // Only show entries that are not the source and not already linked
  const targets = identityChart.filter(e =>
    e.id !== source.id && !e.linkedTo
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Link Identity</h3>
        <p className="text-sm text-gray-500 mb-4">
          Merge <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{source.token}</code> ({source.canonicalName}) into another identity.
          The source token will be retired and its aliases merged into the target.
        </p>

        {targets.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No other identities available to link to.
          </p>
        ) : (
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {targets.map(t => (
              <label
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedToken === t.token
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="link-target"
                  value={t.token}
                  checked={selectedToken === t.token}
                  onChange={() => setSelectedToken(t.token)}
                  className="text-indigo-600"
                />
                <div>
                  <code className="text-xs font-mono text-gray-500">{t.token}</code>
                  <span className="ml-2 text-sm text-gray-800">{t.canonicalName}</span>
                  {t.aliases.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({t.aliases.join(', ')})
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedToken && onLink(source.id, selectedToken)}
            disabled={!selectedToken}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Link
          </button>
        </div>
      </div>
    </div>
  )
}
