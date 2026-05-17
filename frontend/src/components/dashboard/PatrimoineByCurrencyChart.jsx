import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getPositions } from '../../api/patrimoine'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const CURRENCY_COLORS = {
  EUR: '#6366f1',
  USD: '#06b6d4',
  GBP: '#10b981',
  CHF: '#f59e0b',
  JPY: '#f97316',
  CAD: '#8b5cf6',
  AUD: '#ec4899',
}
const FALLBACK_COLORS = ['#64748b', '#94a3b8', '#475569', '#334155']

function colorFor(currency, index) {
  return CURRENCY_COLORS[currency] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

function resolveCurrency(position) {
  if ((position.category === 'BOURSE' || position.category === 'CRYPTO') && position.instrument?.currency) {
    return position.instrument.currency
  }
  return position.currency ?? 'EUR'
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{d.currency}</p>
      <p className="text-gray-700 amount">{fmtEur.format(d.value)}</p>
      <p className="text-gray-400">{d.pct} %</p>
    </div>
  )
}

export default function PatrimoineByCurrencyChart({ positions: positionsProp = null, size = 'md' }) {
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(positionsProp === null)
  const [error,   setError]   = useState(null)

  function compute(positions) {
    const byCurrency = {}
    positions.filter(p => p.status === 'ACTIVE').forEach(p => {
      const cur = resolveCurrency(p)
      const val = parseFloat(p.computed?.currentValueEur ?? 0)
      byCurrency[cur] = (byCurrency[cur] ?? 0) + val
    })
    const sum = Object.values(byCurrency).reduce((s, v) => s + v, 0)
    const chartData = Object.entries(byCurrency)
      .filter(([, v]) => v > 0.01)
      .sort(([, a], [, b]) => b - a)
      .map(([currency, v]) => ({
        currency,
        value: Math.round(v),
        pct: sum > 0 ? (v / sum * 100).toFixed(1) : '0.0',
      }))
    setData(chartData)
    setTotal(Math.round(sum))
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
      Aucune position active à afficher.
    </div>
  )

  const donut = size === 'xs' ? { inner: 28, outer: 46, h: 'h-24' }
              : size === 'sm' ? { inner: 32, outer: 54, h: 'h-28' }
              : { inner: 38, outer: 62, h: 'h-28' }

  const DonutChart = () => (
    <div className={`${donut.h} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={donut.inner} outerRadius={donut.outer} paddingAngle={2} dataKey="value" strokeWidth={0}>
            {data.map((e, i) => <Cell key={e.currency} fill={colorFor(e.currency, i)} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )

  if (size === 'xs') return (
    <div className="flex flex-col items-center gap-2 h-full justify-center">
      <DonutChart />
      <p className="text-sm font-bold text-gray-900 amount">{fmtEur.format(total)}</p>
    </div>
  )

  if (size === 'sm') return (
    <div className="h-full flex flex-col gap-2">
      <div className="shrink-0"><DonutChart /></div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {data.map((d, i) => (
            <div key={d.currency} className="flex items-center gap-1 min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colorFor(d.currency, i) }} />
              <span className="text-xs font-semibold text-gray-700 shrink-0">{d.currency}</span>
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
        {data.map((d, i) => (
          <div key={d.currency} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorFor(d.currency, i) }} />
              <span className="text-xs font-semibold text-gray-700 shrink-0">{d.currency}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400 tabular-nums">{d.pct} %</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums amount">{fmtEur.format(d.value)}</span>
            </div>
          </div>
        ))}
        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-900">Total</span>
          <span className="text-xs font-bold text-gray-900 tabular-nums amount">{fmtEur.format(total)}</span>
        </div>
      </div>
    </div>
  )
}
