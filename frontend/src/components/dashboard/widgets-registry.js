export const SECTION_ORDER_DEFAULT = ['revenues', 'patrimoine', 'objectifs']

export const SECTION_META = {
  revenues:   { title: 'Revenus & Dépenses',     subtitle: 'Évolution du salaire et répartition des charges mensuelles.' },
  patrimoine: { title: 'Patrimoine',              subtitle: 'Évolution, répartition, plus-values et avancement vers les objectifs.' },
  objectifs:  { title: 'Objectifs & Stratégie',  subtitle: 'Suivi de vos objectifs patrimoniaux, score de santé financière et analyse de diversification.' },
}

export const WIDGET_GROUPS = [
  {
    key: 'revenues',
    title: 'Revenus & Dépenses',
    widgets: [
      { key: 'cashFlow',          label: 'Flux des revenus' },
      { key: 'upcomingExpenses',  label: 'Prochains prélèvements' },
      { key: 'salaryAnnual',      label: 'Évolution salariale annuelle' },
      { key: 'expensesBreakdown', label: 'Répartition des dépenses' },
      { key: 'salaryMonthly',     label: 'Détail mensuel par bulletins' },
      { key: 'safetyNet',         label: 'Matelas de sécurité' },
    ],
  },
  {
    key: 'patrimoine',
    title: 'Patrimoine',
    widgets: [
      { key: 'patrimoineEvolution', label: 'Évolution du patrimoine' },
      { key: 'fireProjection',      label: 'Projection FIRE' },
      { key: 'performanceYtd',      label: 'Performance YTD (TWR)' },
      { key: 'patrimoineNet',       label: 'Patrimoine net' },
      { key: 'patrimoineBrut',      label: 'Patrimoine brut' },
      { key: 'patrimoineFinancier', label: 'Patrimoine financier' },
      { key: 'enveloppe',           label: 'Répartition par enveloppe' },
      { key: 'capitalGains',        label: 'Plus-values par catégorie' },
      { key: 'devise',              label: 'Répartition par devise' },
      { key: 'passifs',             label: 'Répartition des passifs' },
      { key: 'geoExposure',         label: 'Exposition géographique' },
      { key: 'sectorExposure',      label: 'Exposition sectorielle' },
      { key: 'dette',               label: 'Dettes' },
    ],
  },
  {
    key: 'objectifs',
    title: 'Objectifs & Stratégie',
    widgets: [
      { key: 'scorePatrimonial',       label: 'Score patrimonial' },
      { key: 'objectives',             label: 'Avancement vers les objectifs' },
      { key: 'kpiImmo',                label: 'KPI immobiliers (rendement, LTV)' },
      { key: 'diversificationBourse',  label: 'Diversification — Bourse' },
      { key: 'diversificationCrypto',  label: 'Diversification — Crypto' },
      { key: 'diversificationImmo',    label: 'Diversification — Immobilier' },
    ],
  },
]

const ALL_WIDGETS = WIDGET_GROUPS.flatMap(g => g.widgets)

export const DEFAULT_WIDGET_CONFIG = {
  version: 1,
  sectionOrder: [...SECTION_ORDER_DEFAULT],
  visibility: Object.fromEntries(ALL_WIDGETS.map(w => [w.key, true])),
}

// Migrate v0 (flat boolean map) → v1
export function migrateConfig(raw) {
  if (!raw) return DEFAULT_WIDGET_CONFIG
  if (raw.version === 1) {
    return {
      ...DEFAULT_WIDGET_CONFIG,
      ...raw,
      sectionOrder: raw.sectionOrder ?? [...SECTION_ORDER_DEFAULT],
      visibility: { ...DEFAULT_WIDGET_CONFIG.visibility, ...raw.visibility },
    }
  }
  // v0 : flat { cashFlow: true, salaryAnnual: false, ... }
  return {
    version: 1,
    sectionOrder: [...SECTION_ORDER_DEFAULT],
    visibility: { ...DEFAULT_WIDGET_CONFIG.visibility, ...raw },
  }
}
