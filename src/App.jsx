import { useState, useCallback, useRef } from 'react'
import { SEED_IDENTITIES, SEED_DICTIONARIES, SYSTEM_PROMPT } from './seedData'
import ChatTab from './components/ChatTab'
import IdentityChartTab from './components/IdentityChartTab'
import DictionariesTab from './components/DictionariesTab'
import ApiKeyModal from './components/ApiKeyModal'
import { detectAndTokenize, rehydrate, ENTITY_PREFIX_MAP, IDENTITY_TYPES, DICTIONARY_TYPES, addManualEntity } from './phiDetector'

const PHI_REVIEW_SYSTEM_PROMPT = `You are a HIPAA compliance reviewer. Identify any protected health information (PHI) in the provided text that was NOT already detected by automated regex patterns.

PHI includes: person names, phone numbers, email addresses, physical addresses, SSNs, dates of birth, medical conditions/diagnoses, medications, dosages, procedures/surgeries, symptoms, facility names, provider names, lab tests/results, allergies, and treatments.

Return ONLY a valid JSON array of objects. Each object must have:
- "value": the exact text as it appears in the input
- "type": one of Person, Phone, Email, Address, SSN, Date, Condition, Medication, Dosage, Procedure, Symptom, Facility, Provider, Medical_Date, Lab, Allergy, Treatment

If nothing additional was missed, return an empty array: []
Do NOT include entities that were already detected. Return only the JSON array.`

