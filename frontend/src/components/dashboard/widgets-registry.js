import FireProjectionWidget from './FireProjectionWidget'
import PerformanceYtdWidget from './PerformanceYtdWidget'
import SalaryEvolutionChart from './SalaryEvolutionChart'
import CapitalGainsByCategoryChart from './CapitalGainsByCategoryChart'
import PatrimoineByCategoryChart from './PatrimoineByCategoryChart'
import PatrimoineByEnvelopeChart from './PatrimoineByEnvelopeChart'
import PatrimoineEvolutionChart from './PatrimoineEvolutionChart'
import ExpensesByCategoryChart from './ExpensesByCategoryChart'
import PassifsByCategoryChart from './PassifsByCategoryChart'
import SalaryAnnualBarChart from './SalaryAnnualBarChart'
import PatrimoineByMemberChart from './PatrimoineByMemberChart'
import PatrimoineByCurrencyChart from './PatrimoineByCurrencyChart'
import PatrimoineStrategyRadarChart from './PatrimoineStrategyRadarChart'
import PatrimoineScoreWidget from './PatrimoineScoreWidget'
import DiversificationSection from './DiversificationSection'
import DimensionWidget from './DimensionWidget'
import PatrimoineKpiWidget from './PatrimoineKpiWidget'
import SafetyNetWidget from './SafetyNetWidget'
import DetteWidget from './DetteWidget'
import PatrimoineNetWidget from './PatrimoineNetWidget'
import CashFlowSankeyWidget from './CashFlowSankeyWidget'
import UpcomingExpensesWidget from './UpcomingExpensesWidget'
import GeographicExposureWidget from './GeographicExposureWidget'
import SectorExposureWidget from './SectorExposureWidget'

// ── Registre principal ────────────────────────────────────────────────────────
// defaultSize : { w, h, minW, minH } sur grille 12 colonnes, rowHeight=80px

