// PHI Detection Engine v2
// Split model: identityChart (PII/named entities) + dictionaries (medical terms)
// Alias-preserving tokens: [TOKEN|ALIAS_N] when matched text differs from canonical

import {
  CONDITIONS, MEDICATIONS, SYMPTOMS, PROCEDURES, LAB_TESTS,
  ALLERGIES, TREATMENTS, FACILITY_KEYWORDS, PROVIDER_TITLES,
  DOSAGE_PATTERN, FACILITY_NAME_PATTERN, PROVIDER_NAME_PATTERN,
} from './medicalTerms'

// --- Entity type → token prefix ---

export const ENTITY_PREFIX_MAP = {
  Person: 'PERSON', Phone: 'PHONE', Email: 'EMAIL', Address: 'ADDRESS',
  SSN: 'SSN', Date: 'DOB', Dosage: 'DOSAGE', Facility: 'FACILITY',
  Provider: 'PROVIDER', Medical_Date: 'MEDICAL_DATE',
  Condition: 'CONDITION', Medication: 'MEDICATION', Procedure: 'PROCEDURE',
  Symptom: 'SYMPTOM', Lab: 'LAB', Allergy: 'ALLERGY', Treatment: 'TREATMENT',
}

// Types that go in identity chart vs dictionaries
export const IDENTITY_TYPES = new Set([
  'Person', 'Phone', 'Email', 'Address', 'SSN', 'Date',
  'Dosage', 'Facility', 'Provider', 'Medical_Date',
])
export const DICTIONARY_TYPES = new Set([
  'Condition', 'Medication', 'Procedure', 'Symptom', 'Lab', 'Allergy', 'Treatment',
])

export const ALL_ENTITY_TYPES = Object.keys(ENTITY_PREFIX_MAP)

// --- PII patterns ---

const PII_PATTERNS = {
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  PHONE: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  DOB: /\b(?:(?:0?[1-9]|1[0-2])[\/\-.](?:0?[1-9]|[12]\d|3[01])[\/\-.](?:19|20)\d{2})\b|\b(?:(?:19|20)\d{2}[\/\-.](?:0?[1-9]|1[0-2])[\/\-.](?:0?[1-9]|[12]\d|3[01]))\b|\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi,
  ADDRESS: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s*){1,3}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Ct|Court|Pl|Place|Way|Cir(?:cle)?|Pkwy|Parkway)\.?(?:\s*(?:#|Apt|Suite|Unit|Ste)\.?\s*\w+)?\b/gi,
}

// Match "First Last", "First M. Last", "First M Last"
const NAME_PATTERN = /\b([A-Z][a-z]+\s+(?:[A-Z]\.?\s+)?[A-Z][a-z]+)\b/g

const NAME_STOPWORDS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'What', 'When', 'Where', 'Which',
  'Who', 'How', 'Have', 'Has', 'Had', 'Does', 'Did', 'Will', 'Would', 'Could',
  'Should', 'May', 'Might', 'Must', 'Can', 'Are', 'Were', 'Was', 'Been', 'Being',
  'Not', 'But', 'And', 'For', 'Yet', 'Also', 'Just', 'Then', 'Than', 'Very',
  'Some', 'Any', 'All', 'Each', 'Every', 'Most', 'Other', 'Such', 'Only',
  'Same', 'New', 'Old', 'Good', 'Great', 'High', 'Long', 'Last', 'Next',
  'First', 'Second', 'Third', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April',
  'June', 'July', 'August', 'September', 'October', 'November', 'December',
  'Hello', 'Please', 'Thanks', 'Thank', 'Sure', 'Yes', 'Hey', 'Dear',
  'Today', 'Tomorrow', 'Yesterday', 'Street', 'Avenue', 'Drive', 'Road',
  'Lane', 'Court', 'Place', 'Suite', 'Unit', 'Apt', 'North', 'South',
  'East', 'West', 'Phone', 'Email', 'Address', 'Date', 'Time', 'Home',
  'Care', 'Health', 'Medical', 'Client', 'Patient', 'Doctor', 'Nurse',
  'Visit', 'Schedule', 'Appointment', 'Service', 'Plan', 'Note', 'Call',
  'Update', 'Check', 'Need', 'Help', 'Send', 'Give', 'Take', 'Make',
  'Let', 'Get', 'Set', 'Put', 'See', 'Know', 'Think', 'Come', 'Want',
  'Use', 'Find', 'Tell', 'Ask', 'Work', 'Try', 'Leave', 'Keep', 'Begin',
  'Show', 'Hear', 'Play', 'Run', 'Move', 'Live', 'Believe', 'Bring',
  'Happen', 'Write', 'Provide', 'Sit', 'Stand', 'Lose', 'Pay', 'Meet',
  'Include', 'Continue', 'Learn', 'Change', 'Lead', 'Understand', 'Watch',
  'Follow', 'Stop', 'Create', 'Speak', 'Read', 'Allow', 'Add', 'Spend',
  'Grow', 'Open', 'Walk', 'Win', 'Offer', 'Remember', 'Love', 'Consider',
  'Appear', 'Buy', 'Wait', 'Serve', 'Die', 'Build', 'Stay', 'Fall',
  'Cut', 'Reach', 'Kill', 'Remain', 'Caregiver', 'Caregivers', 'Agency',
])

