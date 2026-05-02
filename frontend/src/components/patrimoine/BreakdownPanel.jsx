/**
 * Affiche la répartition réelle vs cible d'une dimension donnée pour la BOURSE.
 * Visible uniquement si l'utilisateur a défini au moins un sous-objectif sur cette dimension.
 *
 * Props :
 *   - dimension       : 'SECTOR' | 'COUNTRY' | 'CURRENCY' | 'ASSET_SUBTYPE'
 *   - title           : libellé court affiché en en-tête
 *   - targetBreakdowns: [{ dimension, key, targetPercentage }]
 *   - actual          : { totalEur, coverageRatio, breakdown: [{ key, valueEur, actualPercentage }] }
 *   - showCoverageWarning : booléen — affiche le bandeau d'alerte si couverture < 80 %
 *                            (par défaut true ; à désactiver sur CURRENCY/ASSET_SUBTYPE qui sont à 100 %)
 */
export default function BreakdownPanel({
  dimension,
  title,
  targetBreakdowns,
  actual,
  showCoverageWarning = true,
}) {
  const filteredTargets = (targetBreakdowns ?? []).filter(t => t.dimension === dimension)
  if (filteredTargets.length === 0) return null
  if (!actual || !actual.breakdown) return null

  const total = parseFloat(actual.totalEur ?? 0)
  if (total <= 0) return null

  const coverage = parseFloat(actual.coverageRatio ?? 0)

  const targetByKey = new Map()
  filteredTargets.forEach(t => targetByKey.set(t.key.toLowerCase(), { key: t.key, pct: parseFloat(t.targetPercentage) }))

  const actualByKey = new Map()
  actual.breakdown
    .filter(b => b.key !== 'Non classé')
    .forEach(b => actualByKey.set(b.key.toLowerCase(), parseFloat(b.actualPercentage)))

  // Uniquement les entrées ayant un objectif défini
  const rows = Array.from(targetByKey.entries()).map(([k, target]) => ({
    label: target.key,
    actualPct: actualByKey.get(k) ?? 0,
    targetPct: target.pct,
  }))

  rows.sort((a, b) => {
    if (a.targetPct != null && b.targetPct == null) return -1
    if (a.targetPct == null && b.targetPct != null) return 1
    if (a.targetPct != null && b.targetPct != null) return b.targetPct - a.targetPct
    return b.actualPct - a.actualPct
  })

  function deviationColor(deviation) {
    const abs = Math.abs(deviation)
    if (abs <= 2) return 'text-emerald-600'
    if (abs <= 5) return 'text-indigo-600'
    if (abs <= 10) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
          {title}
        </span>
        {showCoverageWarning && (
          <span className="text-[10px] text-gray-400">
            Couverture {coverage.toFixed(0)} %
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {rows.map(row => {
          const deviation = row.targetPct != null ? row.actualPct - row.targetPct : null
          const barColor = row.targetPct == null ? 'bg-gray-300'
            : deviation == null ? 'bg-indigo-400'
            : Math.abs(deviation) <= 2 ? 'bg-emerald-400'
            : Math.abs(deviation) <= 5 ? 'bg-indigo-400'
            : Math.abs(deviation) <= 10 ? 'bg-amber-400'
            : 'bg-red-400'

          return (
            <div key={row.label} className="text-xs">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-gray-700 truncate pr-2">{row.label}</span>
                <span className="text-gray-600 shrink-0">
                  {row.actualPct.toFixed(1)} %
                  {row.targetPct != null && (
                    <>
                      {' '}<span className="text-gray-400">/ cible {row.targetPct.toFixed(0)} %</span>
                      {' '}<span className={deviationColor(deviation)}>
                        ({deviation >= 0 ? '+' : ''}{deviation.toFixed(1)} pt{Math.abs(deviation) >= 2 ? 's' : ''})
                      </span>
                    </>
                  )}
                </span>
              </div>
              <div className="relative w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${barColor}`}
                  style={{ width: `${Math.min(row.actualPct, 100)}%` }}
                />
                {row.targetPct != null && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-gray-700"
                    style={{ left: `${Math.min(row.targetPct, 100)}%` }}
                    title={`Cible : ${row.targetPct.toFixed(0)} %`}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showCoverageWarning && coverage < 80 && (
        <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          ⚠ {(100 - coverage).toFixed(0)} % de votre BOURSE n'a pas de classification {dimension === 'SECTOR' ? 'sectorielle' : 'géographique'}.
        </p>
      )}
    </div>
  )
}
