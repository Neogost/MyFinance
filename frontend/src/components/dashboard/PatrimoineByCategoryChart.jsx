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
      <p className="text-gray-700 amount">{fmtEur.format(d.value)}</p>
      <p className="text-gray-400">{d.pct} %</p>
    </div>
  )
}

const IMMO_CATEGORIES = new Set(['IMMO_PHYSIQUE', 'IMMO_PAPIER'])

export default function PatrimoineByCategoryChart({ financierOnly = false, positions: positionsProp = null, size = 'md' }) {
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(positionsProp === null)
  const [error, setError]     = useState(null)

  function compute(positions) {
    const byCategory = {}
    positions
      .filter(p => p.status === 'ACTIVE')
      .filter(p => !financierOnly || !IMMO_CATEGORIES.has(p.category))
      .forEach(p => {
        const val = parseFloat(p.computed?.currentValueEur ?? 0)
        byCategory[p.category] = (byCategory[p.category] ?? 0) + val
      })
    const sum = Object.values(byCategory).reduce((s, v) => s + v, 0)
    const CATEGORY_ORDER = ['BOURSE', 'CRYPTO', 'IMMO_PHYSIQUE', 'IMMO_PAPIER', 'LIVRET', 'LIQUIDITE']
    const chartData = Object.entries(byCategory)
      .filter(([, v]) => v > 0.01)
      .sort(([a], [b]) => {
        const ia = CATEGORY_ORDER.indexOf(a)
        const ib = CATEGORY_ORDER.indexOf(b)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
      .map(([cat, v]) => ({
        category: cat,
        label:    CATEGORY_META[cat]?.label ?? cat,
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
            {data.map(entry => (
              <Cell key={entry.category} fill={CATEGORY_META[entry.category]?.chartColor ?? '#6b7280'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )

  // ── xs : donut seul + total ───────────────────────────────────────────────
  if (size === 'xs') return (
    <div className="flex flex-col items-center gap-2 h-full justify-center">
      <DonutChart />
      <p className="text-sm font-bold text-gray-900 amount">{fmtEur.format(total)}</p>
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
              <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_META[d.category]?.chartColor ?? '#6b7280' }} />
              <span className="text-xs text-gray-700 truncate">{d.label}</span>
              <span className="text-xs text-gray-400 shrink-0 ml-auto">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── md / lg : complet ─────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="shrink-0"><DonutChart /></div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {data.map(d => (
          <div key={d.category} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_META[d.category]?.chartColor ?? '#6b7280' }} />
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
