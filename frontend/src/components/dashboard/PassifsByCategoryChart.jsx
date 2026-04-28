import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { getPossessionsSummary } from '../../api/possessions'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const CATEGORY_META = {
  VEHICULE:       { label: 'Véhicule',                 chartColor: '#818cf8' },
  INFORMATIQUE:   { label: 'Informatique & High-tech',  chartColor: '#22d3ee' },
  ELECTROMENAGER: { label: 'Électroménager',            chartColor: '#fbbf24' },
  MOBILIER:       { label: 'Mobilier & Décoration',     chartColor: '#84cc16' },
  COLLECTION:     { label: 'Collection',                chartColor: '#f472b6' },
  LOISIRS:        { label: 'Loisirs & Sport',           chartColor: '#2dd4bf' },
  AUTRE:          { label: 'Autre',                     chartColor: '#9ca3af' },
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{d.label}</p>
      <p className="text-gray-700 amount">{fmtEur.format(d.value)}</p>
      <p className="text-gray-400">{d.pct} % de la valeur actuelle</p>
      <p className="text-red-400 amount">−{fmtEur.format(d.depreciation)} de décote</p>
    </div>
  )
}

export default function PassifsByCategoryChart({ onHasData }) {
  const [data,    setData]    = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    getPossessionsSummary()
      .then(s => {
        setSummary(s)
        const total = parseFloat(s.totalEffectiveValue)
        const chartData = (s.byCategory ?? [])
          .filter(c => parseFloat(c.totalEffectiveValue) > 0.01)
          .sort((a, b) => parseFloat(b.totalEffectiveValue) - parseFloat(a.totalEffectiveValue))
          .map(c => ({
            category:    c.category,
            label:       CATEGORY_META[c.category]?.label ?? c.category,
            value:       parseFloat(c.totalEffectiveValue),
            depreciation: parseFloat(c.totalDepreciation),
            pct:         total > 0
              ? (parseFloat(c.totalEffectiveValue) / total * 100).toFixed(1)
              : '0.0',
          }))
        setData(chartData)
        onHasData?.(chartData.length > 0)
      })
      .catch(() => setError('Impossible de charger les passifs'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-gray-400 py-12 text-sm">Chargement…</div>
  if (error)   return <div className="text-center text-red-500 py-12 text-sm">{error}</div>
  if (!data.length) return null

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
                  key={entry.category}
                  fill={CATEGORY_META[entry.category]?.chartColor ?? '#9ca3af'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map(d => (
          <div key={d.category} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_META[d.category]?.chartColor ?? '#9ca3af' }}
              />
              <span className="text-xs text-gray-700 truncate">{d.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400 tabular-nums">{d.pct} %</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums amount">{fmtEur.format(d.value)}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-900">Valeur actuelle totale</span>
          <span className="text-xs font-bold text-gray-900 tabular-nums amount">
            {fmtEur.format(parseFloat(summary?.totalEffectiveValue ?? 0))}
          </span>
        </div>

        {summary?.totalDepreciation != null && parseFloat(summary.totalDepreciation) > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Décote cumulée</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-red-500 tabular-nums amount">
                −{fmtEur.format(parseFloat(summary.totalDepreciation))}
              </span>
              <span className="text-xs text-red-400 tabular-nums">
                ({parseFloat(summary.globalDepreciationRate).toFixed(1)} %)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
