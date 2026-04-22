export const CATEGORY_ORDER = ['BOURSE', 'IMMO_PHYSIQUE', 'IMMO_PAPIER', 'CRYPTO', 'LIVRET', 'LIQUIDITE']

export const CATEGORY_LABELS = {
  BOURSE:        'Bourse',
  IMMO_PHYSIQUE: 'Immobilier physique',
  IMMO_PAPIER:   'Immobilier papier',
  CRYPTO:        'Crypto-monnaies',
  LIVRET:        'Livrets',
  LIQUIDITE:     'Liquidités',
}

export const SCENARIO_ORDER = ['subprime-2008', 'dotcom-2000', 'covid-2020', 'crypto-2022', 'custom']

export const SCENARIOS = {
  'subprime-2008': {
    label: '2008 — Subprimes',
    description: 'Effondrement du marché immobilier américain, faillite de Lehman Brothers. Les marchés actions mondiaux ont perdu plus de 50 % de leur valeur en 18 mois.',
    drawdowns: { BOURSE: -0.55, IMMO_PAPIER: -0.15, IMMO_PHYSIQUE: -0.10, CRYPTO: 0, LIVRET: 0, LIQUIDITE: 0 },
    postCrisisReturn: 0.08,
    recoveryRef: '5–7 ans (actions)',
  },
  'dotcom-2000': {
    label: '2000 — Bulle dot-com',
    description: 'Éclatement de la bulle Internet après une décennie de spéculation sur les valeurs technologiques. L\'immobilier physique en France a joué un rôle contre-cyclique.',
    drawdowns: { BOURSE: -0.50, IMMO_PAPIER: -0.05, IMMO_PHYSIQUE: 0.05, CRYPTO: 0, LIVRET: 0, LIQUIDITE: 0 },
    postCrisisReturn: 0.09,
    recoveryRef: '6–8 ans (actions)',
  },
  'covid-2020': {
    label: '2020 — COVID-19',
    description: 'Chute brutale en mars 2020 liée à la pandémie mondiale, suivie d\'une récupération en V exceptionnellement rapide grâce aux plans de relance massifs.',
    drawdowns: { BOURSE: -0.35, IMMO_PAPIER: -0.10, IMMO_PHYSIQUE: -0.03, CRYPTO: -0.50, LIVRET: 0, LIQUIDITE: 0 },
    postCrisisReturn: 0.20,
    recoveryRef: '6–12 mois',
  },
  'crypto-2022': {
    label: '2022 — Crypto Winter',
    description: 'Hausse brutale des taux directeurs, effondrement des cryptomonnaies (FTX, Terra/Luna) et bear market prolongé sur les marchés actions.',
    drawdowns: { BOURSE: -0.20, IMMO_PAPIER: -0.08, IMMO_PHYSIQUE: -0.05, CRYPTO: -0.75, LIVRET: 0, LIQUIDITE: 0 },
    postCrisisReturn: 0.08,
    recoveryRef: '3–5 ans',
  },
  'custom': {
    label: 'Personnalisé',
    description: 'Définissez vos propres hypothèses de chute par catégorie d\'actif.',
    drawdowns: { BOURSE: -0.30, IMMO_PAPIER: -0.15, IMMO_PHYSIQUE: -0.10, CRYPTO: -0.50, LIVRET: 0, LIQUIDITE: 0 },
    postCrisisReturn: 0.07,
    recoveryRef: null,
  },
}
