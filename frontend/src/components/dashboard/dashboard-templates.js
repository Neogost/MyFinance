import { DEFAULT_STATE, buildLayoutForItems } from './widgets-registry'

// ── Templates de dashboards ───────────────────────────────────────────────────
// Chaque template retourne un état initial compatible avec DashboardPage
// (layouts, hiddenWidgets, dividers) via getState().

const ALL_WIDGETS = [
  'cash-flow', 'upcoming-expenses', 'safety-net', 'salary-annual',
  'expenses-breakdown', 'salary-monthly', 'patrimoine-evolution',
  'fire-projection', 'performance-ytd', 'patrimoine-net', 'patrimoine-brut',
  'patrimoine-financier', 'enveloppe', 'capital-gains', 'devise', 'passifs',
  'geo-exposure', 'sector-exposure', 'dette', 'score-patrimonial', 'objectives',
  'kpi-immo', 'dim-bourse-sector', 'dim-bourse-continent', 'dim-bourse-country',
  'dim-bourse-currency', 'dim-bourse-subtype', 'dim-crypto-type',
  'dim-crypto-network', 'dim-crypto-instrument', 'dim-immo-usage', 'patrimoine-member',
]

function hidden(visible) {
  return ALL_WIDGETS.filter(w => !visible.includes(w))
}

export const DASHBOARD_TEMPLATES = {
  synthese: {
    key: 'synthese',
    label: 'Synthèse',
    description: 'Vue globale — tous les indicateurs clés',
    icon: '🗂️',
    getState: () => DEFAULT_STATE,
  },

  salarie: {
    key: 'salarie',
    label: 'Salarié',
    description: 'Focus revenus, dépenses et flux de trésorerie',
    icon: '💼',
    getState: () => {
      const visible = [
        'cash-flow', 'upcoming-expenses', 'safety-net',
        'salary-annual', 'expenses-breakdown', 'salary-monthly',
        'patrimoine-net', 'dette',
      ]
      const items = [
        { i: 'divider-revenus',      x: 0, y:  0, w: 12, h: 1 },
        { i: 'cash-flow',            x: 0, y:  1, w:  8, h: 7 },
        { i: 'upcoming-expenses',    x: 8, y:  1, w:  4, h: 5 },
        { i: 'safety-net',           x: 8, y:  6, w:  4, h: 2 },
        { i: 'salary-annual',        x: 0, y:  8, w:  8, h: 7 },
        { i: 'expenses-breakdown',   x: 8, y:  8, w:  4, h: 7 },
        { i: 'salary-monthly',       x: 0, y: 15, w: 12, h: 7 },
        { i: 'divider-patrimoine',   x: 0, y: 22, w: 12, h: 1 },
        { i: 'patrimoine-net',       x: 0, y: 23, w:  6, h: 5 },
        { i: 'dette',                x: 6, y: 23, w:  6, h: 5 },
      ]
      return {
        layouts: buildLayoutForItems(items),
        hiddenWidgets: hidden(visible),
        dividers: {
          'divider-revenus':    { label: 'Revenus & Dépenses', subtitle: 'Flux de trésorerie mensuel et évolution salariale.' },
          'divider-patrimoine': { label: 'Patrimoine', subtitle: '' },
        },
      }
    },
  },

  investisseur: {
    key: 'investisseur',
    label: 'Investisseur',
    description: 'Focus patrimoine, diversification et performance',
    icon: '📈',
    getState: () => {
      const visible = [
        'patrimoine-evolution', 'fire-projection', 'performance-ytd',
        'patrimoine-net', 'patrimoine-brut', 'patrimoine-financier',
        'enveloppe', 'capital-gains', 'devise',
        'geo-exposure', 'sector-exposure',
        'score-patrimonial', 'objectives',
        'dim-bourse-sector', 'dim-bourse-continent',
      ]
      const items = [
        { i: 'divider-patrimoine',   x: 0, y:  0, w: 12, h: 1 },
        { i: 'patrimoine-evolution', x: 0, y:  1, w:  9, h: 6 },
        { i: 'fire-projection',      x: 9, y:  1, w:  3, h: 6 },
        { i: 'performance-ytd',      x: 0, y:  7, w:  3, h: 6 },
        { i: 'patrimoine-net',       x: 3, y:  7, w:  3, h: 6 },
        { i: 'patrimoine-brut',      x: 6, y:  7, w:  3, h: 6 },
        { i: 'patrimoine-financier', x: 9, y:  7, w:  3, h: 6 },
        { i: 'enveloppe',            x: 0, y: 13, w:  3, h: 6 },
        { i: 'capital-gains',        x: 3, y: 13, w:  3, h: 6 },
        { i: 'devise',               x: 6, y: 13, w:  3, h: 6 },
        { i: 'divider-diversif',     x: 0, y: 19, w: 12, h: 1 },
        { i: 'geo-exposure',         x: 0, y: 20, w:  6, h: 8 },
        { i: 'sector-exposure',      x: 6, y: 20, w:  6, h: 8 },
        { i: 'dim-bourse-sector',    x: 0, y: 28, w:  3, h: 5 },
        { i: 'dim-bourse-continent', x: 3, y: 28, w:  3, h: 5 },
        { i: 'divider-objectifs',    x: 0, y: 33, w: 12, h: 1 },
        { i: 'score-patrimonial',    x: 0, y: 34, w:  3, h: 5 },
        { i: 'objectives',           x: 3, y: 34, w:  9, h: 5 },
      ]
      return {
        layouts: buildLayoutForItems(items),
        hiddenWidgets: hidden(visible),
        dividers: {
          'divider-patrimoine': { label: 'Patrimoine', subtitle: 'Évolution, répartition et performance.' },
          'divider-diversif':   { label: 'Diversification', subtitle: 'Exposition géographique et sectorielle.' },
          'divider-objectifs':  { label: 'Objectifs', subtitle: 'Score patrimonial et avancement.' },
        },
      }
    },
  },
}

export const TEMPLATE_LIST = Object.values(DASHBOARD_TEMPLATES)