// --- Helpers ---

function hasOverlap(start, end, detections) {
  return detections.some(d => start < d.end && end > d.start)
}

// Build alias-preserving token string
// If matchedText differs from canonical, produce [TOKEN|ALIAS_N]
function buildTokenString(token, matchedText, entry) {
  if (!entry) return `[${token}]`
  const canonical = entry.canonicalName.toLowerCase()
  const matched = matchedText.toLowerCase()
  if (canonical === matched) return `[${token}]`

  // Find the alias index (1-based)
  const aliasIdx = entry.aliases.findIndex(a => a.toLowerCase() === matched)
  if (aliasIdx >= 0) {
    return `[${token}|ALIAS_${aliasIdx + 1}]`
  }
  // If it's a partial/case-variant match of canonical, no alias tag needed
  return `[${token}]`
}

// Find entry in either chart or dictionaries
function findEntry(token, identityChart, dictionaries) {
  return identityChart.find(e => e.token === token) ||
         dictionaries.find(e => e.token === token)
}

// Find or create a token for a detected value
function findOrCreateToken(value, entityType, identityChart, dictionaries) {
  const valueLower = value.toLowerCase()
  const isDictType = DICTIONARY_TYPES.has(entityType)
  const targetList = isDictType ? dictionaries : identityChart

  // Check both lists for existing match
  for (const list of [identityChart, dictionaries]) {
    for (const entry of list) {
      if (entry.entityType === entityType) {
        const allNames = [entry.canonicalName, ...entry.aliases].map(n => n.toLowerCase())
        if (allNames.includes(valueLower)) {
          return entry.token
        }
      }
    }
  }

  // Create new entry in the appropriate list
  const prefix = ENTITY_PREFIX_MAP[entityType] || 'ENTITY'
  const allEntries = [...identityChart, ...dictionaries]
  const existingCount = allEntries.filter(e => e.token.startsWith(prefix + '_')).length
  const token = `${prefix}_${existingCount + 1}`

  // Auto-generate first/last name aliases for Person entities
  const autoAliases = []
  if (entityType === 'Person') {
    const parts = value.split(/\s+/).filter(p => p.length > 1)
    if (parts.length >= 2) {
      for (const part of parts) {
        if (part.length <= 2 || NAME_STOPWORDS.has(part)) continue
        const partLower = part.toLowerCase()
        const collision = [...identityChart, ...dictionaries].some(e =>
          e.entityType === 'Person' &&
          [e.canonicalName, ...e.aliases].some(n => n.toLowerCase() === partLower)
        )
        if (!collision) autoAliases.push(part)
      }
    }
  }

  const newEntry = {
    id: crypto.randomUUID(),
    token,
    canonicalName: value,
    aliases: autoAliases,
    entityType,
    firstSeen: new Date().toISOString(),
    linkedTo: null,
    ...(isDictType ? { source: 'auto', notes: '' } : { role: '' }),
  }

  targetList.push(newEntry)
  return token
}

function findPatternMatches(text, pattern, entityType, detections, identityChart, dictionaries) {
  const regex = new RegExp(pattern.source, pattern.flags)
  let match
  while ((match = regex.exec(text)) !== null) {
    const start = match.index
    const end = start + match[0].length
    const originalText = match[0].trim()
    if (!hasOverlap(start, end, detections)) {
      const token = findOrCreateToken(originalText, entityType, identityChart, dictionaries)
      detections.push({ start, end, originalText, token, entityType })
    }
  }
}

function matchDictionaryTerms(text, terms, entityType, detections, identityChart, dictionaries) {
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      const start = match.index
      const end = start + match[0].length
      if (!hasOverlap(start, end, detections)) {
        const token = findOrCreateToken(match[0], entityType, identityChart, dictionaries)
        detections.push({ start, end, originalText: match[0], token, entityType })
      }
    }
  }
}

