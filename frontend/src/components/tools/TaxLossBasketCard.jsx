function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TaxLossBasketCard({ basket }) {
  if (!basket) return null

  const hasCandidates = basket.candidates?.length > 0
  const saving = parseFloat(basket.estimatedTaxSavingEur ?? 0)

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
        {basket.basketLabel}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">PV réalisées YTD</p>
          <p className={`text-sm font-semibold ${parseFloat(basket.realizedGainsYearEur) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
            {parseFloat(basket.realizedGainsYearEur) >= 0 ? '+' : ''}{fmt(basket.realizedGainsYearEur)} €
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">MV latentes</p>
          <p className={`text-sm font-semibold ${parseFloat(basket.totalUnrealizedLossEur) < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500'}`}>
            {fmt(basket.totalUnrealizedLossEur)} €
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400 mb-0.5">Économie possible</p>
        {saving > 0 ? (
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {fmt(basket.estimatedTaxSavingEur)} €
          </p>
        ) : (
          <p className="text-sm text-gray-400">
            {hasCandidates && parseFloat(basket.realizedGainsYearEur) === 0
              ? 'Aucune PV à compenser — report sur 10 ans possible'
              : 'Aucun candidat'}
          </p>
        )}
      </div>
    </div>
  )
}
