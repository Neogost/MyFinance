import { useState } from 'react'

function isSeasonalPeriod() {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-based
  return month === 11 || month === 12
}


export default function TaxLossSeasonalBanner({ summary, onNavigate }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('tlh-banner-dismissed') === String(new Date().getFullYear())
  )

  if (!isSeasonalPeriod() || dismissed) return null

  const totalSaving = summary
    ? (parseFloat(summary.cto?.estimatedTaxSavingEur ?? 0) + parseFloat(summary.crypto?.estimatedTaxSavingEur ?? 0))
    : null

  const candidateCount = summary
    ? (summary.cto?.candidates?.filter(c => parseFloat(c.recommendedSellQuantity ?? 0) > 0).length ?? 0)
      + (summary.crypto?.candidates?.filter(c => parseFloat(c.recommendedSellQuantity ?? 0) > 0).length ?? 0)
    : null

  function handleDismiss(e) {
    e.stopPropagation()
    sessionStorage.setItem('tlh-banner-dismissed', String(new Date().getFullYear()))
    setDismissed(true)
  }

  return (
    <button
      onClick={() => onNavigate('tax-loss-harvesting')}
      className="w-full text-left mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 hover:bg-indigo-100 transition group dark:text-indigo-300"
      data-testid="tlh-seasonal-banner"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg shrink-0">💡</span>
        <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium truncate">
          {totalSaving != null && totalSaving > 0 ? (
            <>
              Vous pouvez économiser jusqu'à{' '}
              <strong>{totalSaving.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</strong>
              {candidateCount != null && candidateCount > 0 && (
                <> en vendant {candidateCount} position{candidateCount > 1 ? 's' : ''}</>
              )}{' '}
              avant le 31/12.
            </>
          ) : (
            'Optimisez votre fiscalité avant le 31 décembre — analysez vos positions en moins-value.'
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline whitespace-nowrap">
          Voir l'optimisation →
        </span>
        <button
          onClick={handleDismiss}
          aria-label="Masquer le bandeau"
          className="text-indigo-400 hover:text-indigo-600 transition p-0.5 rounded"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </button>
  )
}
