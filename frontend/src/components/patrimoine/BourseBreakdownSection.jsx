import { useState } from 'react'
import DimensionDonut from './DimensionDonut'

const BOURSE_DIMENSIONS = [
  { dimension: 'SECTOR',        title: 'Sectoriel',    actualKey: 'sector',         showCoverage: true  },
  { dimension: 'CONTINENT',     title: 'Continent',    actualKey: 'continent',      showCoverage: true  },
  { dimension: 'COUNTRY',       title: 'Géographique', actualKey: 'country',        showCoverage: true  },
  { dimension: 'CURRENCY',      title: 'Devise',       actualKey: 'bourseCurrency', showCoverage: false },
  { dimension: 'ASSET_SUBTYPE', title: "Type d'actif", actualKey: 'assetSubType',   showCoverage: false },
]

const CRYPTO_DIMENSIONS = [
  { dimension: 'CRYPTO_TYPE',    title: 'Type de crypto',  actualKey: 'cryptoType',       showCoverage: false },
  { dimension: 'CRYPTO_NETWORK', title: 'Réseau',           actualKey: 'cryptoNetwork',    showCoverage: false },
  { dimension: 'INSTRUMENT',     title: 'Par instrument',   actualKey: 'cryptoInstrument', showCoverage: false },
]

function AssetBreakdownSection({ catBreakdowns, dimensions, actualBreakdowns, icon, label }) {
  const activeDimensions = dimensions.filter(d =>
    catBreakdowns.some(b => b.dimension === d.dimension)
  )

  const [expanded, setExpanded] = useState(true)

  if (activeDimensions.length === 0) return null

  const { good, total } = activeDimensions.reduce((acc, d) => {
    const targets = catBreakdowns.filter(b => b.dimension === d.dimension)
    const actualByKey = new Map(
      (actualBreakdowns?.[d.actualKey]?.breakdown ?? [])
        .map(b => [b.key.toLowerCase(), parseFloat(b.actualPercentage)])
    )
    targets.forEach(t => {
      acc.total++
      const actualPct = actualByKey.get(t.key.toLowerCase()) ?? 0
      if (Math.abs(actualPct - parseFloat(t.targetPercentage)) <= 5) acc.good++
    })
    return acc
  }, { good: 0, total: 0 })

  const badgeColor = good === total ? 'bg-emerald-100 text-emerald-700'
    : good >= total / 2            ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'

  const maxCols = activeDimensions.length <= 3 ? activeDimensions.length : activeDimensions.length

  return (
    <div className="mt-4 mb-2">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">
            {icon} Analyse de diversification · {label}
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {good}/{total} objectifs atteints
          </span>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className={`mt-3 grid grid-cols-1 sm:grid-cols-2 ${maxCols >= 4 ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-3'} gap-3`}>
          {activeDimensions.map(d => (
            <DimensionDonut
              key={d.dimension}
              dimension={d.dimension}
              title={d.title}
              targetBreakdowns={catBreakdowns}
              actual={actualBreakdowns?.[d.actualKey]}
              showCoverage={d.showCoverage}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BourseBreakdownSection({ breakdowns, actualBreakdowns }) {
  return (
    <>
      <AssetBreakdownSection
        catBreakdowns={breakdowns?.BOURSE ?? []}
        dimensions={BOURSE_DIMENSIONS}
        actualBreakdowns={actualBreakdowns}
        icon="📊"
        label="Bourse"
      />
      <AssetBreakdownSection
        catBreakdowns={breakdowns?.CRYPTO ?? []}
        dimensions={CRYPTO_DIMENSIONS}
        actualBreakdowns={actualBreakdowns}
        icon="🪙"
        label="Crypto"
      />
    </>
  )
}