export const WIDGETS = {
  'cash-flow': {
    label: 'Flux des revenus',
    cardTitle: 'Flux des revenus',
    cardSubtitle: 'De vos sources de revenus jusqu\'à chaque dépense individuelle, par catégorie.',
    section: 'revenues',
    defaultSize: { w: 8, h: 7, minW: 8, minH: 7 },
    defaultVisible: true,
    component: CashFlowSankeyWidget,
    getProps: (ctx) => ({ hideValues: ctx.hideValues }),
  },
  'upcoming-expenses': {
    label: 'Prochains prélèvements',
    section: 'revenues',
    defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
    defaultVisible: true,
    component: UpcomingExpensesWidget,
    getProps: (ctx) => ({ onNavigate: ctx.onNavigate }),
  },
  'safety-net': {
    label: 'Matelas de sécurité',
    section: 'revenues',
    defaultSize: { w: 4, h: 2, minW: 3, minH: 1, maxH: 2 },
    defaultVisible: true,
    component: SafetyNetWidget,
    getProps: (ctx) => ({ user: ctx.user }),
    noCard: true,
  },
  'salary-annual': {
    label: 'Évolution salariale annuelle',
    cardTitle: 'Évolution salariale annuelle',
    cardSubtitle: 'Brut, net imposable et net d\'impôt par année — d\'après les contrats et révisions salariales.',
    section: 'revenues',
    defaultSize: { w: 8, h: 7, minW: 3, minH: 3 },
    defaultVisible: true,
    component: SalaryAnnualBarChart,
    getProps: () => ({}),
    sizeThresholds: { xs: [3, 3], sm: [4, 4], md: [6, 5] },
  },
  'expenses-breakdown': {
    label: 'Répartition des dépenses',
    cardTitle: 'Répartition des dépenses',
    cardSubtitle: 'Part de chaque poste dans les dépenses mensuelles récurrentes, et capacité d\'épargne résiduelle.',
    section: 'revenues',
    defaultSize: { w: 4, h: 7, minW: 3, minH: 3 },
    defaultVisible: true,
    component: ExpensesByCategoryChart,
    getProps: () => ({}),
  },
  'salary-monthly': {
    label: 'Détail mensuel par bulletins',
    cardTitle: 'Détail mensuel par bulletins',
    cardSubtitle: 'Brut, net fiscal, net versé et prélèvement à la source — données issues des bulletins de paie saisis.',
    section: 'revenues',
    defaultSize: { w: 12, h: 7, minW: 3, minH: 3 },
    defaultVisible: true,
    component: SalaryEvolutionChart,
    sizeThresholds: { xs: [3, 3], sm: [4, 4], md: [6, 5] },
    getProps: () => ({}),
    desktopOnly: true,
  },
  'patrimoine-evolution': {
    label: 'Évolution du patrimoine',
    cardTitle: 'Évolution du patrimoine',
    cardSubtitle: 'Valeur brute par catégorie au fil des relevés saisis.',
    section: 'patrimoine',
    defaultSize: { w: 9, h: 6, minW: 3, minH: 3 },
    defaultVisible: true,
    component: PatrimoineEvolutionChart,
    getProps: () => ({}),
  },
  'fire-projection': {
    label: 'Projection FIRE',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 3, minH: 3 },
    defaultVisible: true,
    component: FireProjectionWidget,
    getProps: () => ({}),
    cardClass: 'bg-violet-50 border-violet-200',
  },
  'performance-ytd': {
    label: 'Performance YTD (TWR)',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 2, minH: 3 },
    defaultVisible: true,
    component: PerformanceYtdWidget,
    getProps: (ctx) => ({ onNavigate: ctx.onNavigate }),
    cardClass: 'bg-teal-50 border-teal-200',
  },
  'patrimoine-net': {
    label: 'Patrimoine net',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 2, minH: 3 },
    defaultVisible: true,
    component: PatrimoineNetWidget,
    getProps: () => ({}),
    noCard: true,
  },
  'patrimoine-brut': {
    label: 'Patrimoine brut',
    cardTitle: 'Patrimoine brut',
    cardSubtitle: 'Répartition de la valeur actuelle par catégorie d\'actif.',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 3, minH: 3 },
    defaultVisible: true,
    component: PatrimoineByCategoryChart,
    getProps: (ctx) => ({ positions: ctx.familyPositions }),
  },
  'patrimoine-financier': {
    label: 'Patrimoine financier',
    cardTitle: 'Patrimoine financier',
    cardSubtitle: 'Répartition hors immobilier physique et papier.',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 3, minH: 3 },
    defaultVisible: true,
    component: PatrimoineByCategoryChart,
    getProps: (ctx) => ({ financierOnly: true, positions: ctx.familyPositions }),
  },
  'enveloppe': {
    label: 'Répartition par enveloppe',
    cardTitle: 'Répartition par enveloppe',
    cardSubtitle: 'Répartition du patrimoine brut par type d\'enveloppe fiscale (AV, PEA, CTO…).',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 3, minH: 3 },
    defaultVisible: true,
    component: PatrimoineByEnvelopeChart,
    getProps: (ctx) => ({ positions: ctx.familyPositions }),
  },
  'capital-gains': {
    label: 'Plus-values par catégorie',
    cardTitle: 'Plus-values par catégorie',
    cardSubtitle: 'Répartition des plus-values latentes sur l\'ensemble des positions actives.',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 2, minH: 3 },
    defaultVisible: true,
    component: CapitalGainsByCategoryChart,
    getProps: (ctx) => ({ positions: ctx.familyPositions }),
  },
  'devise': {
    label: 'Répartition par devise',
    cardTitle: 'Répartition par devise',
    cardSubtitle: 'Exposition aux devises étrangères — valeurs converties en EUR au taux courant.',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 3, minH: 3 },
    defaultVisible: true,
    component: PatrimoineByCurrencyChart,
    getProps: (ctx) => ({ positions: ctx.familyPositions }),
  },
  'passifs': {
    label: 'Répartition des passifs',
    cardTitle: 'Répartition des passifs',
    cardSubtitle: 'Valeur actuelle estimée par catégorie de possession, avec décote cumulée depuis l\'achat.',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 3, minH: 3 },
    defaultVisible: true,
    component: PassifsByCategoryChart,
    getProps: () => ({}),
    autoHide: true,
  },
  'geo-exposure': {
    label: 'Exposition géographique',
    cardTitle: 'Exposition géographique',
    cardSubtitle: 'Positions BOURSE pondérées par l\'allocation géographique de chaque ETF.',
    section: 'patrimoine',
    defaultSize: { w: 6, h: 8, minW: 3, minH: 3 },
    defaultVisible: true,
    component: GeographicExposureWidget,
    getProps: (ctx) => ({ positions: ctx.familyPositions }),
  },
  'sector-exposure': {
    label: 'Exposition sectorielle',
    cardTitle: 'Exposition sectorielle',
    cardSubtitle: 'Positions BOURSE pondérées par la répartition sectorielle de chaque ETF.',
    section: 'patrimoine',
    defaultSize: { w: 6, h: 8, minW: 3, minH: 3 },
    defaultVisible: true,
    component: SectorExposureWidget,
    getProps: (ctx) => ({ positions: ctx.familyPositions }),
  },
  'dette': {
    label: 'Dettes',
    section: 'patrimoine',
    defaultSize: { w: 12, h: 5, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DetteWidget,
    getProps: (ctx) => ({ onNavigate: ctx.onNavigate }),
    noCard: true,
  },
  'score-patrimonial': {
    label: 'Score patrimonial',
    cardTitle: 'Score patrimonial',
    section: 'objectifs',
    defaultSize: { w: 3, h: 5, minW: 2, minH: 3 },
    defaultVisible: true,
    component: PatrimoineScoreWidget,
    getProps: () => ({}),
    cardClass: 'bg-indigo-50 border-indigo-200',
  },
  'objectives': {
    label: 'Avancement vers les objectifs',
    cardTitle: 'Avancement vers les objectifs',
    cardSubtitle: 'Superposition du patrimoine actuel et des objectifs cibles par catégorie — en pourcentage de l\'objectif.',
    section: 'objectifs',
    defaultSize: { w: 9, h: 5, minW: 3, minH: 3 },
    defaultVisible: true,
    component: PatrimoineStrategyRadarChart,
    getProps: () => ({}),
  },
  'kpi-immo': {
    label: 'KPI immobiliers (rendement, LTV)',
    cardTitle: 'KPI immobiliers',
    cardSubtitle: 'Rendement locatif brut et ratio LTV par bien immobilier.',
    section: 'objectifs',
    defaultSize: { w: 12, h: 4, minW: 8, minH: 3 },
    defaultVisible: true,
    component: PatrimoineKpiWidget,
    getProps: () => ({}),
    autoHide: true,
  },
  // ── Dimensions Bourse ────────────────────────────────────────────────────────
  'dim-bourse-sector': {
    label: 'Bourse — Sectoriel',
    section: 'objectifs',
    defaultSize: { w: 3, h: 5, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DimensionWidget,
    getProps: () => ({ category: 'BOURSE', dimension: 'SECTOR', breakdownKey: 'sector', title: 'Sectoriel', showCoverage: true }),
    noCard: true, autoHide: true,
  },
  'dim-bourse-continent': {
    label: 'Bourse — Continent',
    section: 'objectifs',
    defaultSize: { w: 3, h: 5, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DimensionWidget,
    getProps: () => ({ category: 'BOURSE', dimension: 'CONTINENT', breakdownKey: 'continent', title: 'Continent', showCoverage: true }),
    noCard: true, autoHide: true,
  },
  'dim-bourse-country': {
    label: 'Bourse — Géographique',
    section: 'objectifs',
    defaultSize: { w: 3, h: 5, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DimensionWidget,
    getProps: () => ({ category: 'BOURSE', dimension: 'COUNTRY', breakdownKey: 'country', title: 'Géographique', showCoverage: true }),
    noCard: true, autoHide: true,
  },
  'dim-bourse-currency': {
    label: 'Bourse — Devise',
    section: 'objectifs',
    defaultSize: { w: 3, h: 5, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DimensionWidget,
    getProps: () => ({ category: 'BOURSE', dimension: 'CURRENCY', breakdownKey: 'currency', title: 'Devise', showCoverage: false }),
    noCard: true, autoHide: true,
  },
  'dim-bourse-subtype': {
    label: "Bourse — Type d'actif",
    section: 'objectifs',
    defaultSize: { w: 3, h: 5, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DimensionWidget,
    getProps: () => ({ category: 'BOURSE', dimension: 'ASSET_SUBTYPE', breakdownKey: 'asset-subtype', title: "Type d'actif", showCoverage: false }),
    noCard: true, autoHide: true,
  },
  // ── Dimensions Crypto ────────────────────────────────────────────────────────
  'dim-crypto-type': {
    label: 'Crypto — Type',
    section: 'objectifs',
    defaultSize: { w: 3, h: 7, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DimensionWidget,
    getProps: () => ({ category: 'CRYPTO', dimension: 'CRYPTO_TYPE', breakdownKey: 'crypto-type', title: 'Type de crypto', showCoverage: false }),
    noCard: true, autoHide: true,
  },
  'dim-crypto-network': {
    label: 'Crypto — Réseau',
    section: 'objectifs',
    defaultSize: { w: 3, h: 7, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DimensionWidget,
    getProps: () => ({ category: 'CRYPTO', dimension: 'CRYPTO_NETWORK', breakdownKey: 'crypto-network', title: 'Réseau', showCoverage: false }),
    noCard: true, autoHide: true,
  },
  'dim-crypto-instrument': {
    label: 'Crypto — Par instrument',
    section: 'objectifs',
    defaultSize: { w: 3, h: 7, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DimensionWidget,
    getProps: () => ({ category: 'CRYPTO', dimension: 'INSTRUMENT', breakdownKey: 'instrument', breakdownCat: 'CRYPTO', title: 'Par instrument', showCoverage: false }),
    noCard: true, autoHide: true,
  },
  // ── Dimensions Immobilier ─────────────────────────────────────────────────────
  'dim-immo-usage': {
    label: 'Immo — RP / Locatif',
    section: 'objectifs',
    defaultSize: { w: 3, h: 7, minW: 3, minH: 3 },
    defaultVisible: true,
    component: DimensionWidget,
    getProps: () => ({ category: 'IMMO_PHYSIQUE', dimension: 'PROPERTY_USAGE', breakdownKey: 'property-usage', title: 'RP / Locatif', showCoverage: false }),
    noCard: true, autoHide: true,
  },
  'patrimoine-member': {
    label: 'Patrimoine par membre',
    cardTitle: 'Patrimoine par membre',
    cardSubtitle: 'Part du patrimoine brut actif détenue par chaque membre du groupe.',
    section: 'patrimoine',
    defaultSize: { w: 3, h: 6, minW: 3, minH: 3 },
    defaultVisible: false,
    familyOnly: true,
    component: PatrimoineByMemberChart,
    getProps: (ctx) => ({ data: ctx.memberBreakdown }),
  },
}

// ── Sections (pour le panneau de personnalisation palier 1) ───────────────────

export const SECTION_ORDER_DEFAULT = ['revenues', 'patrimoine', 'objectifs']

export const SECTION_META = {
  revenues:   { title: 'Revenus & Dépenses',    subtitle: 'Évolution du salaire et répartition des charges mensuelles.' },
  patrimoine: { title: 'Patrimoine',             subtitle: 'Évolution, répartition, plus-values et avancement vers les objectifs.' },
  objectifs:  { title: 'Objectifs & Stratégie', subtitle: 'Suivi de vos objectifs patrimoniaux, score de santé financière et analyse de diversification.' },
}

export const WIDGET_GROUPS = [
  {
    key: 'revenues',
    title: 'Revenus & Dépenses',
    widgets: Object.entries(WIDGETS)
      .filter(([, m]) => m.section === 'revenues')
      .map(([key, m]) => ({ key, label: m.label })),
  },
  {
    key: 'patrimoine',
    title: 'Patrimoine',
    widgets: Object.entries(WIDGETS)
      .filter(([, m]) => m.section === 'patrimoine')
      .map(([key, m]) => ({ key, label: m.label })),
  },
  {
    key: 'objectifs',
    title: 'Objectifs & Stratégie',
    widgets: Object.entries(WIDGETS)
      .filter(([, m]) => m.section === 'objectifs')
      .map(([key, m]) => ({ key, label: m.label })),
  },
]

// ── Layout par défaut avec séparateurs de sections ───────────────────────────

// ── Layout par défaut — coordonnées manuelles { i, x, y, w, h } ──────────────
// x : colonne de départ (0–11), y : ligne de départ, w : largeur, h : hauteur
// Séparateurs : w=12 h=1, isResizable=false

const DEFAULT_LAYOUT_ITEMS = [
  // ── Revenus & Dépenses ─────────────────────────────────────────────────────
  { i: 'divider-revenues',       x: 0, y:  0, w: 12, h: 1 },
  { i: 'cash-flow',              x: 0, y:  1, w:  8, h: 7 },
  { i: 'upcoming-expenses',      x: 8, y:  1, w:  4, h: 5 },
  { i: 'safety-net',             x: 8, y:  6, w:  4, h: 2 }, // ← sous upcoming-expenses
  { i: 'salary-annual',          x: 0, y:  8, w:  8, h: 7 },
  { i: 'expenses-breakdown',     x: 8, y:  8, w:  4, h: 7 },
  { i: 'salary-monthly',         x: 0, y: 15, w: 12, h: 7 },

  // ── Patrimoine ─────────────────────────────────────────────────────────────
  { i: 'divider-patrimoine',     x: 0, y: 22, w: 12, h: 1 },
  { i: 'patrimoine-evolution',   x: 0, y: 23, w:  9, h: 6 },
  { i: 'fire-projection',        x: 9, y: 23, w:  3, h: 6 },
  { i: 'performance-ytd',        x: 0, y: 29, w:  3, h: 6 },
  { i: 'patrimoine-net',         x: 3, y: 29, w:  3, h: 6 },
  { i: 'patrimoine-brut',        x: 6, y: 29, w:  3, h: 6 },
  { i: 'patrimoine-financier',   x: 9, y: 29, w:  3, h: 6 },
  { i: 'enveloppe',              x: 0, y: 35, w:  3, h: 6 },
  { i: 'capital-gains',          x: 3, y: 35, w:  3, h: 6 },
  { i: 'devise',                 x: 6, y: 35, w:  3, h: 6 },
  { i: 'passifs',                x: 9, y: 35, w:  3, h: 6 },
  { i: 'geo-exposure',           x: 0, y: 41, w:  6, h: 8 },
  { i: 'sector-exposure',        x: 6, y: 41, w:  6, h: 8 },
  { i: 'dette',                  x: 0, y: 49, w: 12, h: 5 },

  // ── Objectifs & Stratégie ──────────────────────────────────────────────────
  { i: 'divider-objectifs',      x: 0, y: 54, w: 12, h: 1 },
  { i: 'score-patrimonial',      x: 0, y: 55, w:  3, h: 5 },
  { i: 'objectives',             x: 3, y: 55, w:  9, h: 5 },
  { i: 'kpi-immo',               x: 0, y: 60, w: 12, h: 4 },
  { i: 'dim-bourse-sector',      x: 0, y: 64, w:  3, h: 5 },
  { i: 'dim-bourse-continent',   x: 3, y: 64, w:  3, h: 5 },
  { i: 'dim-bourse-country',     x: 6, y: 64, w:  3, h: 5 },
  { i: 'dim-bourse-currency',    x: 9, y: 64, w:  3, h: 5 },
  { i: 'dim-bourse-subtype',     x: 0, y: 69, w:  3, h: 5 },
  { i: 'dim-crypto-type',        x: 3, y: 69, w:  3, h: 7 },
  { i: 'dim-crypto-network',     x: 6, y: 69, w:  3, h: 7 },
  { i: 'dim-crypto-instrument',  x: 9, y: 69, w:  3, h: 7 },
  { i: 'dim-immo-usage',         x: 0, y: 76, w:  3, h: 7 },
]

// Séparateurs avec leur label/subtitle
const DEFAULT_DIVIDERS = {
  'divider-revenues':   { label: 'Revenus & Dépenses',    subtitle: 'Évolution du salaire et répartition des charges mensuelles.' },
  'divider-patrimoine': { label: 'Patrimoine',             subtitle: 'Évolution, répartition, plus-values et avancement vers les objectifs.' },
  'divider-objectifs':  { label: 'Objectifs & Stratégie', subtitle: 'Suivi de vos objectifs patrimoniaux, score de santé financière et analyse de diversification.' },
}

function buildDefaultState() {
  const lg = DEFAULT_LAYOUT_ITEMS.map(item => {
    const isDivider = item.i.startsWith('divider-')
    const meta = isDivider ? null : WIDGETS[item.i]
    return {
      ...item,
      w:    item.w,
      h:    item.h,
      minW: isDivider ? 12 : (meta?.defaultSize.minW ?? 2),
      minH: isDivider ? 1  : (meta?.defaultSize.minH ?? 2),
      ...(isDivider ? { isResizable: false } : {}),
    }
  })

  const md = lg.map(item => ({
    ...item,
    w: item.i.startsWith('divider-') ? 8 : Math.max(item.minW ?? 1, Math.round(item.w * 8 / 12)),
  }))
  const xs = lg.map((item, idx) => ({ i: item.i, x: 0, y: idx, w: 1, h: item.h }))

  const layoutIds     = new Set(lg.map(item => item.i))
  const hiddenWidgets = Object.keys(WIDGETS).filter(key => !layoutIds.has(key))

  return {
    layouts: { lg, md, xs },
    dividers: DEFAULT_DIVIDERS,
    hiddenWidgets,
  }
}

export const DEFAULT_STATE   = buildDefaultState()
export const DEFAULT_LAYOUTS = DEFAULT_STATE.layouts

// ── Config globale (visibility + layouts) ────────────────────────────────────

export const DEFAULT_WIDGET_CONFIG = {
  version: 1,
  sectionOrder: [...SECTION_ORDER_DEFAULT],
  visibility: Object.fromEntries(
    Object.entries(WIDGETS).map(([key, m]) => [key, m.defaultVisible])
  ),
}

// Migrate v0 (flat boolean) → v1
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
  // v0 : flat { cashFlow: true, ... } — best-effort mapping to new kebab-case keys
  const V0_MAP = {
    cashFlow: 'cash-flow', upcomingExpenses: 'upcoming-expenses',
    salaryAnnual: 'salary-annual', expensesBreakdown: 'expenses-breakdown',
    salaryMonthly: 'salary-monthly', safetyNet: 'safety-net',
    patrimoineEvolution: 'patrimoine-evolution', fireProjection: 'fire-projection',
    performanceYtd: 'performance-ytd', patrimoineNet: 'patrimoine-net',
    patrimoineBrut: 'patrimoine-brut', patrimoineFinancier: 'patrimoine-financier',
    enveloppe: 'enveloppe', capitalGains: 'capital-gains', devise: 'devise',
    passifs: 'passifs', geoExposure: 'geo-exposure', sectorExposure: 'sector-exposure',
    dette: 'dette', scorePatrimonial: 'score-patrimonial', objectives: 'objectives',
    kpiImmo: 'kpi-immo',
    // diversification-* supprimés → remplacés par dim-* individuels (pas de mapping 1-1)
  }
  const visibility = { ...DEFAULT_WIDGET_CONFIG.visibility }
  Object.entries(raw).forEach(([oldKey, val]) => {
    const newKey = V0_MAP[oldKey]
    if (newKey) visibility[newKey] = val
  })
  return { version: 1, sectionOrder: [...SECTION_ORDER_DEFAULT], visibility }
}
