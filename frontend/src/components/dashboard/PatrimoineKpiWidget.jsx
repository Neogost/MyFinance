import { useState, useEffect } from 'react'
import { getKpiValues } from '../../api/kpi'

const KPI_META = {
  IMMO_RENDEMENT_BRUT: {
    label: 'Rendement locatif brut',
    unit: '%',
    description: 'Loyers annuels / valeur IMMO physique',
    higherIsBetter: true,
    good: (actual, target) => actual >= target,
  },
  IMMO_LTV: {
    label: 'Ratio dette / Immo (LTV)',
    unit: '%',
    description: 'Dettes immobilières / valeur totale IMMO',
    higherIsBetter: false,
    good: (actual, target) => actual <= target,
  },
  IMMO_PAPIER_RENDEMENT: {
    label: 'Rendement SCPI distribué',
    unit: '%',
    description: 'Dividendes 12 mois / montant investi',
    higherIsBetter: true,
    good: (actual, target) => actual >= target,
  },
}

function KpiGauge({ kpi }) {
  const meta = KPI_META[kpi.kpiType]
  if (!meta || !kpi.hasData || kpi.actualValue == null) return null

  const isGood = meta.good(kpi.actualValue, kpi.targetValue)
  const pct = kpi.targetValue > 0
    ? Math.min((kpi.actualValue / kpi.targetValue) * 100, 150)
    : 0

  const barColor = isGood ? 'bg-emerald-500' : 'bg-red-500'
  const textColor = isGood ? 'text-emerald-700' : 'text-red-700'
  const bgColor = isGood ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'

  return (
    <div className={`rounded-lg border p-4 ${bgColor}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-700">{meta.label}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{meta.description}</p>
        </div>
        <div className="text-right shrink-0 ml-3">
          <span className={`text-lg font-bold ${textColor}`}>
            {kpi.actualValue.toFixed(1)} {meta.unit}
          </span>
          {kpi.targetValue != null && (
            <p className="text-[10px] text-gray-500">
              {meta.higherIsBetter ? 'Objectif ≥' : 'Objectif ≤'} {kpi.targetValue.toFixed(1)} %
            </p>
          )}
        </div>
      </div>

      {kpi.targetValue != null && (
        <div className="relative w-full bg-white rounded-full h-2 overflow-hidden border border-gray-200">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
          {/* Marqueur de cible à 100 % */}
          <div className="absolute top-0 right-0 h-full w-0.5 bg-gray-400" />
        </div>
      )}
    </div>
  )
}

export default function PatrimoineKpiWidget({ onEmpty } = {}) {
  const [kpis, setKpis] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getKpiValues()
      .then(setKpis)
      .catch(() => setKpis([]))
      .finally(() => setLoading(false))
  }, [])

  const visibles = kpis.filter(k => k.hasData && k.actualValue != null)

  useEffect(() => {
    if (!loading && visibles.length === 0) onEmpty?.()
  }, [loading, visibles.length])

  if (loading) return null
  if (visibles.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          KPI Immobiliers
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibles.map(k => <KpiGauge key={k.kpiType} kpi={k} />)}
      </div>
    </div>
  )
}
