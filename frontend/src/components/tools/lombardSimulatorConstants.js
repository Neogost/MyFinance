// Taux d'avance (LTV) par catégorie d'actif et par scénario
export const LTV_SCENARIOS = {
  prudent:  { LIVRET: 90,  LIQUIDITE: 90,  BOURSE: 50, IMMO_PAPIER: 40, CRYPTO: 0,  IMMO_PHYSIQUE: 0 },
  realiste: { LIVRET: 95,  LIQUIDITE: 95,  BOURSE: 65, IMMO_PAPIER: 55, CRYPTO: 30, IMMO_PHYSIQUE: 0 },
  optimiste:{ LIVRET: 100, LIQUIDITE: 100, BOURSE: 75, IMMO_PAPIER: 65, CRYPTO: 50, IMMO_PHYSIQUE: 0 },
}

export const SCENARIO_ORDER = ['prudent', 'realiste', 'optimiste', 'custom']

export const SCENARIO_META = {
  prudent:  { label: 'Prudent',  desc: 'LTV conservateurs (banque de détail)',     bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  realiste: { label: 'Réaliste', desc: 'LTV moyens (banque privée)',                bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  optimiste:{ label: 'Optimiste',desc: 'LTV élevés (courtage haut de gamme)',       bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  custom:   { label: 'Personnalisé', desc: 'Définissez vos propres taux d\'avance', bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
}

export const CATEGORY_ORDER = ['BOURSE', 'IMMO_PAPIER', 'LIVRET', 'LIQUIDITE', 'CRYPTO', 'IMMO_PHYSIQUE']

export const CATEGORY_LABELS = {
  BOURSE:        'Bourse',
  IMMO_PAPIER:   'Immobilier papier',
  LIVRET:        'Livrets',
  LIQUIDITE:     'Liquidités',
  CRYPTO:        'Crypto',
  IMMO_PHYSIQUE: 'Immobilier physique',
}

export const CATEGORY_COLORS = {
  BOURSE:        '#6366f1',
  IMMO_PAPIER:   '#06b6d4',
  LIVRET:        '#10b981',
  LIQUIDITE:     '#22c55e',
  CRYPTO:        '#f59e0b',
  IMMO_PHYSIQUE: '#94a3b8',
}
