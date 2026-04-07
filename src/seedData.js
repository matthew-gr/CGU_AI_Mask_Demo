export const SEED_IDENTITIES = [
  {
    id: 'seed-1',
    token: 'PERSON_1',
    canonicalName: 'Jordan Owens',
    aliases: ['Jordan', 'J. Owens'],
    entityType: 'Person',
    firstSeen: new Date().toISOString(),
    linkedTo: null,
    role: 'caregiver',
  },
  {
    id: 'seed-1-email',
    token: 'EMAIL_1',
    canonicalName: 'jordan@caregiversunited.net',
    aliases: [],
    entityType: 'Email',
    firstSeen: new Date().toISOString(),
    linkedTo: null,
    role: '',
  },
  {
    id: 'seed-2',
    token: 'PERSON_2',
    canonicalName: "Jared O'neal",
    aliases: ['Jared'],
    entityType: 'Person',
    firstSeen: new Date().toISOString(),
    linkedTo: null,
    role: 'clinician',
  },
  {
    id: 'seed-2-email',
    token: 'EMAIL_2',
    canonicalName: 'jared@caregiversunited.net',
    aliases: [],
    entityType: 'Email',
    firstSeen: new Date().toISOString(),
    linkedTo: null,
    role: '',
  },
  {
    id: 'seed-3',
    token: 'PERSON_3',
    canonicalName: 'David Kim',
    aliases: ['Dave', 'D. Kim'],
    entityType: 'Person',
    firstSeen: new Date().toISOString(),
    linkedTo: null,
    role: 'patient',
  },
]

export const SEED_DICTIONARIES = []

export const SYSTEM_PROMPT = `You are an AI assistant helping a home care agency manage caregiver and client operations. Answer helpfully and concisely.

You will receive messages with anonymized tokens:
- [PERSON_1], [CONDITION_1], [MEDICATION_1], [FACILITY_1], etc. for entities
- [PERSON_1|ALIAS_2] means an alias reference to PERSON_1 — treat it as the same entity

Treat all tokens as real people, conditions, medications, and facilities. Respond naturally using the same token format. Do not attempt to guess real values behind tokens.`
