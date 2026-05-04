import { useState, useEffect, useCallback } from 'react'
import { getGlobalPerformance } from '../../api/performance'
import { useAnalytics } from '../../hooks/useAnalytics'
import { CATEGORY_META } from '../patrimoine/constants'

// ── Helpers de date ───────────────────────────────────────────────────────────

function toIso(date) { return date.toISOString().slice(0, 10) }

function periodDates(period, customFrom, customTo) {
  const today = new Date()
  switch (period) {
    case 'GLOBAL': return { from: null, to: null }
    case 'YTD':    return { from: `${today.getFullYear()}-01-01`, to: null }
    case '1Y':     return { from: toIso(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())), to: null }
    case '3Y':     return { from: toIso(new Date(today.getFullYear() - 3, today.getMonth(), today.getDate())), to: null }
    case '5Y':     return { from: toIso(new Date(today.getFullYear() - 5, today.getMonth(), today.getDate())), to: null }
    case 'CUSTOM': return { from: customFrom || null, to: customTo || null }
    default:       return { from: null, to: null }
  }
}

// ── InfoTooltip — hover ───────────────────────────────────────────────────────
function InfoTooltip({ text, width = 'w-72', position = 'bottom' }) {
  const above = position === 'top'
  return (
    <span className="relative group ml-1.5 cursor-help inline-flex items-center align-middle">
      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span className={`absolute ${above ? 'bottom-full mb-2' : 'top-full mt-2'}
        left-1/2 -translate-x-1/2 ${width}
        text-xs text-white bg-gray-800 normal-case font-normal text-left leading-relaxed
        rounded-lg px-3 py-2 shadow-lg
        opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50`}
      >
        {text}
      </span>
    </span>
  )
}

// ── Sélecteur de période ──────────────────────────────────────────────────────

const PRESETS = [
  { id: 'GLOBAL', label: 'Global' },
  { id: 'YTD',    label: 'YTD' },
  { id: '1Y',     label: '1 an' },
  { id: '3Y',     label: '3 ans' },
  { id: '5Y',     label: '5 ans' },
  { id: 'CUSTOM', label: 'Personnalisée' },
]

function PeriodSelector({ period, customFrom, customTo, onPeriodChange, onCustomChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'CUSTOM' && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">Du</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => onCustomChange('from', e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">au</label>
            <input
              type="date"
              value={customTo}
              onChange={e => onCustomChange('to', e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <span className="text-xs text-gray-400">(vide = aujourd'hui)</span>
        </div>
      )}
    </div>
  )
}

// ── Helpers de formatage ──────────────────────────────────────────────────────
function fmtPct(val) {
  if (val == null) return '—'
  return (val >= 0 ? '+' : '') + (val * 100).toFixed(2) + ' %/an'
}

function fmtEur(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

function fmtMonth(val) {
  if (val == null) return '—'
  return (val * 100).toFixed(2) + ' %'
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, tooltip, color = 'indigo', subtitle }) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    teal:   'bg-teal-50 border-teal-200 text-teal-700',
    gray:   'bg-gray-50 border-gray-200 text-gray-700',
  }
  return (
    <div className={`border rounded-xl p-5 ${colors[color]}`}>
      <div className="text-xs font-medium mb-1 uppercase tracking-wide flex items-center">
        {label}<InfoTooltip text={tooltip} />
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {subtitle && <div className="text-xs mt-1 opacity-70">{subtitle}</div>}
    </div>
  )
}

// ── Section par catégorie ─────────────────────────────────────────────────

const CARD_COLORS = {
  BOURSE:     'bg-indigo-50 border-indigo-200 text-indigo-700',
  CRYPTO:     'bg-violet-50 border-violet-200 text-violet-700',
  LIVRET:     'bg-teal-50 border-teal-200 text-teal-700',
  IMMO_PAPIER:'bg-amber-50 border-amber-200 text-amber-700',
}

