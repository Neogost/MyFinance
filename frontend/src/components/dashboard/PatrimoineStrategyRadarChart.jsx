import { useEffect, useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { getPositions, getPatrimoineTargets } from '../../api/patrimoine'
import { CATEGORY_META } from '../patrimoine/constants'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const CATEGORY_ORDER = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const exceeded = d.currentValue > d.targetValue
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs min-w-[160px]">
      <p className="font-semibold text-gray-800 mb-2">{d.label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-indigo-600">Actuel</span>
          <span className={`font-semibold amount ${exceeded ? 'text-red-500' : 'text-gray-800'}`}>
            {fmtEur.format(d.currentValue)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Objectif</span>
          <span className="font-semibold text-gray-500 amount">{fmtEur.format(d.targetValue)}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-gray-100 pt-1">
          <span className="text-gray-400">Avancement</span>
          <span className={`font-semibold ${exceeded ? 'text-red-500' : d.currentPct >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
            {Math.round(d.currentPct)} %
          </span>
        </div>
      </div>
    </div>
  )
}

function CustomAngleAxis({ x, y, payload }) {
  const meta = CATEGORY_META[payload.value]
  if (!meta) return null
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="text-xs fill-gray-500">
      <tspan x={x} dy="-0.4em" style={{ fontSize: '13px' }}>{meta.icon}</tspan>
      <tspan x={x} dy="1.4em" style={{ fontSize: '10px', fill: '#6b7280' }}>{meta.label}</tspan>
    </text>
  )
}

function pctColor(pct) {
  if (pct >= 100) return 'text-emerald-600'
  if (pct >= 75)  return 'text-indigo-600'
  if (pct >= 40)  return 'text-amber-600'
  return 'text-red-500'
}

function barColor(pct) {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 75)  return 'bg-indigo-500'
  if (pct >= 40)  return 'bg-amber-400'
  return 'bg-red-400'
}

const RadarChartCore = ({ data, showLegend = false }) => (
  <ResponsiveContainer width="100%" height="100%">
    <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
      <PolarGrid stroke="#e5e7eb" />
      <PolarAngleAxis dataKey="cat" tick={<CustomAngleAxis />} tickLine={false} />
      <Radar name="Objectif" dataKey="targetPct"
        stroke="#d1d5db" fill="#f3f4f6" fillOpacity={0.6}
        strokeWidth={1.5} strokeDasharray="4 3" dot={false}
      />
      <Radar name="Actuel" dataKey="displayPct"
        stroke="#6366f1" fill="#6366f1" fillOpacity={0.25}
        strokeWidth={2} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
      />
      <Tooltip content={<CustomTooltip />} />
      {showLegend && (
        <Legend iconType="circle" iconSize={8}
          formatter={(value) => <span style={{ fontSize: '11px', color: '#6b7280' }}>{value}</span>}
        />
      )}
    </RadarChart>
  </ResponsiveContainer>
)

export default function PatrimoineStrategyRadarChart({ size = 'md' }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    async function run() {
      try {
        const [positions, targetsDto] = await Promise.all([
          getPositions({ status: 'ACTIVE' }),
          getPatrimoineTargets(),
        ])
        const targets = targetsDto?.targets ?? {}
        const valueByCategory = {}
        positions.forEach(p => {
          const v = parseFloat(p.computed?.currentValueEur ?? 0)
          valueByCategory[p.category] = (valueByCategory[p.category] ?? 0) + v
        })
        const chartData = CATEGORY_ORDER
          .filter(cat => targets[cat] != null && targets[cat] > 0)
          .map(cat => {
            const currentValue = valueByCategory[cat] ?? 0
            const targetValue  = targets[cat]
            const rawPct       = targetValue > 0 ? (currentValue / targetValue) * 100 : 0
            return {
              cat,
              label:        CATEGORY_META[cat]?.label ?? cat,
              icon:         CATEGORY_META[cat]?.icon ?? '',
              currentValue,
              targetValue,
              currentPct:   rawPct,
              displayPct:   Math.min(rawPct, 120),
              targetPct:    100,
            }
          })
        setData(chartData)
      } catch {
        setError('Impossible de charger les données.')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  if (loading) return <div className="text-center text-gray-400 py-12 text-sm">Chargement…</div>
  if (error)   return <div className="text-center text-red-500 py-12 text-sm">{error}</div>

  const empty = (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
      <p className="text-2xl">🎯</p>
      <p className="text-sm font-medium text-gray-600">Aucun objectif défini</p>
      {size !== 'xs' && (
        <p className="text-xs text-gray-400">Configurez vos objectifs dans la page Patrimoine → Stratégie & Objectifs.</p>
      )}
    </div>
  )

  if (!data.length) return empty

  // ── xs : 2 colonnes de barres de progression ─────────────────────────────
  if (size === 'xs') return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 h-full content-center">
      {data.map(d => {
        const pct = Math.min(d.currentPct, 100)
        return (
          <div key={d.cat}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-gray-600 flex items-center gap-1 min-w-0">
                <span className="shrink-0">{d.icon}</span>
                <span className="truncate">{d.label}</span>
              </span>
              <span className={`text-[10px] font-bold shrink-0 ml-1 ${pctColor(d.currentPct)}`}>
                {Math.round(d.currentPct)} %
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${barColor(d.currentPct)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── sm : radar seul plein écran ───────────────────────────────────────────
  if (size === 'sm') return (
    <div className="h-full w-full">
      <RadarChartCore data={data} showLegend={false} />
    </div>
  )

  // ── md : radar + légende 2 colonnes ──────────────────────────────────────
  if (size === 'md') return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-1 min-h-0">
        <RadarChartCore data={data} showLegend={false} />
      </div>
      <div className="shrink-0 grid grid-cols-2 gap-x-4 gap-y-1">
        {data.map(d => (
          <div key={d.cat} className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs">{d.icon}</span>
            <span className="text-[10px] text-gray-600 truncate flex-1">{d.label}</span>
            <span className={`text-[10px] font-bold shrink-0 ${pctColor(d.currentPct)}`}>
              {Math.round(d.currentPct)} %
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── lg : radar + légende enrichie (barre + montants + gap) ──────────────
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex-1 min-h-0">
        <RadarChartCore data={data} showLegend={false} />
      </div>
      <div className="shrink-0 space-y-1.5">
        {data.map(d => {
          const pct      = Math.min(d.currentPct, 100)
          const exceeded = d.currentValue > d.targetValue
          const gap      = d.targetValue - d.currentValue
          return (
            <div key={d.cat} className="flex items-center gap-2">
              {/* Label */}
              <span className="text-xs text-gray-600 flex items-center gap-1 w-28 shrink-0">
                <span>{d.icon}</span>
                <span className="truncate">{d.label}</span>
              </span>
              {/* Barre */}
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${barColor(d.currentPct)}`} style={{ width: `${pct}%` }} />
              </div>
              {/* Montants */}
              <span className="text-[10px] text-gray-400 shrink-0 w-28 text-right amount">
                {fmtEur.format(Math.round(d.currentValue))} / {fmtEur.format(Math.round(d.targetValue))}
              </span>
              {/* % */}
              <span className={`text-xs font-bold shrink-0 w-12 text-right ${pctColor(d.currentPct)}`}>
                {Math.round(d.currentPct)} %
              </span>
              {/* Gap ou ✓ */}
              <span className="text-[10px] shrink-0 w-16 text-right">
                {exceeded
                  ? <span className="text-emerald-500 font-medium">✓</span>
                  : <span className="text-gray-400 amount">−{fmtEur.format(Math.round(gap))}</span>
                }
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
