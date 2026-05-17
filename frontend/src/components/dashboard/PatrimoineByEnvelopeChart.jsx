import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getPositions } from '../../api/patrimoine'
import { FISCAL_ENVELOPE_LABELS } from '../patrimoine/constants'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{d.label}</p>
      <p className="text-gray-700 amount">{fmtEur.format(d.value)}</p>
      <p className="text-gray-400">{d.pct} %</p>
    </div>
  )
}

export default function PatrimoineByEnvelopeChart({ positions: positionsProp = null, size = 'md' }) {
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(positionsProp === null)
  const [error, setError]     = useState(null)

  function compute(positions) {
    const byEnvelope = {}
    positions.filter(p => p.status === 'ACTIVE').forEach(p => {
      const envelope = p.fiscalEnvelope ?? 'NONE'
      const val = parseFloat(p.computed?.currentValueEur ?? 0)
      byEnvelope[envelope] = (byEnvelope[envelope] ?? 0) + val
    })
    const sum = Object.values(byEnvelope).reduce((s, v) => s + v, 0)
    const chartData = Object.entries(byEnvelope)
      .filter(([, v]) => v > 0.01)
      .sort(([, a], [, b]) => b - a)
      .map(([env, v]) => ({
        envelope: env,
        label:    FISCAL_ENVELOPE_LABELS[env]?.label ?? env,
        value:    v,
        pct:      sum > 0 ? (v / sum * 100).toFixed(1) : '0.0',
      }))
    setData(chartData)
    setTotal(sum)
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

  const color = (e) => FISCAL_ENVELOPE_LABELS[e]?.chartColor ?? '#6b7280'

  const DonutChart = () => (
    <div className={`${donut.h} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={donut.inner} outerRadius={donut.outer} paddingAngle={2} dataKey="value" strokeWidth={0}>
            {data.map(e => <Cell key={e.envelope} fill={color(e.envelope)} />)}
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
          {data.map(d => (
            <div key={d.envelope} className="flex items-center gap-1 min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color(d.envelope) }} />
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
          <div key={d.envelope} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color(d.envelope) }} />
              <span className="text-xs text-gray-700 truncate">{d.label}</span>
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
