import { useState, useEffect } from 'react'
import { getPatrimoineTargets, getBreakdown } from '../../api/patrimoine'
import DimensionDonut from '../patrimoine/DimensionDonut'

export default function DimensionWidget({
  category,       // 'BOURSE' | 'CRYPTO' | 'IMMO_PHYSIQUE'
  dimension,      // 'SECTOR' | 'CONTINENT' | 'COUNTRY' | ...
  breakdownKey,   // endpoint fragment ex: 'sector', 'crypto-type'
  breakdownCat,   // paramètre category optionnel ex: 'CRYPTO'
  title,
  showCoverage = false,
  onEmpty,
  className = '',
}) {
  const [loading,          setLoading]          = useState(true)
  const [targetBreakdowns, setTargetBreakdowns] = useState([])
  const [actual,           setActual]           = useState(null)

  useEffect(() => {
    Promise.all([
      getPatrimoineTargets(),
      getBreakdown(breakdownKey, breakdownCat).catch(() => null),
    ]).then(([dto, actualData]) => {
      setTargetBreakdowns(dto?.breakdowns?.[category] ?? [])
      setActual(actualData)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const hasTargets    = targetBreakdowns.some(t => t.dimension === dimension)
  const hasActualData = (actual?.breakdown ?? []).some(b => parseFloat(b.actualPercentage) > 0)
  const isEmpty       = !hasTargets || !hasActualData

  useEffect(() => {
    if (!loading && isEmpty) onEmpty?.()
  }, [loading, isEmpty])

  if (loading || isEmpty) return null

  return (
    <DimensionDonut
      dimension={dimension}
      title={title}
      targetBreakdowns={targetBreakdowns}
      actual={actual}
      showCoverage={showCoverage}
      className={className}
    />
  )
}
