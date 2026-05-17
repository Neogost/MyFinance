import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getExpenseSummary } from '../../api/expenses'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const CATEGORY_META = {
  LOGEMENT:     { label: 'Logement',            chartColor: '#60a5fa' },
  TRANSPORT:    { label: 'Transport',            chartColor: '#fb923c' },
  ASSURANCES:   { label: 'Assurances',           chartColor: '#f87171' },
  ABONNEMENTS:  { label: 'Abonnements',          chartColor: '#a78bfa' },
  SANTE:        { label: 'Santé',                chartColor: '#4ade80' },
  FAMILLE:      { label: 'Famille',              chartColor: '#f472b6' },
  ALIMENTATION: { label: 'Alimentation',         chartColor: '#facc15' },
  EPARGNE:      { label: 'Épargne programmée',   chartColor: '#2dd4bf' },
  AUTRE:        { label: 'Autre',                chartColor: '#9ca3af' },
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{d.label}</p>
      <p className="text-gray-700 amount">{fmtEur.format(d.value)}/mois</p>
      <p className="text-gray-400">{d.pct} %</p>
    </div>
  )
}

export default function ExpensesByCategoryChart({ onHasData, size = 'md', onEmpty }) {
  const [data, setData]         = useState([])
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    getExpenseSummary()
      .then(s => {
        setSummary(s)
        const total = s.totalMonthlyExpenses
        const chartData = (s.byCategory ?? [])
          .filter(c => c.monthlyAmount > 0.01)
          .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
          .map(c => ({
            category: c.category,
            label:    CATEGORY_META[c.category]?.label ?? c.category,
            value:    c.monthlyAmount,
            pct:      total > 0 ? (c.monthlyAmount / total * 100).toFixed(1) : '0.0',
          }))
        setData(chartData)
        onHasData?.(chartData.length > 0)
      })
      .catch(() => setError('Impossible de charger les dépenses'))
      .finally(() => setLoading(false))
  }, [])

  const savingsCapacity = summary?.savingsCapacity ?? null
  const savingsRate     = summary?.savingsRate ?? null
  const totalMonthly    = summary?.totalMonthlyExpenses ?? 0

  if (loading) return <div className="text-center text-gray-400 py-12 text-sm">Chargement…</div>
  if (error)   return <div className="text-center text-red-500 py-12 text-sm">{error}</div>
  if (!data.length) { onEmpty?.(); return null }

  const color = (cat) => CATEGORY_META[cat]?.chartColor ?? '#9ca3af'

  const donutXs = { inner: 28, outer: 46, h: 'h-24' }
  const donutSm = { inner: 32, outer: 54, h: 'h-28' }
  const donutMd = { inner: 38, outer: 62, h: 'h-28' }
  const donut   = size === 'xs' ? donutXs : size === 'sm' ? donutSm : donutMd

  const DonutChart = () => (
    <div className={`${donut.h} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%"
            innerRadius={donut.inner} outerRadius={donut.outer}
            paddingAngle={2} dataKey="value" strokeWidth={0}
          >
            {data.map(entry => <Cell key={entry.category} fill={color(entry.category)} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )

  // ── xs : donut + total ────────────────────────────────────────────────────
  if (size === 'xs') return (
    <div className="flex flex-col items-center gap-2 h-full justify-center">
      <DonutChart />
      <p className="text-sm font-bold text-gray-900 amount">{fmtEur.format(totalMonthly)}<span className="text-gray-400 font-normal text-xs">/m</span></p>
    </div>
  )

  // ── sm : donut + légende 2 colonnes ──────────────────────────────────────
  if (size === 'sm') return (
    <div className="h-full flex flex-col gap-2">
      <div className="shrink-0"><DonutChart /></div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {data.map(d => (
            <div key={d.category} className="flex items-center gap-1 min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color(d.category) }} />
              <span className="text-xs text-gray-700 truncate">{d.label}</span>
              <span className="text-xs text-gray-400 shrink-0 ml-auto">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── md / lg : complet avec capacité d'épargne ─────────────────────────────
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0"><DonutChart /></div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {data.map(d => (
          <div key={d.category} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color(d.category) }} />
              <span className="text-xs text-gray-700 truncate">{d.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400 tabular-nums">{d.pct} %</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums amount">{fmtEur.format(d.value)}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-900">Total mensuel</span>
          <span className="text-xs font-bold text-gray-900 tabular-nums amount">
            {fmtEur.format(totalMonthly)}
          </span>
        </div>

        {savingsRate !== null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              Capacité d'épargne
              {summary?.monthlyNetIncome != null && (
                <span className="text-gray-300 text-xs cursor-default relative group">
                  ⓘ
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-72 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed font-normal normal-case tracking-normal">
                    <div className="space-y-1.5">
                      <div className="flex justify-between gap-6">
                        <span>Revenus nets mensuels</span>
                        <span className="font-medium amount">{fmtEur.format(summary.monthlyNetIncome)}</span>
                      </div>
                      <div className="flex justify-between gap-6 text-red-300">
                        <span>− Dépenses récurrentes</span>
                        <span className="font-medium amount">−{fmtEur.format(totalMonthly)}</span>
                      </div>
                      <div className="border-t border-gray-500 pt-1.5 flex justify-between gap-6 font-semibold">
                        <span>= Capacité d'épargne</span>
                        <span className="amount">{fmtEur.format(savingsCapacity ?? 0)}</span>
                      </div>
                    </div>
                  </span>
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs font-semibold tabular-nums amount ${savingsRate >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                {fmtEur.format(savingsCapacity ?? 0)}
              </span>
              <span className={`text-xs tabular-nums ${savingsRate >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                ({savingsRate.toFixed(1)} %)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
