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
      <p className="text-gray-700">{fmtEur.format(d.value)}</p>
      <p className="text-gray-400">{d.pct} %</p>
    </div>
  )
}

export default function PatrimoineByEnvelopeChart() {
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    getPositions({ status: 'ACTIVE' })
      .then(positions => {
        const byEnvelope = {}
        positions.forEach(p => {
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
      })
      .catch(() => setError('Impossible de charger les données'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-gray-400 py-12 text-sm">Chargement…</div>
  if (error)   return <div className="text-center text-red-500 py-12 text-sm">{error}</div>
  if (!data.length) return (
    <div className="text-center text-gray-400 py-12 text-sm">
      Aucune position active à afficher.
    </div>
  )

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
                  key={entry.envelope}
                  fill={FISCAL_ENVELOPE_LABELS[entry.envelope]?.chartColor ?? '#6b7280'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map(d => (
          <div key={d.envelope} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: FISCAL_ENVELOPE_LABELS[d.envelope]?.chartColor ?? '#6b7280' }}
              />
              <span className="text-xs text-gray-700 truncate">{d.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400 tabular-nums">{d.pct} %</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums">{fmtEur.format(d.value)}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-900">Total</span>
          <span className="text-xs font-bold text-gray-900 tabular-nums">{fmtEur.format(total)}</span>
        </div>
      </div>
    </div>
  )
}
