export default function SalaryContractTypeStep({ onSelect, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-lg">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          Nouveau contrat de travail
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Quel type de contrat souhaitez-vous saisir ?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => onSelect('PRIVATE')}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-left"
          >
            <span className="text-3xl">🏢</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                Entreprise privée
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Salaire brut annuel, cotisations régime général
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelect('PUBLIC')}
            className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-left"
          >
            <span className="text-3xl">🏛️</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                Fonction publique
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Indice majoré, cotisations CNRACL ou régime général
              </p>
            </div>
          </button>
        </div>

        <button type="button" onClick={onCancel}
          className="mt-6 w-full text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition text-center">
          Annuler
        </button>
      </div>
    </div>
  )
}
