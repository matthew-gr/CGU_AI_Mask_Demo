import { useState } from 'react'

export default function ApiKeyModal({ onSubmit }) {
  const [key, setKey] = useState('')

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">PHI Shield</h2>
            <p className="text-sm text-gray-500">HIPAA-Compliant AI Chat Demo</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Enter your Anthropic API key to start. The key is stored in memory only and never logged or persisted.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); if (key.trim()) onSubmit(key.trim()) }}>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-4"
            autoFocus
          />
          <button
            type="submit"
            disabled={!key.trim()}
            className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start Session
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Uses Claude Sonnet via the Anthropic API
        </p>
      </div>
    </div>
  )
}