function sortByLengthDesc(terms) {
  return [...terms].sort((a, b) => b.length - a.length)
}

const SORTED_CONDITIONS = sortByLengthDesc(CONDITIONS)
const SORTED_MEDICATIONS = sortByLengthDesc(MEDICATIONS)
const SORTED_SYMPTOMS = sortByLengthDesc(SYMPTOMS)
const SORTED_PROCEDURES = sortByLengthDesc(PROCEDURES)
const SORTED_LAB_TESTS = sortByLengthDesc(LAB_TESTS)
const SORTED_ALLERGIES = sortByLengthDesc(ALLERGIES)
const SORTED_TREATMENTS = sortByLengthDesc(TREATMENTS)

// --- Main detection ---

export function detectAndTokenize(text, identityChart, dictionaries) {
  const detections = []

  // ===== PHASE 1: Match existing aliases from BOTH identity chart AND dictionaries =====
  const allAliases = []
  for (const list of [identityChart, dictionaries]) {
    for (const entry of list) {
      const names = [entry.canonicalName, ...entry.aliases].filter(Boolean)
      for (const name of names) {
        if (name.trim().length > 1) {
          allAliases.push({ name: name.trim(), token: entry.token, entityType: entry.entityType })
        }
      }
    }
  }
  allAliases.sort((a, b) => b.name.length - a.name.length)

  for (const { name, token, entityType } of allAliases) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}(?=\\b|'s\\b)`, 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      const start = match.index
      const end = start + match[0].length
      if (!hasOverlap(start, end, detections)) {
        detections.push({ start, end, originalText: match[0], token, entityType })
      }
    }
  }

  // ===== PHASE 2: PII patterns =====
  findPatternMatches(text, PII_PATTERNS.SSN, 'SSN', detections, identityChart, dictionaries)
  findPatternMatches(text, PII_PATTERNS.EMAIL, 'Email', detections, identityChart, dictionaries)
  findPatternMatches(text, PII_PATTERNS.PHONE, 'Phone', detections, identityChart, dictionaries)
  findPatternMatches(text, PII_PATTERNS.DOB, 'Date', detections, identityChart, dictionaries)
  findPatternMatches(text, PII_PATTERNS.ADDRESS, 'Address', detections, identityChart, dictionaries)

  // ===== PHASE 3: Facility names =====
  const facilityRegex = new RegExp(FACILITY_NAME_PATTERN.source, FACILITY_NAME_PATTERN.flags)
  let facilityMatch
  while ((facilityMatch = facilityRegex.exec(text)) !== null) {
    const start = facilityMatch.index
    const end = start + facilityMatch[0].length
    if (!hasOverlap(start, end, detections)) {
      const token = findOrCreateToken(facilityMatch[0], 'Facility', identityChart, dictionaries)
      detections.push({ start, end, originalText: facilityMatch[0], token, entityType: 'Facility' })
    }
  }

  // ===== PHASE 4: Provider names =====
  const providerRegex = new RegExp(PROVIDER_NAME_PATTERN.source, PROVIDER_NAME_PATTERN.flags)
  let providerMatch
  while ((providerMatch = providerRegex.exec(text)) !== null) {
    const start = providerMatch.index
    const end = start + providerMatch[0].length
    if (!hasOverlap(start, end, detections)) {
      const token = findOrCreateToken(providerMatch[0], 'Provider', identityChart, dictionaries)
      detections.push({ start, end, originalText: providerMatch[0], token, entityType: 'Provider' })
    }
  }

  // ===== PHASE 5: Dosages =====
  findPatternMatches(text, DOSAGE_PATTERN, 'Dosage', detections, identityChart, dictionaries)

  // ===== PHASE 6: Medical dictionary terms =====
  matchDictionaryTerms(text, SORTED_CONDITIONS, 'Condition', detections, identityChart, dictionaries)
  matchDictionaryTerms(text, SORTED_MEDICATIONS, 'Medication', detections, identityChart, dictionaries)
  matchDictionaryTerms(text, SORTED_PROCEDURES, 'Procedure', detections, identityChart, dictionaries)
  matchDictionaryTerms(text, SORTED_SYMPTOMS, 'Symptom', detections, identityChart, dictionaries)
  matchDictionaryTerms(text, SORTED_LAB_TESTS, 'Lab', detections, identityChart, dictionaries)
  matchDictionaryTerms(text, SORTED_ALLERGIES, 'Allergy', detections, identityChart, dictionaries)
  matchDictionaryTerms(text, SORTED_TREATMENTS, 'Treatment', detections, identityChart, dictionaries)

  // ===== PHASE 7: Proper names =====
  const nameRegex = new RegExp(NAME_PATTERN.source, NAME_PATTERN.flags)
  let nameMatch
  while ((nameMatch = nameRegex.exec(text)) !== null) {
    const start = nameMatch.index
    const end = start + nameMatch[0].length
    const candidate = nameMatch[0].trim()
    const words = candidate.split(/\s+/)
    if (words.every(w => NAME_STOPWORDS.has(w))) continue
    if (!hasOverlap(start, end, detections)) {
      const token = findOrCreateToken(candidate, 'Person', identityChart, dictionaries)
      detections.push({ start, end, originalText: candidate, token, entityType: 'Person' })
    }
  }

  // ===== PHASE 8: Re-scan for newly created Person aliases =====
  for (const entry of identityChart) {
    if (entry.entityType !== 'Person') continue
    const names = [entry.canonicalName, ...entry.aliases].filter(Boolean)
    for (const name of names) {
      if (name.trim().length <= 2) continue
      const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}(?=\\b|'s\\b)`, 'gi')
      let match
      while ((match = regex.exec(text)) !== null) {
        if (!hasOverlap(match.index, match.index + match[0].length, detections)) {
          detections.push({
            start: match.index,
            end: match.index + match[0].length,
            originalText: match[0],
            token: entry.token,
            entityType: entry.entityType,
          })
        }
      }
    }
  }

  // ===== Build sanitized text with alias-preserving tokens =====
  detections.sort((a, b) => b.start - a.start)
  let sanitized = text
  for (const d of detections) {
    const entry = findEntry(d.token, identityChart, dictionaries)
    const tokenStr = buildTokenString(d.token, d.originalText, entry)
    sanitized = sanitized.slice(0, d.start) + tokenStr + sanitized.slice(d.end)
  }

  detections.sort((a, b) => a.start - b.start)
  return { sanitized, detections }
}

