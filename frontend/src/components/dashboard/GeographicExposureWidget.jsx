import { useEffect, useState } from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { getPositions, getInstruments } from '../../api/patrimoine'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

// Nuances par continent — du plus foncé au plus clair
const CONTINENT_PALETTES = {
  Europe:    ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1e40af', '#1565c0', '#0d47a1', '#283593', '#0369a1', '#0284c7'],
  Ameriques: ['#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7'],
  Asie:      ['#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#a16207', '#ca8a04', '#eab308', '#c2410c', '#dc2626'],
  Afrique:   ['#7f1d1d', '#991b1b', '#b91c1c', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#9a3412', '#854d0e', '#a16207'],
  Oceanie:   ['#3b0764', '#4a044e', '#6b21a8', '#7e22ce', '#9333ea', '#a855f7', '#c084fc', '#d946ef', '#e879f9'],
  Autre:     ['#374151', '#4b5563', '#6b7280', '#9ca3af'],
}

const CONTINENT_LABELS = {
  Europe:    'Europe',
  Ameriques: 'Amériques',
  Asie:      'Asie',
  Afrique:   'Afrique',
  Oceanie:   'Océanie',
  Autre:     'Autre',
}

// Noms de pays en français → continent
const COUNTRY_CONTINENT = {
  // Europe
  'Allemagne': 'Europe', 'Autriche': 'Europe', 'Belgique': 'Europe', 'Danemark': 'Europe',
  'Espagne': 'Europe', 'Finlande': 'Europe', 'France': 'Europe', 'Grèce': 'Europe',
  'Hongrie': 'Europe', 'Irlande': 'Europe', 'Italie': 'Europe', 'Luxembourg': 'Europe',
  'Norvège': 'Europe', 'Pays-Bas': 'Europe', 'Pologne': 'Europe', 'Portugal': 'Europe',
  'République Tchèque': 'Europe', 'Roumanie': 'Europe', 'Royaume-Uni': 'Europe',
  'Russie': 'Europe', 'Suède': 'Europe', 'Suisse': 'Europe', 'Turquie': 'Europe',
  'Ukraine': 'Europe', 'Islande': 'Europe', 'Chypre': 'Europe', 'Malte': 'Europe',
  'Croatie': 'Europe', 'Slovaquie': 'Europe', 'Slovénie': 'Europe', 'Serbie': 'Europe',
  // Amériques
  'Argentine': 'Ameriques', 'Brésil': 'Ameriques', 'Canada': 'Ameriques',
  'Chili': 'Ameriques', 'Colombie': 'Ameriques', 'États-Unis': 'Ameriques',
  'Etats-Unis': 'Ameriques', 'Mexique': 'Ameriques', 'Pérou': 'Ameriques',
  'Uruguay': 'Ameriques', 'Venezuela': 'Ameriques', 'Panama': 'Ameriques',
  // Asie
  'Arabie Saoudite': 'Asie', 'Bangladesh': 'Asie', 'Chine': 'Asie',
  'Corée du Sud': 'Asie', 'Émirats Arabes Unis': 'Asie', 'Hong Kong': 'Asie',
  'Inde': 'Asie', 'Indonésie': 'Asie', 'Israël': 'Asie', 'Japon': 'Asie',
  'Koweït': 'Asie', 'Malaisie': 'Asie', 'Pakistan': 'Asie', 'Philippines': 'Asie',
  'Qatar': 'Asie', 'Singapour': 'Asie', 'Taiwan': 'Asie', 'Thaïlande': 'Asie',
  'Vietnam': 'Asie', 'Kazakhstan': 'Asie', 'Sri Lanka': 'Asie',
  // Afrique
  'Afrique du Sud': 'Afrique', 'Égypte': 'Afrique', 'Kenya': 'Afrique',
  'Maroc': 'Afrique', 'Nigeria': 'Afrique', 'Ghana': 'Afrique',
  // Océanie
  'Australie': 'Oceanie', 'Nouvelle-Zélande': 'Oceanie',
}

function getContinent(country) {
  return COUNTRY_CONTINENT[country] ?? 'Autre'
}

function assignColors(entries) {
  const counters = {}
  return entries.map(([name, value]) => {
    const continent = getContinent(name)
    const palette   = CONTINENT_PALETTES[continent]
    const idx       = counters[continent] ?? 0
    counters[continent] = idx + 1
    return { name, value, continent, fill: palette[idx % palette.length] }
  })
}

function computeExposure(positions, instruments) {
  const instrMap = Object.fromEntries(instruments.map(i => [i.id, i]))
  const byCountry = {}

  positions
    .filter(p => p.status === 'ACTIVE' && p.category === 'BOURSE')
    .forEach(p => {
      const posValue = parseFloat(p.computed?.currentValueEur ?? 0)
      const allocs   = instrMap[p.instrument?.id]?.countryAllocation ?? []
      if (!allocs.length || posValue <= 0) return
      allocs.forEach(a => {
        const exposure = posValue * (parseFloat(a.percentage) / 100)
        byCountry[a.country] = (byCountry[a.country] ?? 0) + exposure
      })
    })

  const total   = Object.values(byCountry).reduce((s, v) => s + v, 0)
  const sorted  = Object.entries(byCountry)
    .filter(([, v]) => v > 0.01)
    .sort(([, a], [, b]) => b - a)

  const data = assignColors(sorted).map(d => ({ ...d, total }))
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
      <p className="font-semibold text-gray-800 mb-0.5">{d.name}</p>
      <p className="text-gray-400 mb-1">{CONTINENT_LABELS[d.continent] ?? d.continent}</p>
      <p className="text-gray-700">{fmtEur.format(d.value)}</p>
      <p className="text-gray-400">{pct} % du portefeuille analysé</p>
    </div>
  )
}

export default function GeographicExposureWidget({ positions: positionsProp = null, size = 'md' }) {
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
        setError('Impossible de charger les données géographiques.')
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
      Aucune position BOURSE avec allocation géographique renseignée.
      <p className="mt-1 text-gray-300 text-xs">Renseignez les allocations via la page admin → Instruments financiers.</p>
    </div>
  )

  // Grouper la légende par continent
  const byCont = {}
  data.forEach(d => {
    if (!byCont[d.continent]) byCont[d.continent] = []
    byCont[d.continent].push(d)
  })

  const treemapH   = size === 'lg' ? 'h-64' : 'flex-1'
  const showLegend = size !== 'xs'

  const TreemapChart = () => (
    <div className={`${treemapH} w-full min-h-0`}>
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={data} dataKey="value" stroke="white" content={<CustomCell />}>
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )

  if (size === 'xs') return (
    <div className="h-full flex flex-col">
      <TreemapChart />
    </div>
  )

  if (size === 'sm' || size === 'md') return (
    <div className="h-full flex flex-col">
      <TreemapChart />
    </div>
  )

  return (
    <div className="h-full flex flex-col gap-3">
      <TreemapChart />
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {Object.entries(byCont).map(([continent, countries]) => (
          <div key={continent}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
              {CONTINENT_LABELS[continent] ?? continent}
              <span className="ml-1.5 font-normal normal-case">
                {total > 0 ? (countries.reduce((s, d) => s + d.value, 0) / total * 100).toFixed(1) : '0'} %
              </span>
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {countries.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.fill }} />
                  <span>{d.name}</span>
                  <span className="text-gray-400">{total > 0 ? (d.value / total * 100).toFixed(1) : '0'} %</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
