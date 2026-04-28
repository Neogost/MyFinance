import { useEffect, useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { getPositions } from '../../api/patrimoine'
import {
  LTV_SCENARIOS, SCENARIO_ORDER, SCENARIO_META,
  CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_COLORS,
} from './lombardSimulatorConstants'
import {
  computeCapacity, computeLoanCost, buildAmortizationTable,
  computeMaxDrop, applyStressScenario, evaluateMarginCallRisk,
  computeSaleAlternative, computeAvgCapitalGainRatio,
} from './lombardSimulatorUtils'
import { SCENARIOS as CRISIS_SCENARIOS, SCENARIO_ORDER as CRISIS_ORDER } from './crisisScenarios'

const fmtEur  = (n) => n == null || isNaN(n) ? '—' : Math.round(n).toLocaleString('fr-FR') + ' €'
const fmtPct  = (n) => n == null || isNaN(n) ? '—' : `${n.toFixed(1)} %`

function StatusBadge({ status }) {
  const cfg = {
    safe:        { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✓ Sain' },
    warning:     { bg: 'bg-amber-100',   text: 'text-amber-700',   label: '⚠ Vigilance' },
    margin_call: { bg: 'bg-red-100',     text: 'text-red-700',     label: '✗ Margin call' },
  }[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: '—' }
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
}

export default function LombardSimulatorPage() {
  const [positions,        setPositions]        = useState([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)

  // Scénario LTV
  const [ltvScenario, setLtvScenario] = useState('realiste')
  const [customLtv,   setCustomLtv]   = useState({ ...LTV_SCENARIOS.realiste })

  // Mode
  const [mode,       setMode]       = useState('capacity')  // 'capacity' | 'amount'
  const [loanAmount, setLoanAmount] = useState(50000)

  // Emprunt
  const [annualRate,    setAnnualRate]    = useState(3.5)
  const [loanDuration,  setLoanDuration]  = useState(10)
  const [repaymentMode, setRepaymentMode] = useState('in_fine')
  const [purpose,       setPurpose]       = useState('')

  // Margin call
  const [marginCallThreshold, setMarginCallThreshold] = useState(85)

  // Stress test
  const [stressScenarioId, setStressScenarioId] = useState('subprime-2008')
  const [customDrops, setCustomDrops] = useState({
    BOURSE: -30, IMMO_PAPIER: -15, IMMO_PHYSIQUE: -10, CRYPTO: -50, LIVRET: 0, LIQUIDITE: 0,
  })

  // Comparaison vente
  const [compareWithSale,    setCompareWithSale]    = useState(false)
  const [capitalGainTaxRate, setCapitalGainTaxRate] = useState(30)
  const [expectedReturn,     setExpectedReturn]     = useState(5)

  // UI
  const [showAmortTable, setShowAmortTable] = useState(false)

  // Chargement positions
  useEffect(() => {
    getPositions({ status: 'ACTIVE' })
      .then(setPositions)
      .catch(() => setError('Impossible de charger vos positions.'))
      .finally(() => setLoading(false))
  }, [])

  const valueByCategory = useMemo(() => {
    const result = {}
    positions.forEach(p => {
      const v = parseFloat(p.computed?.currentValueEur ?? 0)
      if (v > 0) result[p.category] = (result[p.category] ?? 0) + v
    })
    return result
  }, [positions])

  const ltvMap = ltvScenario === 'custom' ? customLtv : LTV_SCENARIOS[ltvScenario]

  // Capacités pour les 3 scénarios + actuel
  const capacities = useMemo(() => ({
    prudent:  computeCapacity(valueByCategory, LTV_SCENARIOS.prudent),
    realiste: computeCapacity(valueByCategory, LTV_SCENARIOS.realiste),
    optimiste:computeCapacity(valueByCategory, LTV_SCENARIOS.optimiste),
    custom:   computeCapacity(valueByCategory, customLtv),
  }), [valueByCategory, customLtv])

  const activeCapacity = capacities[ltvScenario]
  const effectiveAmount = mode === 'capacity' ? activeCapacity.total : Math.min(loanAmount, activeCapacity.total)

  // Coût du prêt
  const loanCost = useMemo(
    () => computeLoanCost(effectiveAmount, annualRate, loanDuration, repaymentMode),
    [effectiveAmount, annualRate, loanDuration, repaymentMode]
  )

  // Amortissement (uniquement chargé si tableau ouvert ou pour le graphique)
  const amortTable = useMemo(
    () => effectiveAmount > 0 ? buildAmortizationTable(effectiveAmount, annualRate, loanDuration, repaymentMode) : [],
    [effectiveAmount, annualRate, loanDuration, repaymentMode]
  )

  // Données graphique évolution capital restant (annuel)
  const chartData = useMemo(() => {
    if (amortTable.length === 0) return []
    const data = [{ year: 0, remaining: effectiveAmount }]
    for (let y = 1; y <= loanDuration; y++) {
      const m = y * 12 - 1
      const row = amortTable[m]
      if (row) data.push({ year: y, remaining: row.remaining })
    }
    return data
  }, [amortTable, effectiveAmount, loanDuration])

  // Margin call
  const maxDrop = computeMaxDrop(effectiveAmount, activeCapacity.totalValue, marginCallThreshold)

  // Stress test : scénario actif (drawdowns en fraction, ex −0.55)
  const activeStressDrawdowns = stressScenarioId === 'custom'
    ? Object.fromEntries(Object.entries(customDrops).map(([k, v]) => [k, v / 100]))
    : (CRISIS_SCENARIOS[stressScenarioId]?.drawdowns ?? {})

  const stressedValue = applyStressScenario(valueByCategory, activeStressDrawdowns)
  const stressedTotal = Object.values(stressedValue).reduce((s, v) => s + v, 0)
  const stressedCapacity = computeCapacity(stressedValue, ltvMap)
  const stressRisk = evaluateMarginCallRisk(effectiveAmount, stressedTotal, marginCallThreshold)

  // Tableau récap stress sur tous les scénarios
  const stressSummary = useMemo(() => {
    return CRISIS_ORDER.filter(id => id !== 'custom').map(id => {
      const sc = CRISIS_SCENARIOS[id]
      const v  = applyStressScenario(valueByCategory, sc.drawdowns)
      const total = Object.values(v).reduce((s, x) => s + x, 0)
      const cap   = computeCapacity(v, ltvMap)
      const risk  = evaluateMarginCallRisk(effectiveAmount, total, marginCallThreshold)
      return {
        id, label: sc.label,
        portfolioValue: total,
        capacity:       cap.total,
        ltvEffective:   risk.ltvEffective,
        status:         risk.status,
        amountToComplete: risk.amountToComplete,
      }
    })
  }, [valueByCategory, ltvMap, effectiveAmount, marginCallThreshold])

  // Comparaison vente
  const cgRatio = useMemo(() => computeAvgCapitalGainRatio(positions), [positions])
  const saleComparison = compareWithSale ? computeSaleAlternative({
    loanAmount: effectiveAmount,
    totalInterest: loanCost.totalInterest,
    capitalGainRatio: cgRatio,
    capitalGainTaxRate,
    expectedReturn,
    durationYears: loanDuration,
  }) : null

  // Données donut (capacité par catégorie)
  const donutData = CATEGORY_ORDER
    .map(cat => ({
      cat, label: CATEGORY_LABELS[cat],
      value: activeCapacity.byCategory[cat] ?? 0,
      color: CATEGORY_COLORS[cat],
    }))
    .filter(d => d.value > 0.01)

  // ── Loading / Error ────────────────────────────────────────────
  if (loading) return <p className="text-sm text-gray-400">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  if (Object.keys(valueByCategory).length === 0) return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Simulateur de crédit Lombard</h1>
      <p className="text-sm text-gray-500">Aucune position active. Ajoutez des actifs dans la page Patrimoine pour utiliser cet outil.</p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Simulateur de crédit Lombard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Empruntez en mettant votre portefeuille en collatéral, sans vendre vos actifs.
        </p>
      </div>

      {/* Bannière 3 scénarios */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {SCENARIO_ORDER.map(id => {
          const meta = SCENARIO_META[id]
          const cap  = capacities[id]
          const isActive = ltvScenario === id
          return (
            <button key={id} onClick={() => setLtvScenario(id)}
              className={`text-left p-4 rounded-xl border-2 transition ${isActive ? `${meta.bg} ${meta.border}` : 'bg-white border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? meta.text : 'text-gray-500'}`}>{meta.label}</span>
              </div>
              <p className={`text-xl font-bold mb-1 amount ${isActive ? meta.text : 'text-gray-900'}`}>{fmtEur(cap.total)}</p>
              <p className="text-xs text-gray-400">LTV moyen {fmtPct(cap.avgLtv)}</p>
              <p className="text-xs text-gray-400 mt-1 leading-tight">{meta.desc}</p>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* PANNEAU GAUCHE */}
        <div className="md:col-span-1 flex flex-col gap-4">

          {/* Mode */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode('capacity')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${mode === 'capacity' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Capacité max
              </button>
              <button onClick={() => setMode('amount')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${mode === 'amount' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Montant précis
              </button>
            </div>
            {mode === 'amount' && (
              <div className="mt-3">
                <label className="text-xs text-gray-500">Montant souhaité (€)</label>
                <input type="number" min="0" step="1000" value={loanAmount}
                  onChange={e => setLoanAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                {loanAmount > activeCapacity.total && (
                  <p className="text-xs text-red-600 mt-1">⚠ Dépasse la capacité ({fmtEur(activeCapacity.total)})</p>
                )}
                <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)}
                  placeholder="Projet (optionnel) — ex : apport immobilier"
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-indigo-500" />
              </div>
            )}
          </div>

          {/* Édition LTV custom */}
          {ltvScenario === 'custom' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Taux d'avance personnalisés</h3>
              <div className="space-y-3">
                {CATEGORY_ORDER.map(cat => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-xs font-semibold text-violet-700">{customLtv[cat]} %</span>
                    </div>
                    <input type="range" min="0" max="100" step="5"
                      value={customLtv[cat]}
                      onChange={e => setCustomLtv(c => ({ ...c, [cat]: parseInt(e.target.value) }))}
                      className="w-full accent-violet-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emprunt */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Paramètres d'emprunt</h3>

            <label className="text-xs text-gray-500">Taux annuel</label>
            <div className="flex items-center gap-3 mb-3">
              <input type="range" min="0.5" max="10" step="0.1" value={annualRate}
                onChange={e => setAnnualRate(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700 w-12 text-right">{annualRate.toFixed(1)} %</span>
            </div>

            <label className="text-xs text-gray-500">Durée</label>
            <div className="flex items-center gap-3 mb-3">
              <input type="range" min="1" max="15" step="1" value={loanDuration}
                onChange={e => setLoanDuration(parseInt(e.target.value))}
                className="flex-1 accent-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700 w-14 text-right">{loanDuration} an{loanDuration > 1 ? 's' : ''}</span>
            </div>

            <label className="text-xs text-gray-500 mb-1 block">Mode de remboursement</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setRepaymentMode('in_fine')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${repaymentMode === 'in_fine' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                In fine
              </button>
              <button onClick={() => setRepaymentMode('amortizable')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${repaymentMode === 'amortizable' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Amortissable
              </button>
            </div>
          </div>

          {/* Margin call */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Margin call</h3>
            <label className="text-xs text-gray-500">Seuil de couverture (LTV max toléré)</label>
            <div className="flex items-center gap-3">
              <input type="range" min="50" max="100" step="1" value={marginCallThreshold}
                onChange={e => setMarginCallThreshold(parseInt(e.target.value))}
                className="flex-1 accent-amber-600" />
              <span className="text-sm font-semibold text-amber-700 w-12 text-right">{marginCallThreshold} %</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Si le LTV effectif dépasse ce seuil après une chute, la banque exige un complément de collatéral.
            </p>
          </div>

          {/* Comparaison vente */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={compareWithSale}
                onChange={e => setCompareWithSale(e.target.checked)}
                className="accent-indigo-600" />
              <span className="text-sm font-semibold text-gray-800">Comparer avec une vente d'actifs</span>
            </label>
            {compareWithSale && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Taux PFU plus-value (%)</label>
                  <input type="number" min="0" max="50" step="1" value={capitalGainTaxRate}
                    onChange={e => setCapitalGainTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Rendement attendu portefeuille (%/an)</label>
                  <input type="number" min="0" max="15" step="0.5" value={expectedReturn}
                    onChange={e => setExpectedReturn(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <p className="text-xs text-gray-400">
                  Plus-value latente moyenne du portefeuille : <strong>{(cgRatio * 100).toFixed(1)} %</strong>
                </p>
              </div>
            )}
          </div>

        </div>

        {/* PANNEAU DROIT */}
        <div className="md:col-span-2 flex flex-col gap-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Capacité {SCENARIO_META[ltvScenario].label.toLowerCase()}</p>
              <p className="text-lg font-bold text-gray-900 amount">{fmtEur(activeCapacity.total)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">{repaymentMode === 'in_fine' ? 'Intérêts mensuels' : 'Mensualité'}</p>
              <p className="text-lg font-bold text-indigo-700 amount">{fmtEur(loanCost.monthlyPayment)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Coût total intérêts</p>
              <p className="text-lg font-bold text-red-600 amount">{fmtEur(loanCost.totalInterest)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Marge avant margin call</p>
              <p className={`text-lg font-bold ${maxDrop > 30 ? 'text-emerald-600' : maxDrop > 15 ? 'text-amber-600' : 'text-red-600'}`}>
                {maxDrop != null ? `${maxDrop.toFixed(0)} %` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">de chute tolérée</p>
            </div>
          </div>

          {/* Détail par catégorie + donut */}
          <div className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Détail par catégorie</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="text-left py-2">Catégorie</th>
                    <th className="text-right py-2">Valeur</th>
                    <th className="text-right py-2">LTV</th>
                    <th className="text-right py-2">Capacité</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORY_ORDER.map(cat => {
                    const v = valueByCategory[cat]
                    if (!v) return null
                    const ltv = ltvMap[cat] ?? 0
                    const cap = activeCapacity.byCategory[cat] ?? 0
                    return (
                      <tr key={cat} className="border-b border-gray-100">
                        <td className="py-2 text-gray-700">
                          <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                            style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                          {CATEGORY_LABELS[cat]}
                        </td>
                        <td className="py-2 text-right text-gray-700 amount">{fmtEur(v)}</td>
                        <td className={`py-2 text-right font-medium ${ltv === 0 ? 'text-gray-400' : 'text-gray-700'}`}>{ltv} %</td>
                        <td className={`py-2 text-right font-semibold amount ${ltv === 0 ? 'text-gray-400' : 'text-indigo-700'}`}>{fmtEur(cap)}</td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="pt-2 text-gray-800">Total</td>
                    <td className="pt-2 text-right text-gray-800 amount">{fmtEur(activeCapacity.totalValue)}</td>
                    <td className="pt-2 text-right text-gray-800">{fmtPct(activeCapacity.avgLtv)}</td>
                    <td className="pt-2 text-right text-indigo-800 amount">{fmtEur(activeCapacity.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {donutData.map(d => <Cell key={d.cat} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtEur(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stress test */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Stress test — résistance à une crise</h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {CRISIS_ORDER.map(id => (
                <button key={id} onClick={() => setStressScenarioId(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${stressScenarioId === id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {CRISIS_SCENARIOS[id].label}
                </button>
              ))}
            </div>

            {stressScenarioId === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                {CATEGORY_ORDER.map(cat => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{CATEGORY_LABELS[cat]}</span>
                      <span className={`font-bold ${customDrops[cat] < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {customDrops[cat]} %
                      </span>
                    </div>
                    <input type="range" min="-100" max="0" step="5"
                      value={customDrops[cat]}
                      onChange={e => setCustomDrops(c => ({ ...c, [cat]: parseInt(e.target.value) }))}
                      className="w-full accent-red-600" />
                  </div>
                ))}
              </div>
            )}

            {/* Résultat scénario actif */}
            <div className={`p-4 rounded-lg mb-4 ${
              stressRisk.status === 'safe'        ? 'bg-emerald-50 border border-emerald-200' :
              stressRisk.status === 'warning'     ? 'bg-amber-50 border border-amber-200'    :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">{CRISIS_SCENARIOS[stressScenarioId].label}</span>
                <StatusBadge status={stressRisk.status} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">Portefeuille après choc</p>
                  <p className="font-bold text-gray-800 amount">{fmtEur(stressedTotal)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Capacité après choc</p>
                  <p className="font-bold text-gray-800 amount">{fmtEur(stressedCapacity.total)}</p>
                </div>
                <div>
                  <p className="text-gray-500">LTV effectif</p>
                  <p className={`font-bold ${stressRisk.ltvEffective > marginCallThreshold ? 'text-red-700' : 'text-gray-800'}`}>
                    {stressRisk.ltvEffective.toFixed(0)} %
                  </p>
                </div>
              </div>
              {stressRisk.status === 'margin_call' && (
                <p className="mt-3 text-xs text-red-700 font-medium">
                  ⚠ Margin call déclenché — il faudrait compléter <span className="font-bold amount">{fmtEur(stressRisk.amountToComplete)}</span> ou rembourser une partie du crédit.
                </p>
              )}
            </div>

            {/* Tableau récap */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="text-left py-2">Scénario</th>
                  <th className="text-right py-2">Valeur</th>
                  <th className="text-right py-2">LTV effectif</th>
                  <th className="text-right py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2 text-gray-700 font-medium">Aujourd'hui</td>
                  <td className="py-2 text-right text-gray-700 amount">{fmtEur(activeCapacity.totalValue)}</td>
                  <td className="py-2 text-right text-gray-700">{((effectiveAmount / activeCapacity.totalValue) * 100).toFixed(0)} %</td>
                  <td className="py-2 text-right"><StatusBadge status="safe" /></td>
                </tr>
                {stressSummary.map(row => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{row.label}</td>
                    <td className="py-2 text-right text-gray-700 amount">{fmtEur(row.portfolioValue)}</td>
                    <td className={`py-2 text-right font-medium ${row.ltvEffective > marginCallThreshold ? 'text-red-600' : 'text-gray-700'}`}>
                      {row.ltvEffective.toFixed(0)} %
                    </td>
                    <td className="py-2 text-right"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comparaison vente */}
          {compareWithSale && saleComparison && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Vente d'actifs vs Crédit Lombard</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="text-left py-2">Indicateur</th>
                    <th className="text-right py-2">Vente d'actifs</th>
                    <th className="text-right py-2">Crédit Lombard</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">Montant brut nécessaire</td>
                    <td className="py-2 text-right text-gray-700 amount">{fmtEur(saleComparison.grossSale)}</td>
                    <td className="py-2 text-right text-gray-700 amount">{fmtEur(effectiveAmount)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">Impôt plus-value</td>
                    <td className="py-2 text-right text-red-600 amount">{fmtEur(saleComparison.taxPaid)}</td>
                    <td className="py-2 text-right text-gray-400">—</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">Coût intérêts ({loanDuration} ans)</td>
                    <td className="py-2 text-right text-gray-400">—</td>
                    <td className="py-2 text-right text-red-600 amount">{fmtEur(saleComparison.totalLombardCost)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">Manque à gagner (rendement)</td>
                    <td className="py-2 text-right text-red-600 amount">{fmtEur(saleComparison.opportunityCost)}</td>
                    <td className="py-2 text-right text-gray-400">—</td>
                  </tr>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="py-2 text-gray-800">Coût total</td>
                    <td className="py-2 text-right text-gray-800 amount">{fmtEur(saleComparison.totalSaleCost)}</td>
                    <td className="py-2 text-right text-gray-800 amount">{fmtEur(saleComparison.totalLombardCost)}</td>
                  </tr>
                </tbody>
              </table>
              <div className={`mt-3 p-3 rounded-lg text-sm font-semibold ${saleComparison.economy > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                {saleComparison.economy > 0
                  ? <>✓ Le crédit Lombard est plus avantageux : économie de <span className="amount">{fmtEur(saleComparison.economy)}</span></>
                  : <>✗ La vente serait plus avantageuse : surcoût Lombard de <span className="amount">{fmtEur(-saleComparison.economy)}</span></>}
              </div>
            </div>
          )}

          {/* Évolution capital restant */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Évolution du capital restant dû</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} label={{ value: 'Années', position: 'insideBottomRight', offset: -4, fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip formatter={(v) => fmtEur(v)} />
                <Line type="monotone" dataKey="remaining" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau d'amortissement */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <button onClick={() => setShowAmortTable(v => !v)}
              className="w-full flex items-center justify-between text-left">
              <h3 className="text-sm font-semibold text-gray-800">Tableau d'amortissement</h3>
              <span className="text-xs text-gray-400">{showAmortTable ? '▲ Masquer' : '▼ Afficher'}</span>
            </button>
            {showAmortTable && (
              <div className="mt-3 max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="text-left py-2 px-2">Mois</th>
                      <th className="text-right py-2 px-2">Mensualité</th>
                      <th className="text-right py-2 px-2">Intérêts</th>
                      <th className="text-right py-2 px-2">Capital remboursé</th>
                      <th className="text-right py-2 px-2">Capital restant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortTable.map(r => (
                      <tr key={r.month} className="border-b border-gray-50">
                        <td className="py-1.5 px-2 text-gray-600">{r.month}</td>
                        <td className="py-1.5 px-2 text-right text-gray-700 amount">{fmtEur(r.payment)}</td>
                        <td className="py-1.5 px-2 text-right text-red-500 amount">{fmtEur(r.interest)}</td>
                        <td className="py-1.5 px-2 text-right text-emerald-600 amount">{fmtEur(r.principal)}</td>
                        <td className="py-1.5 px-2 text-right text-gray-700 amount">{fmtEur(r.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      <p className="text-xs text-gray-400 italic text-center pb-4">
        Outil indicatif. Les LTV réels, taux d'intérêt et conditions varient selon l'établissement bancaire.
        Consultez un conseiller pour une simulation personnalisée.
      </p>
    </div>
  )
}