export default function App() {
  const [activeTab, setActiveTab] = useState('chat')
  const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  const [apiKey, setApiKey] = useState(envKey)
  const [showApiModal, setShowApiModal] = useState(!envKey)
  const [identityChart, setIdentityChart] = useState(() => structuredClone(SEED_IDENTITIES))
  const [dictionaries, setDictionaries] = useState(() => structuredClone(SEED_DICTIONARIES))
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [llmReviewEnabled, setLlmReviewEnabled] = useState(false)
  const [reviewStatus, setReviewStatus] = useState(null)

  const identityChartRef = useRef(identityChart)
  identityChartRef.current = identityChart
  const dictionariesRef = useRef(dictionaries)
  dictionariesRef.current = dictionaries
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const resetSession = useCallback(() => {
    setMessages([])
    setIdentityChart(structuredClone(SEED_IDENTITIES))
    setDictionaries(structuredClone(SEED_DICTIONARIES))
  }, [])

  // Manual tagging callback — adds entity from UI tagging
  const handleManualTag = useCallback((value, entityType) => {
    const idCopy = identityChartRef.current.map(e => ({ ...e, aliases: [...e.aliases] }))
    const dictCopy = dictionariesRef.current.map(e => ({ ...e, aliases: [...e.aliases] }))
    const newEntry = addManualEntity(value, entityType, idCopy, dictCopy, 'manual')
    if (IDENTITY_TYPES.has(entityType)) {
      setIdentityChart(idCopy)
      setDictionaries(dictCopy) // in case it also updated dicts
    } else {
      setDictionaries(dictCopy)
      setIdentityChart(idCopy)
    }
    return newEntry
  }, [])

  // Map to existing entity callback
  const handleMapToExisting = useCallback((value, targetToken) => {
    // Add value as alias to the target entity
    const updateList = (list) => list.map(e => {
      if (e.token === targetToken) {
        const aliases = [...e.aliases]
        if (!aliases.some(a => a.toLowerCase() === value.toLowerCase())) {
          aliases.push(value)
        }
        return { ...e, aliases }
      }
      return e
    })
    setIdentityChart(prev => updateList(prev))
    setDictionaries(prev => updateList(prev))
  }, [])

  async function runLlmPhiReview(rawText, alreadyDetected, apiKeyVal) {
    const detectedSummary = alreadyDetected.length > 0
      ? alreadyDetected.map(d => `"${d.originalText}" (${d.entityType})`).join(', ')
      : 'None'
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyVal,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: PHI_REVIEW_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Text: "${rawText}"\n\nAlready detected: ${detectedSummary}` }],
      }),
    })
    const data = await response.json()
    if (!response.ok) return []
    const text = data.content?.[0]?.text || '[]'
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch { return [] }
  }

  const sendMessage = useCallback(async (rawText) => {
    let idCopy = identityChartRef.current.map(e => ({ ...e, aliases: [...e.aliases] }))
    let dictCopy = dictionariesRef.current.map(e => ({ ...e, aliases: [...e.aliases] }))

    let { sanitized, detections } = detectAndTokenize(rawText, idCopy, dictCopy)

    // Optional LLM review
    if (llmReviewEnabled) {
      setReviewStatus('reviewing')
      try {
        const missed = await runLlmPhiReview(rawText, detections, apiKey)
        if (Array.isArray(missed) && missed.length > 0) {
          for (const entity of missed) {
            if (!entity.value || !entity.type) continue
            const valueLower = entity.value.toLowerCase()
            const alreadyExists = [...idCopy, ...dictCopy].some(e => {
              const names = [e.canonicalName, ...e.aliases].map(n => n.toLowerCase())
              return names.includes(valueLower)
            })
            if (alreadyExists) continue
            addManualEntity(entity.value, entity.type, idCopy, dictCopy, 'auto')
          }
          const result = detectAndTokenize(rawText, idCopy, dictCopy)
          sanitized = result.sanitized
          detections = result.detections
        }
      } catch {}
      setReviewStatus(null)
    }

    setIdentityChart(idCopy)
    setDictionaries(dictCopy)

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      rawText,
      sanitizedText: sanitized,
      hydratedText: rawText,
      detections,
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const currentMessages = messagesRef.current
      const apiMessages = [...currentMessages, userMsg].map(m => ({
        role: m.role,
        content: m.sanitizedText,
      }))

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'API request failed')

      const rawAssistantText = data.content[0]?.text || ''
      const idForAssistant = idCopy.map(e => ({ ...e, aliases: [...e.aliases] }))
      const dictForAssistant = dictCopy.map(e => ({ ...e, aliases: [...e.aliases] }))
      const { sanitized: assistantSanitized, detections: assistantDetections } =
        detectAndTokenize(rawAssistantText, idForAssistant, dictForAssistant)

      if (idForAssistant.length > idCopy.length || dictForAssistant.length > dictCopy.length) {
        setIdentityChart(idForAssistant)
        setDictionaries(dictForAssistant)
        idCopy = idForAssistant
        dictCopy = dictForAssistant
      }

      const assistantHydrated = rehydrate(assistantSanitized, idCopy, dictCopy)

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        rawText: rawAssistantText,
        sanitizedText: assistantSanitized,
        hydratedText: assistantHydrated,
        detections: assistantDetections,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        rawText: `Error: ${err.message}`,
        sanitizedText: `Error: ${err.message}`,
        hydratedText: `Error: ${err.message}`,
        detections: [],
        isError: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, llmReviewEnabled])

  if (showApiModal) {
    return <ApiKeyModal onSubmit={(key) => { setApiKey(key); setShowApiModal(false) }} />
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">PHI Shield</h1>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">HIPAA Demo</span>
        </div>

        <div className="flex items-center gap-2">
          <nav className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { id: 'chat', label: 'Chat' },
              { id: 'identity', label: 'Identity Chart', count: identityChart.length },
              { id: 'dictionaries', label: 'Dictionaries', count: dictionaries.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          <button
            onClick={resetSession}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50"
          >
            Reset Session
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <ChatTab
            messages={messages}
            onSend={sendMessage}
            isLoading={isLoading}
            identityChart={identityChart}
            dictionaries={dictionaries}
            llmReviewEnabled={llmReviewEnabled}
            setLlmReviewEnabled={setLlmReviewEnabled}
            reviewStatus={reviewStatus}
            onManualTag={handleManualTag}
            onMapToExisting={handleMapToExisting}
          />
        )}
        {activeTab === 'identity' && (
          <IdentityChartTab
            identityChart={identityChart}
            setIdentityChart={setIdentityChart}
          />
        )}
        {activeTab === 'dictionaries' && (
          <DictionariesTab
            dictionaries={dictionaries}
            setDictionaries={setDictionaries}
          />
        )}
      </main>
    </div>
  )
}
