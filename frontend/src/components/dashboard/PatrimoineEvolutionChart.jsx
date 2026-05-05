import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { getSnapshots, getSnapshot, getPositions } from '../../api/patrimoine'
import { CATEGORY_META } from '../patrimoine/constants'

const CATEGORY_ORDER = ['IMMO_PHYSIQUE', 'IMMO_PAPIER', 'LIQUIDITE', 'LIVRET', 'CRYPTO', 'BOURSE']

function toTimestamp(dateVal) {
  if (typeof dateVal === 'number') return dateVal
  return new Date(String(dateVal)).getTime()
}

function formatTs(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

function CustomTooltip({ active, payload, mode }) {
  if (!active || !payload?.length) return null
  const isLive = payload[0]?.payload?.isLive
  const total  = payload.reduce((s, e) => s + (e.value ?? 0), 0)
  const date   = formatTs(payload[0]?.payload?.timestamp)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm min-w-44">
      <p className="font-semibold text-gray-800 mb-1">{date}</p>
      {isLive && <p className="text-xs text-indigo-500 mb-1.5 font-medium">● Aujourd'hui (temps réel)</p>}
      {[...payload].reverse().map(entry => entry.value > 0 && (
        <div key={entry.dataKey} className="flex justify-between gap-6">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium text-gray-700 amount">
            {mode === 'percent'
              ? `${entry.value.toFixed(1)} %`
              : `${entry.value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
          </span>
        </div>
      ))}
      {mode === 'absolute' && (
        <div className="flex justify-between gap-6 mt-1.5 pt-1.5 border-t border-gray-100 font-semibold">
          <span className="text-gray-600">Total</span>
          <span className="text-gray-900 amount">{total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
        </div>
      )}
    </div>
  )
}

function buildCategoryDot(cat) {
  return (props) => {
    const { cx, cy, payload } = props
    if (payload?.isLive)
      return <circle key={`${cat}-live-${cx}`} cx={cx} cy={cy} r={5} fill={CATEGORY_META[cat].chartColor} stroke="white" strokeWidth={2} />
    return <circle key={`${cat}-${cx}`} cx={cx} cy={cy} r={3} fill={CATEGORY_META[cat].chartColor} />
  }
}

export default function PatrimoineEvolutionChart() {
  const [rawData,    setRawData]    = useState([])
  const [categories, setCategories] = useState([])
  const [liveTs,     setLiveTs]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [mode,       setMode]       = useState('absolute')

  useEffect(() => {
    Promise.all([getSnapshots(), getPositions({ status: 'ACTIVE' })])
      .then(async ([summaries, activePositions]) => {
        const details = summaries.length > 0
          ? await Promise.all(summaries.map(s => getSnapshot(s.id)))
          : []

        const sorted = [...details].sort((a, b) =>
          String(a.snapshotDate).localeCompare(String(b.snapshotDate))
        )

        const presentCategories = new Set()

        const snapshotPoints = sorted.map(snap => {
          const point = { timestamp: toTimestamp(snap.snapshotDate), isLive: false }
          CATEGORY_ORDER.forEach(cat => { point[cat] = 0 })
          snap.positionSnapshots?.forEach(ps => {
            const cat = ps.position?.category
            if (!cat) return
            const val = parseFloat(ps.currentValueEur ?? 0)
            point[cat] = (point[cat] ?? 0) + val
            if (val > 0) presentCategories.add(cat)
          })
          return point
        })

        // Point live depuis les positions actives
        const nowTs    = Date.now()
        const todayStr = new Date().toISOString().slice(0, 10)
        const lastSnapDateStr = sorted.length
          ? String(sorted[sorted.length - 1].snapshotDate).slice(0, 10)
          : null

        const livePoint = { timestamp: nowTs, isLive: true }
        CATEGORY_ORDER.forEach(cat => { livePoint[cat] = 0 })
        activePositions.forEach(p => {
          const val = parseFloat(p.computed?.currentValueEur ?? 0)
          livePoint[p.category] = (livePoint[p.category] ?? 0) + val
          if (val > 0) presentCategories.add(p.category)
        })

        const points = lastSnapDateStr === todayStr
          ? snapshotPoints   // snapshot d'aujourd'hui déjà présent, pas de doublon
          : [...snapshotPoints, livePoint]

        setLiveTs(lastSnapDateStr !== todayStr ? nowTs : null)
        setCategories(CATEGORY_ORDER.filter(c => presentCategories.has(c)))
        setRawData(points)
      })
      .catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoading(false))
  }, [])

  const chartData = mode === 'percent'
    ? rawData.map(point => {
        const total = categories.reduce((s, c) => s + (point[c] ?? 0), 0)
        if (total === 0) return point
        const p = { timestamp: point.timestamp, isLive: point.isLive }
        categories.forEach(c => { p[c] = ((point[c] ?? 0) / total) * 100 })
        return p
      })
    : rawData

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Chargement…</div>
  if (error)   return <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
  if (rawData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm gap-2">
        <p>Aucun relevé de patrimoine disponible.</p>
        <p className="text-xs">Générez un relevé depuis la page <span className="font-medium">Patrimoine</span>.</p>
      </div>
    )
  }

  const timestamps = chartData.map(d => d.timestamp)
  const xDomain    = [Math.min(...timestamps), Math.max(...timestamps)]

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end mb-3 shrink-0">
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
          <button
            onClick={() => setMode('absolute')}
            className={`px-3 py-1.5 transition ${mode === 'absolute' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            Valeur (€)
          </button>
          <button
            onClick={() => setMode('percent')}
            className={`px-3 py-1.5 border-l border-gray-200 transition ${mode === 'percent' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            Répartition (%)
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%" minHeight={240}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <defs>
            {categories.map(cat => (
              <linearGradient key={cat} id={`grad-${cat}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CATEGORY_META[cat].chartColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={CATEGORY_META[cat].chartColor} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={xDomain}
            tickFormatter={formatTs}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickCount={6}
          />
          <YAxis
            tick={({ x, y, payload }) => (
              <text x={x} y={y} dy={4} textAnchor="end" fill="#6b7280" fontSize={11} className="amount">
                {mode === 'percent' ? `${payload.value.toFixed(0)} %` : `${(payload.value / 1000).toFixed(0)}k`}
              </text>
            )}
            width={48}
            domain={mode === 'percent' ? [0, 100] : [0, 'auto']}
          />
          <Tooltip content={<CustomTooltip mode={mode} />} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
          {liveTs && (
            <ReferenceLine
              x={liveTs}
              stroke="#6366f1"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: "Auj.", position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }}
            />
          )}
          {categories.map(cat => (
            <Area
              key={cat}
              type="monotone"
              dataKey={cat}
              name={CATEGORY_META[cat].label}
              stackId="a"
              stroke={CATEGORY_META[cat].chartColor}
              fill={`url(#grad-${cat})`}
              strokeWidth={1.5}
              dot={buildCategoryDot(cat)}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}
