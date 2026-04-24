import { useEffect, useState } from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { getPositions, getInstruments } from '../../api/patrimoine'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const PALETTE = [
  '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24',
  '#065f46', '#047857', '#059669', '#10b981', '#34d399',
  '#7f1d1d', '#991b1b', '#dc2626', '#ef4444', '#f87171',
  '#1e1b4b', '#3730a3', '#4f46e5', '#6366f1', '#818cf8',
]

function computeExposure(positions, instruments) {
  const instrMap = Object.fromEntries(instruments.map(i => [i.id, i]))
  const bySector = {}

  positions
    .filter(p => p.status === 'ACTIVE' && p.category === 'BOURSE')
    .forEach(p => {
      const posValue = parseFloat(p.computed?.currentValueEur ?? 0)
      const allocs   = instrMap[p.instrument?.id]?.sectorAllocation ?? []
      if (!allocs.length || posValue <= 0) return
      allocs.forEach(a => {
        const exposure = posValue * (parseFloat(a.percentage) / 100)
        bySector[a.sector] = (bySector[a.sector] ?? 0) + exposure
      })
    })

  const total = Object.values(bySector).reduce((s, v) => s + v, 0)
  const data  = Object.entries(bySector)
    .filter(([, v]) => v > 0.01)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], i) => ({ name, value, total, fill: PALETTE[i % PALETTE.length] }))

  return { data, total }
}

function CustomCell({ x, y, width, height, name, value, total, fill }) {
  if (width < 4 || height < 4) return null
  const pct      = total > 0 ? (value / total * 100).toFixed(1) : '0'
  const showName = width > 55 && height > 26
  const showPct  = width > 55 && height > 46
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} stroke="white" strokeWidth={2} />
      {showName && (
        <text x={x + width / 2} y={y + height / 2 + (showPct ? -6 : 0)}
          textAnchor="middle" fill="white" fontSize={11} fontWeight={600} style={{ pointerEvents: 'none' }}>
          {name}
        </text>
      )}
      {showPct && (
        <text x={x + width / 2} y={y + height / 2 + 10}
          textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={10} style={{ pointerEvents: 'none' }}>
          {pct} %
        </text>
      )}
    </g>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d   = payload[0].payload
  const pct = d.total > 0 ? (d.value / d.total * 100).toFixed(1) : '0'
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{d.name}</p>
      <p className="text-gray-700">{fmtEur.format(d.value)}</p>
      <p className="text-gray-400">{pct} % du portefeuille analysé</p>
    </div>
  )
}

export default function SectorExposureWidget({ positions: positionsProp = null }) {
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    async function run() {
      try {
        const [positions, instruments] = await Promise.all([
          positionsProp !== null ? Promise.resolve(positionsProp) : getPositions({ status: 'ACTIVE' }),
          getInstruments(),
        ])
        const { data, total } = computeExposure(positions, instruments)
        setData(data)
        setTotal(total)
      } catch {
        setError('Impossible de charger les données sectorielles.')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [positionsProp])

  if (loading) return <div className="text-center text-gray-400 py-12 text-sm">Chargement…</div>
  if (error)   return <div className="text-center text-red-500 py-12 text-sm">{error}</div>
  if (!data.length) return (
    <div className="text-center text-gray-400 py-8 text-sm">
      Aucune position BOURSE avec répartition sectorielle renseignée.
      <p className="mt-1 text-gray-300 text-xs">Renseignez les secteurs via la page admin → Instruments financiers.</p>
    </div>
  )

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="value"
            stroke="white"
            content={<CustomCell />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span>{d.name}</span>
            <span className="text-gray-400">{total > 0 ? (d.value / total * 100).toFixed(1) : '0'} %</span>
          </div>
        ))}
      </div>
    </div>
  )
}
