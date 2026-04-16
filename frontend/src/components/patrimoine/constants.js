export const CATEGORY_META = {
  BOURSE:        { label: 'Bourse',          color: 'bg-blue-100 text-blue-700',     chartColor: '#2563eb', icon: '📈' },
  CRYPTO:        { label: 'Crypto',          color: 'bg-purple-100 text-purple-700', chartColor: '#7c3aed', icon: '🪙' },
  IMMO_PAPIER:   { label: 'Immo. Papier',    color: 'bg-orange-100 text-orange-700', chartColor: '#ea580c', icon: '🏗️' },
  IMMO_PHYSIQUE: { label: 'Immo. Physique',  color: 'bg-red-100 text-red-700',       chartColor: '#dc2626', icon: '🏠' },
  LIVRET:        { label: 'Livret',          color: 'bg-blue-100 text-blue-700',     chartColor: '#06b6d4', icon: '🏦' },
  LIQUIDITE:     { label: 'Liquidités',      color: 'bg-amber-100 text-amber-700',   chartColor: '#d97706', icon: '💵' },
}

export const FISCAL_ENVELOPE_LABELS = {
  NONE: null,
  CTO:  { label: 'CTO', formLabel: 'CTO — Compte Titres Ordinaire', color: 'bg-gray-100 text-gray-600' },
  PEA:  { label: 'PEA', formLabel: 'PEA — Plan Épargne Actions',    color: 'bg-emerald-100 text-emerald-700' },
  AV:   { label: 'AV',  formLabel: 'AV — Assurance Vie',            color: 'bg-violet-100 text-violet-700' },
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
