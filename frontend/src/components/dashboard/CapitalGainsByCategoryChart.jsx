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
      <p className={d.realValue >= 0 ? 'text-emerald-600 amount' : 'text-red-600'}>
        {d.realValue >= 0 ? '+' : ''}{fmtEur.format(d.realValue)}
      </p>
    </div>
  )
}

export default function CapitalGainsByCategoryChart({ positions: positionsProp = null, size = 'md' }) {
  const [data, setData]       = useState([])
  const [totalGain, setTotal] = useState(0)
  const [loading, setLoading] = useState(positionsProp === null)
  const [error, setError]     = useState(null)

  function compute(positions) {
    const byCategory = {}
    positions.filter(p => p.status === 'ACTIVE').forEach(p => {
      const gain = parseFloat(p.computed?.capitalGainEur ?? 0)
      byCategory[p.category] = (byCategory[p.category] ?? 0) + gain
    })
    const absTotal = Object.values(byCategory).reduce((s, v) => s + Math.abs(v), 0)
    const chartData = Object.entries(byCategory)
      .filter(([, v]) => Math.abs(v) > 0.01)
      .map(([cat, v]) => ({
        category: cat,
        label:     CATEGORY_META[cat]?.label ?? cat,
        value:     Math.abs(v),
        realValue: v,
        pct:       absTotal > 0 ? (Math.abs(v) / absTotal * 100).toFixed(1) : '0.0',
      }))
    setData(chartData)
    setTotal(Object.values(byCategory).reduce((s, v) => s + v, 0))
  }

  useEffect(() => {
    if (positionsProp !== null) { compute(positionsProp); return }
    getPositions({ status: 'ACTIVE' })
      .then(compute)
      .catch(() => setError('Impossible de charger les données'))
      .finally(() => setLoading(false))
  }, [positionsProp])

  if (loading) return <div className="text-center text-gray-400 py-12 text-sm">Chargement…</div>
  if (error)   return <div className="text-center text-red-500 py-12 text-sm">{error}</div>
  if (!data.length) return (
    <div className="text-center text-gray-400 py-12 text-sm">
      Aucune plus-value à afficher — ajoutez des positions actives pour voir la répartition.
    </div>
  )

  const donut = size === 'xs' ? { inner: 28, outer: 46, h: 'h-24' }
              : size === 'sm' ? { inner: 32, outer: 54, h: 'h-28' }
              : { inner: 38, outer: 62, h: 'h-28' }
  const color = (cat) => CATEGORY_META[cat]?.chartColor ?? '#6b7280'

  const DonutChart = () => (
    <div className={`${donut.h} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={donut.inner} outerRadius={donut.outer} paddingAngle={2} dataKey="value" strokeWidth={0}>
            {data.map(e => <Cell key={e.category} fill={color(e.category)} opacity={e.realValue < 0 ? 0.45 : 1} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )

  const TotalRow = () => (
    <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
      <span className="text-xs font-semibold text-gray-900">Total</span>
      <span className={`text-xs font-bold tabular-nums amount ${totalGain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
        {totalGain >= 0 ? '+' : ''}{fmtEur.format(totalGain)}
      </span>
    </div>
  )

  if (size === 'xs') return (
    <div className="flex flex-col items-center gap-2 h-full justify-center">
      <DonutChart />
      <p className={`text-sm font-bold amount ${totalGain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
        {totalGain >= 0 ? '+' : ''}{fmtEur.format(totalGain)}
      </p>
    </div>
  )

  if (size === 'sm') return (
    <div className="h-full flex flex-col gap-2">
      <div className="shrink-0"><DonutChart /></div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {data.map(d => (
            <div key={d.category} className="flex items-center gap-1 min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color(d.category), opacity: d.realValue < 0 ? 0.5 : 1 }} />
              <span className="text-xs text-gray-700 truncate">{d.label}</span>
              <span className="text-xs text-gray-400 shrink-0 ml-auto">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0"><DonutChart /></div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {data.map(d => (
          <div key={d.category} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color(d.category), opacity: d.realValue < 0 ? 0.5 : 1 }} />
              <span className="text-xs text-gray-700 truncate">{d.label}</span>
              {d.realValue < 0 && <span className="text-xs text-red-400 italic shrink-0">en perte</span>}
            </div>
            <span className={`text-xs font-semibold tabular-nums shrink-0 amount ${d.realValue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {d.realValue >= 0 ? '+' : ''}{fmtEur.format(d.realValue)}
            </span>
          </div>
        ))}
        <TotalRow />
      </div>
    </div>
  )
}
