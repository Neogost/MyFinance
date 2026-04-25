export const CATEGORY_META = {
  BOURSE:        { label: 'Bourse',          color: 'bg-blue-100 text-blue-700',     chartColor: '#2563eb', icon: '📈' },
  CRYPTO:        { label: 'Crypto',          color: 'bg-yellow-100 text-yellow-600', chartColor: '#eab308', icon: '🪙' },
  IMMO_PAPIER:   { label: 'Immo. Papier',    color: 'bg-gray-100 text-gray-500',     chartColor: '#9ca3af', icon: '🏗️' },
  IMMO_PHYSIQUE: { label: 'Immo. Physique',  color: 'bg-gray-100 text-gray-600',     chartColor: '#6b7280', icon: '🏠' },
  LIVRET:        { label: 'Livret',          color: 'bg-green-100 text-green-700',   chartColor: '#16a34a', icon: '🏦' },
  LIQUIDITE:     { label: 'Liquidités',      color: 'bg-green-100 text-green-600',   chartColor: '#4ade80', icon: '💵' },
}

export const FISCAL_ENVELOPE_LABELS = {
  NONE:      { label: 'Hors enveloppe', formLabel: 'Hors enveloppe fiscale',              color: 'bg-gray-100 text-gray-500',     chartColor: '#9ca3af' },
  CTO:       { label: 'CTO',            formLabel: 'CTO — Compte Titres Ordinaire',       color: 'bg-gray-100 text-gray-600',     chartColor: '#64748b' },
  PEA:       { label: 'PEA',            formLabel: 'PEA — Plan Épargne Actions',          color: 'bg-emerald-100 text-emerald-700', chartColor: '#059669' },
  AV:        { label: 'AV',             formLabel: 'AV — Assurance Vie',                  color: 'bg-violet-100 text-violet-700', chartColor: '#7c3aed' },
  FLAT_TAX:  { label: 'Flat taxe',      formLabel: 'Flat taxe (30 % PFU)',                color: 'bg-orange-100 text-orange-700', chartColor: '#ea580c' },
  PEE_PERCO: { label: 'PEE / PERCO',    formLabel: 'PEE / PERCO — Épargne salariale',    color: 'bg-sky-100 text-sky-700',       chartColor: '#0284c7' },
  PER:       { label: 'PER',            formLabel: 'PER — Plan Épargne Retraite',         color: 'bg-indigo-100 text-indigo-700', chartColor: '#4338ca' },
  AUTRE:     { label: 'Autre',          formLabel: 'Autre enveloppe',                     color: 'bg-gray-100 text-gray-500',     chartColor: '#a1a1aa' },
}

export const FISCAL_ENVELOPES_BY_CATEGORY = {
  BOURSE:      ['CTO', 'PEA', 'AV', 'PEE_PERCO', 'PER', 'AUTRE'],
  CRYPTO:      ['FLAT_TAX', 'AUTRE'],
  IMMO_PAPIER: ['FLAT_TAX', 'AUTRE'],
}

export const ASSET_SUB_TYPES = [
  { value: 'ETF',         label: 'ETF' },
  { value: 'ACTION',      label: 'Action' },
  { value: 'OBLIGATION',  label: 'Obligation' },
  { value: 'FOREX',       label: 'Forex' },
  { value: 'WARRANT',     label: 'Warrant' },
  { value: 'FONDS_EUROS', label: 'Fonds Euros (AV)' },
  { value: 'TRACKERS',    label: 'Trackers' },
  { value: 'SCPI',        label: 'SCPI' },
]

export const OWNERSHIP_TYPES = [
  { value: 'PLEINE_PROPRIETE', label: 'Pleine propriété' },
  { value: 'NUE_PROPRIETE',    label: 'Nue-propriété' },
  { value: 'USUFRUIT',         label: 'Usufruit' },
]

// Taux de rendement annuel moyen par catégorie — utilisés pour la projection patrimoniale
// Sources : rendements historiques long terme (MSCI World, Livret A, SCPI, indices immo)
export const PROJECTION_RATES = {
  BOURSE:        0.07,   // Rendement moyen MSCI World long terme
  CRYPTO:        0.15,   // Estimation conservative — volatilité extrême
  IMMO_PAPIER:   0.05,   // Rendement moyen SCPI (dividendes + appréciation)
  IMMO_PHYSIQUE: 0.02,   // Appréciation immobilière française moyenne
  LIVRET:        0.024,  // Taux Livret A en vigueur
  LIQUIDITE:     0,      // Pas de rendement attendu
}
