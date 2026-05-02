import { useState, useEffect } from 'react'
import { getPatrimoineTargets, getBreakdown } from '../../api/patrimoine'
import DimensionDonut from '../patrimoine/DimensionDonut'

const BOURSE_DIMS = [
  { dimension: 'SECTOR',        title: 'Sectoriel',    actualKey: 'sector',         showCoverage: true  },
  { dimension: 'CONTINENT',     title: 'Continent',    actualKey: 'continent',      showCoverage: true  },
  { dimension: 'COUNTRY',       title: 'Géographique', actualKey: 'country',        showCoverage: true  },
  { dimension: 'CURRENCY',      title: 'Devise',       actualKey: 'bourseCurrency', showCoverage: false },
  { dimension: 'ASSET_SUBTYPE', title: "Type d'actif", actualKey: 'assetSubType',   showCoverage: false },
]

const CRYPTO_DIMS = [
  { dimension: 'CRYPTO_TYPE',    title: 'Type de crypto', actualKey: 'cryptoType',     showCoverage: false },
  { dimension: 'CRYPTO_NETWORK', title: 'Réseau',          actualKey: 'cryptoNetwork',  showCoverage: false },
  { dimension: 'CURRENCY',       title: 'Devise',          actualKey: 'cryptoCurrency', showCoverage: false },
]

const IMMO_PHYSIQUE_DIMS = [
  { dimension: 'PROPERTY_USAGE', title: 'RP / Locatif', actualKey: 'propertyUsage', showCoverage: false },
]

function DimGrid({ catBreakdowns, dims, actualBreakdowns }) {
  const activeDims = dims.filter(d => catBreakdowns.some(b => b.dimension === d.dimension))
  if (activeDims.length === 0) return null

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${activeDims.length >= 4 ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-3'} gap-3`}>
      {activeDims.map(d => (
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
  )
}

export default function DiversificationSection() {
  const [loading,          setLoading]          = useState(true)
  const [breakdowns,       setBreakdowns]        = useState(null)   // { BOURSE: [...], CRYPTO: [...] }
  const [actualBreakdowns, setActualBreakdowns] = useState({})

  useEffect(() => {
    async function run() {
      try {
        const dto = await getPatrimoineTargets()
        const b = dto?.breakdowns ?? {}
        setBreakdowns(b)

        const hasBourse      = (b.BOURSE ?? []).length > 0
        const hasCrypto      = (b.CRYPTO ?? []).length > 0
        const hasImmo        = (b.IMMO_PHYSIQUE ?? []).length > 0
        if (!hasBourse && !hasCrypto && !hasImmo) return

        // Lazy-fetch uniquement si des objectifs de diversification existent
        const calls = []
        if (hasBourse) {
          calls.push(
            getBreakdown('sector').catch(() => null),
            getBreakdown('country').catch(() => null),
            getBreakdown('continent').catch(() => null),
            getBreakdown('currency').catch(() => null),
            getBreakdown('asset-subtype').catch(() => null),
          )
        } else {
          calls.push(null, null, null, null, null)
        }
        if (hasCrypto) {
          calls.push(
            getBreakdown('crypto-type').catch(() => null),
            getBreakdown('crypto-network').catch(() => null),
            getBreakdown('currency', 'CRYPTO').catch(() => null),
          )
        } else {
          calls.push(null, null, null)
        }
        if (hasImmo) {
          calls.push(getBreakdown('property-usage').catch(() => null))
        } else {
          calls.push(null)
        }

        const [sector, country, continent, bourseCurrency, assetSubType,
               cryptoType, cryptoNetwork, cryptoCurrency,
               propertyUsage] = await Promise.all(calls)

        setActualBreakdowns({
          sector, country, continent, bourseCurrency, assetSubType,
          cryptoType, cryptoNetwork, cryptoCurrency,
          propertyUsage,
        })
      } catch {
        // non critique
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  if (loading) return null

  const hasBourse = (breakdowns?.BOURSE ?? []).length > 0
  const hasCrypto = (breakdowns?.CRYPTO ?? []).length > 0
  const hasImmo   = (breakdowns?.IMMO_PHYSIQUE ?? []).length > 0
  if (!hasBourse && !hasCrypto && !hasImmo) return null

  return (
    <div className="space-y-6">
      {hasBourse && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            📈 Bourse
          </h4>
          <DimGrid
            catBreakdowns={breakdowns.BOURSE}
            dims={BOURSE_DIMS}
            actualBreakdowns={actualBreakdowns}
          />
        </div>
      )}
      {hasCrypto && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            🪙 Crypto
          </h4>
          <DimGrid
            catBreakdowns={breakdowns.CRYPTO}
            dims={CRYPTO_DIMS}
            actualBreakdowns={actualBreakdowns}
          />
        </div>
      )}
      {hasImmo && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            🏠 Immobilier physique
          </h4>
          <DimGrid
            catBreakdowns={breakdowns.IMMO_PHYSIQUE}
            dims={IMMO_PHYSIQUE_DIMS}
            actualBreakdowns={actualBreakdowns}
          />
        </div>
      )}
    </div>
  )
}