function CategoryCard({ cat }) {
  const meta     = CATEGORY_META[cat.category] ?? { label: cat.category, icon: '📊' }
  const colors   = CARD_COLORS[cat.category] ?? 'bg-gray-50 border-gray-200 text-gray-700'
  const gainColor = cat.absoluteGainEur >= 0 ? 'text-emerald-700' : 'text-red-600'

  return (
    <div className={`border rounded-xl p-4 ${colors}`}>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">{meta.icon}</span>
        <span className="text-sm font-semibold">{meta.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <div className="opacity-60 mb-0.5">TWR annualisé</div>
          <div className="font-bold text-base">{fmtPct(cat.twrAnnualized)}</div>
        </div>
        <div>
          <div className="opacity-60 mb-0.5">MWR annualisé</div>
          <div className="font-bold text-base">{fmtPct(cat.mwrAnnualized)}</div>
        </div>
        <div>
          <div className="opacity-60 mb-0.5">Valeur actuelle</div>
          <div className="font-medium">{fmtEur(cat.currentValueEur)}</div>
        </div>
        <div>
          <div className="opacity-60 mb-0.5">Plus-value</div>
          <div className={`font-medium ${gainColor}`}>{fmtEur(cat.absoluteGainEur)}</div>
        </div>
      </div>
    </div>
  )
}

// ── Section par position — style PatrimoineGroupedView ───────────────────

const CATEGORY_ORDER = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']

function PerfPositionRow({ pos }) {
  const gainColor = (pos.absoluteGainEur ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
      <td className="py-2 pl-6 pr-2">
        <span className="text-sm font-medium text-gray-900">{pos.label}</span>
        {pos.currency && pos.currency !== 'EUR' && (
          <span className="ml-1.5 text-xs text-gray-400">{pos.currency}</span>
        )}
      </td>
      <td className="py-2 px-2 text-right font-semibold text-sm tabular-nums text-indigo-700">
        {fmtPct(pos.twrAnnualized)}
      </td>
      <td className="py-2 px-2 text-right text-sm tabular-nums text-teal-700">
        {fmtPct(pos.mwrAnnualized)}
      </td>
      <td className="py-2 px-2 text-right text-sm font-bold text-gray-900 tabular-nums">
        {fmtEur(pos.currentValueEur)}
      </td>
      <td className={`py-2 px-2 pr-4 text-right text-sm font-semibold tabular-nums ${gainColor}`}>
        {fmtEur(pos.absoluteGainEur)}
      </td>
    </tr>
  )
}

function ByPositionSection({ byPosition }) {
  const grandTotal = byPosition.reduce((s, p) => s + (p.currentValueEur ?? 0), 0)

  // Grouper par partenaire puis par catégorie
  const grouped = {}
  byPosition.forEach(pos => {
    const partner = pos.partner || 'Sans partenaire'
    if (!grouped[partner]) grouped[partner] = {}
    if (!grouped[partner][pos.category]) grouped[partner][pos.category] = []
    grouped[partner][pos.category].push(pos)
  })

  // Tri partenaires par valeur décroissante (Sans partenaire en dernier)
  const partners = Object.entries(grouped).sort(([ka, a], [kb, b]) => {
    if (ka === 'Sans partenaire') return 1
    if (kb === 'Sans partenaire') return -1
    const va = Object.values(a).flat().reduce((s, p) => s + (p.currentValueEur ?? 0), 0)
    const vb = Object.values(b).flat().reduce((s, p) => s + (p.currentValueEur ?? 0), 0)
    return vb - va
  })

  const [collapsed, setCollapsed] = useState(new Set())
  const toggle = (p) => setCollapsed(prev => {
    const next = new Set(prev); next.has(p) ? next.delete(p) : next.add(p); return next
  })

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-700 -mb-2">
        Par position
        <InfoTooltip
          text="Performance TWR et MWR calculée indépendamment pour chaque position, regroupée par partenaire. Utile pour identifier vos meilleures et moins bonnes allocations."
          width="w-96"
        />
      </h2>

      {partners.map(([partner, byCategory]) => {
        const allPs       = Object.values(byCategory).flat()
        const total       = allPs.reduce((s, p) => s + (p.currentValueEur   ?? 0), 0)
        const totalGain   = allPs.reduce((s, p) => s + (p.absoluteGainEur   ?? 0), 0)
        const pct         = grandTotal > 0 ? (total / grandTotal) * 100 : 0
        const isCollapsed = collapsed.has(partner)
        const cats        = CATEGORY_ORDER.filter(cat => byCategory[cat])

        return (
          <div key={partner} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            {/* En-tête partenaire — identique à PatrimoineGroupedView */}
            <button
              onClick={() => toggle(partner)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor"
                className={`text-gray-400 shrink-0 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}
                viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
              <span className="font-semibold text-gray-900 text-sm flex-1">{partner}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-9 text-right whitespace-nowrap">{pct.toFixed(1)} %</span>
              </div>
              <span className="text-sm font-bold text-gray-700 w-28 text-right tabular-nums">{fmtEur(total)}</span>
            </button>

            {/* Tableau dépliable */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs text-gray-400 font-normal py-1.5 pl-6 pr-2">Position</th>
                      <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2">TWR</th>
                      <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2">MWR</th>
                      <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2">Valeur actuelle</th>
                      <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2 pr-4">Plus-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map(cat => {
                      const meta   = CATEGORY_META[cat] ?? { label: cat, icon: '📊' }
                      const ps     = byCategory[cat]
                      const catVal = ps.reduce((s, p) => s + (p.currentValueEur ?? 0), 0)
                      const catPct = grandTotal > 0 ? (catVal / grandTotal) * 100 : 0
                      return (
                        <>
                          {/* Sous-en-tête catégorie */}
                          <tr key={`${cat}-header`} className="bg-gray-50/70 border-y border-gray-100">
                            <td colSpan={5} className="py-1.5 pl-6 pr-4">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  <span>{meta.icon}</span>
                                  <span>{meta.label}</span>
                                  <span className="font-normal text-gray-400 normal-case tracking-normal">
                                    — {ps.length} position{ps.length > 1 ? 's' : ''}
                                  </span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{catPct.toFixed(1)} % du total</span>
                                  <span className="text-xs font-semibold text-gray-600 tabular-nums">{fmtEur(catVal)}</span>
                                </span>
                              </div>
                            </td>
                          </tr>
                          {ps.map(pos => <PerfPositionRow key={pos.positionId} pos={pos} />)}
                        </>
                      )
                    })}

                    {/* Sous-total partenaire */}
                    <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                      <td colSpan={2} className="py-2 pl-6 pr-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total {partner}</span>
                      </td>
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2 text-right">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtEur(total)}</span>
                      </td>
                      <td className={`py-2 px-2 pr-4 text-right text-sm font-bold tabular-nums ${totalGain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {fmtEur(totalGain)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tableau breakdown mensuel ─────────────────────────────────────────────────
function MonthlyBreakdownTable({ breakdown }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="text-left py-2 px-3 border-b">Mois</th>
            <th className="text-right py-2 px-3 border-b">
              V_début
              <InfoTooltip text="Valeur du portefeuille au dernier jour du mois précédent." width="w-56" />
            </th>
            <th className="text-right py-2 px-3 border-b">
              V_fin
              <InfoTooltip text="Valeur du portefeuille au dernier jour du mois (ou aujourd'hui si mois partiel)." width="w-56" />
            </th>
            <th className="text-right py-2 px-3 border-b">
              Flux net
              <InfoTooltip text="Somme nette des versements et retraits externes du mois (en EUR)." width="w-56" />
            </th>
            <th className="text-right py-2 px-3 border-b">
              Σ w·F
              <InfoTooltip text="Flux pondérés par le temps (convention CFA Institute) : w = (D-j)/D. Utilisé au dénominateur de la formule Modified Dietz." width="w-64" />
            </th>
            <th className="text-right py-2 px-3 border-b">
              R_m
              <InfoTooltip text="Rendement mensuel : (V_fin - V_début - F_net) / (V_début + Σ w·F)." width="w-56" />
            </th>
            <th className="text-center py-2 px-3 border-b">Inclus</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row, i) => (
            <tr key={i} className={`border-b ${row.included ? 'hover:bg-gray-50' : 'text-gray-400 bg-gray-50'}`}>
              <td className="py-1.5 px-3 font-mono">
                {row.month}
                {row.partial && <span className="ml-1 text-amber-600">(partiel)</span>}
              </td>
              {row.included ? (
                <>
                  <td className="py-1.5 px-3 text-right">{fmtEur(row.valueStart)}</td>
                  <td className="py-1.5 px-3 text-right">{fmtEur(row.valueEnd)}</td>
                  <td className={`py-1.5 px-3 text-right ${row.cashflowsNetEur > 0 ? 'text-emerald-600' : row.cashflowsNetEur < 0 ? 'text-red-600' : ''}`}>
                    {row.cashflowsNetEur !== 0 ? fmtEur(row.cashflowsNetEur) : '—'}
                  </td>
                  <td className="py-1.5 px-3 text-right">{fmtEur(row.weightedCashflowsEur)}</td>
                  <td className={`py-1.5 px-3 text-right font-medium ${row.monthlyReturn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {fmtMonth(row.monthlyReturn)}
                  </td>
                  <td className="py-1.5 px-3 text-center text-emerald-600">✓</td>
                </>
              ) : (
                <>
                  <td colSpan={5} className="py-1.5 px-3 italic">{row.reason}</td>
                  <td className="py-1.5 px-3 text-center text-gray-400">✗</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {breakdown.length > 0 && (
        <p className="text-xs text-gray-500 mt-2 px-1">
          Formule Modified Dietz mensuelle enchaînée — <strong>TWR annualisé = Π(1+R_m)^(365/jours) − 1</strong>
        </p>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PerformancePage() {
  const [period, setPeriod]         = useState('GLOBAL')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showWarnings, setShowWarnings]   = useState(false)
  const { trackPageView, trackEvent } = useAnalytics()

  const load = useCallback((p, cf, ct) => {
    const { from, to } = periodDates(p, cf, ct)
    // En mode custom, n'appeler l'API que si au moins "from" est renseigné
    if (p === 'CUSTOM' && !from) return
    setLoading(true)
    setError(null)
    setData(null)
    setShowBreakdown(false)
    setShowWarnings(false)
    getGlobalPerformance(from, to)
      .then(dto => {
        setData(dto)
        trackEvent('FEATURE_USE', 'tools.performance.compute', {
          period: p,
          twrAvailable: dto.twrAnnualized != null,
          mwrAvailable: dto.mwrAnnualized != null,
          warningsCount: dto.warnings?.length ?? 0,
        })
      })
      .catch(err => setError(err.message ?? 'Erreur lors du calcul'))
      .finally(() => setLoading(false))
  }, [trackEvent])

  // Chargement initial
  useEffect(() => {
    trackPageView('tools.performance.view')
    load('GLOBAL', '', '')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (p) => {
    setPeriod(p)
    if (p !== 'CUSTOM') load(p, customFrom, customTo)
  }

  const handleCustomChange = (field, value) => {
    const newFrom = field === 'from' ? value : customFrom
    const newTo   = field === 'to'   ? value : customTo
    if (field === 'from') setCustomFrom(value)
    else setCustomTo(value)
    load('CUSTOM', newFrom, newTo)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Bandeau validation */}
      <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-lg">🚧</span>
        <div>
          <p className="font-semibold text-sm">Fonctionnalité en cours de validation</p>
          <p className="text-xs mt-0.5">
            Calculs en cours de fiabilisation — accès ADMIN uniquement.
            Vérifiez le tableau mensuel ci-dessous face à un calcul Excel avant de vous fier aux chiffres.
          </p>
        </div>
      </div>

      {/* Sélecteur de période */}
      <PeriodSelector
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        onPeriodChange={handlePeriodChange}
        onCustomChange={handleCustomChange}
      />

      {/* Chargement */}
      {loading && (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          Calcul en cours…
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Résultats */}
      {data && (
        <>
          {/* KPIs TWR + MWR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard
              label="TWR annualisé"
              value={fmtPct(data.twrAnnualized)}
              color="indigo"
              subtitle="Performance pure des actifs"
              tooltip="Time-Weighted Return — mesure la performance pure de vos actifs, indépendamment du timing et du volume de vos versements. C'est la métrique standard pour comparer un portefeuille à un benchmark (CW8, S&P 500). Un TWR de 9 %/an signifie que 1 € investi au début aurait gagné en moyenne 9 % par an."
            />
            <KpiCard
              label="MWR annualisé"
              value={fmtPct(data.mwrAnnualized)}
              color="teal"
              subtitle="Performance réellement vécue"
              tooltip="Money-Weighted Return — mesure la performance que vous avez réellement vécue, qui intègre le fait que l'argent placé tôt a plus pesé que l'argent placé tard. C'est la réponse honnête à « combien j'ai gagné par an, en moyenne, avec mes choix d'investissement ». Calculé comme un XIRR sur l'ensemble de vos cashflows."
            />
          </div>

          {/* Performance par catégorie */}
          {data.byCategory?.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">
                Par catégorie
                <InfoTooltip
                  text="Performance TWR et MWR calculée indépendamment pour chaque catégorie d'actifs. Chaque catégorie utilise ses propres cashflows et sa propre valorisation — les totaux ne s'additionnent pas nécessairement à la performance globale (effet de diversification et de timing entre catégories)."
                  width="w-96"
                />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.byCategory.map(cat => (
                  <CategoryCard key={cat.category} cat={cat} />
                ))}
              </div>
            </div>
          )}

          {/* Performance par position */}
          {data.byPosition?.length > 0 && (
            <ByPositionSection byPosition={data.byPosition} />
          )}

          {/* Écart TWR vs MWR */}
          {data.twrAnnualized != null && data.mwrAnnualized != null &&
            Math.abs(data.twrAnnualized - data.mwrAnnualized) > 0.01 && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Écart TWR / MWR : {((data.twrAnnualized - data.mwrAnnualized) * 100).toFixed(2)} pt
              <InfoTooltip
                text="Un MWR inférieur au TWR signifie que vos gros versements sont arrivés à un moment moins favorable que la moyenne. Un MWR supérieur signifie que votre timing a été chanceux ou pertinent."
                width="w-80"
              />
            </div>
          )}

          {/* Synthèse */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Synthèse</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Période</span>
                <InfoTooltip
                  text="Date de début effective du chaînage TWR. En mode Global : 1er du mois suivant le premier versement (mois exclu car V_début = 0). En période restreinte : 1er du mois sélectionné, avec un snapshot d'ouverture synthétique à la date précédente."
                  width="w-80"
                />
                <p className="font-medium mt-0.5">
                  {data.from} → {data.to}
                  <span className="ml-2 text-gray-400 text-xs">({data.durationYears?.toFixed(2)} ans)</span>
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Versé net</span>
                <InfoTooltip
                  text="Somme nette des versements en EUR sur la période (versements - retraits). En période restreinte, inclut la valeur du portefeuille à la date d'ouverture comme « investissement initial »."
                  width="w-72"
                />
                <p className="font-medium mt-0.5">{fmtEur(data.totalInvestedEur)}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Valeur actuelle</span>
                <p className="font-medium mt-0.5">{fmtEur(data.currentValueEur)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Plus-value absolue</span>
                <InfoTooltip
                  text="Valeur actuelle − Versements nets. Peut différer de la performance % à cause du timing : 10 000 € versés il y a 10 ans ont eu plus de temps pour croître que 10 000 € versés l'an dernier."
                  width="w-72"
                />
                <p className={`font-medium mt-0.5 ${data.absoluteGainEur >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {fmtEur(data.absoluteGainEur)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Dividendes / intérêts</span>
                <InfoTooltip
                  text="Total des INTEREST, DIVIDEND et AIRDROP perçus sur la période, comptés en EUR. Ces flux ne sont pas des cashflows externes — ils sont déjà inclus dans la valeur actuelle (réinvestissement virtuel) et contribuent au TWR."
                  width="w-80"
                />
                <p className="font-medium mt-0.5 text-teal-700">{fmtEur(data.totalDividendsEur)}</p>
              </div>
            </div>
          </div>

          {/* Avertissements */}
          {data.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowWarnings(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition"
              >
                <span>⚠ {data.warnings.length} avertissement{data.warnings.length > 1 ? 's' : ''}</span>
                <span className="text-xs">{showWarnings ? '▲' : '▼'}</span>
              </button>
              {showWarnings && (
                <ul className="px-4 pb-3 space-y-1.5">
                  {data.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Détail mensuel (dépliable) */}
          {data.monthlyBreakdown?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowBreakdown(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <span>▸ Voir le détail du calcul (mois par mois)</span>
                <span className="text-xs text-gray-400">{showBreakdown ? '▲ réduire' : '▼ développer'}</span>
              </button>
              {showBreakdown && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-gray-500 mb-3">
                    Chaînage TWR Modified Dietz — comparez chaque ligne avec votre calcul Excel pour valider.
                  </p>
                  <MonthlyBreakdownTable breakdown={data.monthlyBreakdown} />
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Calculé le {new Date(data.computedAt).toLocaleString('fr-FR')}
          </p>
        </>
      )}
    </div>
  )
}
