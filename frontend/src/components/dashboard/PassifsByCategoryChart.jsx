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

export default function PassifsByCategoryChart({ onHasData, onEmpty, size = 'md' }) {
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

  useEffect(() => {
    if (!loading && !error && data.length === 0) onEmpty?.()
  }, [loading, error, data.length])

  if (loading) return <div className="text-center text-gray-400 py-12 text-sm">Chargement…</div>
  if (error)   return <div className="text-center text-red-500 py-12 text-sm">{error}</div>
  if (!data.length) return null

  const donut   = size === 'xs' ? { inner: 28, outer: 46, h: 'h-24' }
               : size === 'sm' ? { inner: 32, outer: 54, h: 'h-28' }
               : { inner: 38, outer: 62, h: 'h-28' }
  const total   = parseFloat(summary?.totalEffectiveValue ?? 0)
  const decote  = parseFloat(summary?.totalDepreciation ?? 0)
  const color   = (cat) => CATEGORY_META[cat]?.chartColor ?? '#9ca3af'

  const DonutChart = () => (
    <div className={`${donut.h} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={donut.inner} outerRadius={donut.outer} paddingAngle={2} dataKey="value" strokeWidth={0}>
            {data.map(e => <Cell key={e.category} fill={color(e.category)} />)}
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
            <div key={d.category} className="flex items-center gap-1 min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color(d.category) }} />
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
              <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color(d.category) }} />
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
          <span className="text-xs font-bold text-gray-900 tabular-nums amount">{fmtEur.format(total)}</span>
        </div>
        {decote > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Décote cumulée</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-red-500 tabular-nums amount">−{fmtEur.format(decote)}</span>
              <span className="text-xs text-red-400 tabular-nums">({parseFloat(summary.globalDepreciationRate).toFixed(1)} %)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