// --- Rehydration ---

export function rehydrate(text, identityChart, dictionaries) {
  let result = text
  const allEntries = [...identityChart, ...dictionaries]

  // First handle alias-preserving tokens: [TOKEN|ALIAS_N]
  const aliasTokenRegex = /\[([A-Z_]+_\d+)\|ALIAS_(\d+)\]/g
  result = result.replace(aliasTokenRegex, (full, token, aliasIdx) => {
    const entry = allEntries.find(e => e.token === token)
    if (!entry) return full
    const idx = parseInt(aliasIdx, 10) - 1
    if (idx >= 0 && idx < entry.aliases.length) {
      return entry.aliases[idx]
    }
    // Fallback: if linked, use linked canonical
    if (entry.linkedTo) {
      const linked = allEntries.find(e => e.token === entry.linkedTo)
      if (linked) return linked.canonicalName
    }
    return entry.canonicalName
  })

  // Then handle plain tokens: [TOKEN]
  const entries = allEntries.sort((a, b) => b.token.length - a.token.length)
  for (const entry of entries) {
    const tokenStr = `[${entry.token}]`
    let replacement = entry.canonicalName
    if (entry.linkedTo) {
      const linked = allEntries.find(e => e.token === entry.linkedTo)
      if (linked) replacement = linked.canonicalName
    }
    result = result.split(tokenStr).join(replacement)
  }

  return result
}

// --- Manual tagging helper ---
// Add an entity from manual tagging to the correct list
export function addManualEntity(value, entityType, identityChart, dictionaries, source = 'manual') {
  const isDictType = DICTIONARY_TYPES.has(entityType)
  const targetList = isDictType ? dictionaries : identityChart
  const prefix = ENTITY_PREFIX_MAP[entityType] || 'ENTITY'
  const allEntries = [...identityChart, ...dictionaries]
  const existingCount = allEntries.filter(e => e.token.startsWith(prefix + '_')).length
  const token = `${prefix}_${existingCount + 1}`

  const newEntry = {
    id: crypto.randomUUID(),
    token,
    canonicalName: value,
    aliases: [],
    entityType,
    firstSeen: new Date().toISOString(),
    linkedTo: null,
    ...(isDictType ? { source, notes: '' } : { role: '' }),
  }

  targetList.push(newEntry)
  return newEntry
}
