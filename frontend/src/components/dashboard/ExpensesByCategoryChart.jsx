import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getExpenseSummary } from '../../api/expenses'
import { useSavingsCapacity } from '../../hooks/useSavingsCapacity'

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

export default function ExpensesByCategoryChart({ onHasData }) {
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

  const { savingsCapacity, savingsRate } = useSavingsCapacity(summary?.totalMonthlyExpenses ?? null)

  if (loading) return <div className="text-center text-gray-400 py-12 text-sm">Chargement…</div>
  if (error)   return <div className="text-center text-red-500 py-12 text-sm">{error}</div>
  if (!data.length) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map(entry => (
                <Cell
                  key={entry.category}
                  fill={CATEGORY_META[entry.category]?.chartColor ?? '#9ca3af'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map(d => (
          <div key={d.category} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_META[d.category]?.chartColor ?? '#9ca3af' }}
              />
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
            {fmtEur.format(summary?.totalMonthlyExpenses ?? 0)}
          </span>
        </div>

        {savingsRate !== null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Capacité d'épargne</span>
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
