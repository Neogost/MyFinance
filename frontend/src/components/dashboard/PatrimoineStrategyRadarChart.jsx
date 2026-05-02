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

export default function PatrimoineStrategyRadarChart() {
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
              currentValue,
              targetValue,
              currentPct:   rawPct,
              // Plafonné à 120 pour l'affichage — les dépassements restent lisibles
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

  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <p className="text-2xl">🎯</p>
      <p className="text-sm font-medium text-gray-600">Aucun objectif défini</p>
      <p className="text-xs text-gray-400">Configurez vos objectifs dans la page Patrimoine → Stratégie & Objectifs.</p>
    </div>
  )

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="cat" tick={<CustomAngleAxis />} tickLine={false} />
          <Radar
            name="Objectif"
            dataKey="targetPct"
            stroke="#d1d5db"
            fill="#f3f4f6"
            fillOpacity={0.6}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
          <Radar
            name="Actuel"
            dataKey="displayPct"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.25}
            strokeWidth={2}
            dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: '11px', color: '#6b7280' }}>{value}</span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
