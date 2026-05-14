export default function PatrimoineActionBar({
  isAdmin,
  onShowSnapshots,
  onShowExchangeRates,
  onShowPriceUpdate,
  onShowStrategy,
  onExportCsv,
  onAddPosition,
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 shrink-0">Patrimoine</h2>
      <div className="flex flex-wrap justify-end gap-2">
        {/* Boutons admin masqués sur mobile — features trop complexes pour un usage mobile */}
        {isAdmin && (
          <button onClick={onShowSnapshots}
            className="hidden md:inline-flex px-4 py-2 border border-violet-300 text-violet-700 dark:text-violet-300 bg-violet-50 rounded-lg text-sm font-semibold hover:bg-violet-100 transition">
            Relevés de patrimoine
          </button>
        )}
        {isAdmin && (
          <button onClick={onShowExchangeRates}
            className="hidden md:inline-flex px-4 py-2 border border-teal-300 text-teal-700 dark:text-teal-300 bg-teal-50 rounded-lg text-sm font-semibold hover:bg-teal-100 transition">
            Taux de change
          </button>
        )}
        {isAdmin && (
          <button onClick={onShowPriceUpdate}
            className="hidden md:inline-flex px-4 py-2 border border-indigo-300 text-indigo-700 dark:text-indigo-300 bg-indigo-50 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition">
            Mettre à jour les cours
          </button>
        )}
        <button onClick={onExportCsv}
          className="px-3 md:px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg text-xs md:text-sm font-semibold hover:bg-gray-50 transition">
          Export CSV
        </button>
        <button onClick={onShowStrategy}
          className="px-3 md:px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg text-xs md:text-sm font-semibold hover:bg-gray-50 transition">
          Stratégie
        </button>
        <button onClick={onAddPosition}
          className="px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs md:text-sm font-semibold hover:bg-indigo-700 transition">
          + Ajouter
        </button>
      </div>
    </div>
  )
}
