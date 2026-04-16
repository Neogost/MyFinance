import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getPositions } from '../../api/patrimoine'
import { CATEGORY_META } from '../patrimoine/constants'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{d.label}</p>
      <p className={d.realValue >= 0 ? 'text-emerald-600' : 'text-red-600'}>
        {d.realValue >= 0 ? '+' : ''}{fmtEur.format(d.realValue)}
      </p>
    </div>
  )
}

export default function CapitalGainsByCategoryChart() {
  const [data, setData]       = useState([])
  const [totalGain, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    getPositions({ status: 'ACTIVE' })
      .then(positions => {
        const byCategory = {}
        positions.forEach(p => {
          const gain = parseFloat(p.computed?.capitalGainEur ?? 0)
          byCategory[p.category] = (byCategory[p.category] ?? 0) + gain
        })

        const chartData = Object.entries(byCategory)
          .filter(([, v]) => Math.abs(v) > 0.01)
          .map(([cat, v]) => ({
            category: cat,
            label:     CATEGORY_META[cat]?.label ?? cat,
            value:     Math.abs(v),
            realValue: v,
          }))

        setData(chartData)
        setTotal(Object.values(byCategory).reduce((s, v) => s + v, 0))
      })
      .catch(() => setError('Impossible de charger les données'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-gray-400 py-12 text-sm">Chargement…</div>
  if (error)   return <div className="text-center text-red-500 py-12 text-sm">{error}</div>
  if (!data.length) return (
    <div className="text-center text-gray-400 py-12 text-sm">
      Aucune plus-value à afficher — ajoutez des positions actives pour voir la répartition.
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row gap-8 items-center">
      <div className="w-full md:w-72 h-64 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={96}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map(entry => (
                <Cell
                  key={entry.category}
                  fill={CATEGORY_META[entry.category]?.chartColor ?? '#6b7280'}
                  opacity={entry.realValue < 0 ? 0.45 : 1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 space-y-2.5">
        {data.map(d => (
          <div key={d.category} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: CATEGORY_META[d.category]?.chartColor ?? '#6b7280',
                  opacity: d.realValue < 0 ? 0.5 : 1,
                }}
              />
              <span className="text-sm text-gray-700">{d.label}</span>
              {d.realValue < 0 && (
                <span className="text-xs text-red-400 italic">en perte</span>
              )}
            </div>
            <span className={`text-sm font-semibold tabular-nums ${d.realValue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {d.realValue >= 0 ? '+' : ''}{fmtEur.format(d.realValue)}
            </span>
          </div>
        ))}

        <div className="border-t border-gray-200 pt-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Total</span>
          <span className={`text-sm font-bold tabular-nums ${totalGain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {totalGain >= 0 ? '+' : ''}{fmtEur.format(totalGain)}
          </span>
        </div>
      </div>
    </div>
  )
}
