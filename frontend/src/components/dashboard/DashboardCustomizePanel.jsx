export const WIDGET_GROUPS = [
  {
    title: 'Revenus & Dépenses',
    widgets: [
      { key: 'cashFlow',          label: 'Flux des revenus' },
      { key: 'salaryAnnual',      label: 'Évolution salariale annuelle' },
      { key: 'expensesBreakdown', label: 'Répartition des dépenses' },
      { key: 'salaryMonthly',      label: 'Détail mensuel par bulletins' },
      { key: 'upcomingExpenses',  label: 'Prochains prélèvements' },
      { key: 'safetyNet',         label: 'Matelas de sécurité' },
    ],
  },
  {
    title: 'Patrimoine',
    widgets: [
      { key: 'patrimoineNet',       label: 'Patrimoine net' },
      { key: 'performanceYtd',      label: 'Performance YTD (TWR)' },
      { key: 'patrimoineEvolution', label: 'Évolution du patrimoine' },
      { key: 'fireProjection',      label: 'Projection FIRE' },
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

export const DEFAULT_WIDGET_CONFIG = Object.fromEntries(
  WIDGET_GROUPS.flatMap(g => g.widgets.map(w => [w.key, true]))
)

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

export default function DashboardCustomizePanel({ config, onChange, onClose }) {
  function toggle(key) {
    onChange({ ...config, [key]: !config[key] })
  }

  function resetAll() {
    onChange({ ...DEFAULT_WIDGET_CONFIG })
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panneau */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-80 bg-white shadow-xl z-60 flex flex-col">

        {/* En-tête — pt-safe pour passer sous la dynamic island iOS sur mobile (le panneau est plein écran) */}
        <div className="flex items-center justify-between px-5 pt-safe pb-4 sm:pt-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Personnaliser le tableau de bord</h2>
          <button
            onClick={onClose}
            data-testid="dashboard-customize-close-button"
            aria-label="Fermer le panneau de personnalisation"
            className="text-gray-400 hover:text-gray-600 transition p-1 -m-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Liste des widgets */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {WIDGET_GROUPS.map(group => (
            <div key={group.title}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                {group.title}
              </p>
              <div className="space-y-3">
                {group.widgets.map(w => (
                  <div key={w.key} className="flex items-center justify-between gap-3">
                    <span className={`text-sm ${config[w.key] ? 'text-gray-700' : 'text-gray-400'}`}>
                      {w.label}
                    </span>
                    <Toggle enabled={config[w.key]} onToggle={() => toggle(w.key)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pied */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={resetAll}
            className="w-full text-sm text-gray-500 hover:text-indigo-600 transition text-center"
          >
            Tout réafficher
          </button>
        </div>

      </div>
    </>
  )
}
