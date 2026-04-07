import { useState } from 'react'

const EXPECTED_USER = import.meta.env.VITE_APP_LOGIN || ''
const EXPECTED_HASH = import.meta.env.VITE_APP_PASSWORD_HASH || ''

// Simple hash so the raw password isn't sitting in the JS bundle
async function hashPassword(pw) {
  const data = new TextEncoder().encode(pw)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function LoginGate({ children }) {
  const [authed, setAuthed] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // If no credentials configured, skip the gate entirely
  if (!EXPECTED_USER || !EXPECTED_HASH) return children

  if (authed) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const hash = await hashPassword(password)
    if (username === EXPECTED_USER && hash === EXPECTED_HASH) {
      setAuthed(true)
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">PHI Shield</h2>
            <p className="text-sm text-gray-500">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}
          <button
            type="submit"
            disabled={!username || !password}
            className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
