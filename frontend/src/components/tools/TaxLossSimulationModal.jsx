import { useState } from 'react'

function fmt(n) {
  return Number(n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TaxLossSimulationModal({ candidate, taxRate = 0.30, onClose }) {
  const maxQty    = parseFloat(candidate.currentQuantity ?? 0)
  const totalMv   = parseFloat(candidate.unrealizedLossEur ?? 0) // négatif
  const pricePerUnit = maxQty > 0 ? Math.abs(totalMv) / maxQty : 0

  const [qty, setQty] = useState(parseFloat(candidate.recommendedSellQuantity ?? maxQty))

  const realizedLoss = maxQty > 0 ? (qty / maxQty) * totalMv : 0   // négatif
  const taxSaving    = Math.abs(realizedLoss) * taxRate

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl sm:rounded-xl shadow-2xl w-full max-w-md">

        {/* En-tête */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{candidate.label}</h2>
            {candidate.partner && <p className="text-xs text-gray-400 mt-0.5">{candidate.partner}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-gray-400 hover:text-gray-600 transition p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Contexte */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">Parts détenues</p>
              <p className="font-semibold text-gray-800">
                {maxQty.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">MV latente totale</p>
              <p className="font-semibold text-red-600 dark:text-red-400">{fmt(totalMv)} €</p>
            </div>
          </div>

          {/* Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">Parts à vendre</label>
              <span className="text-sm font-bold text-indigo-700">
                {qty.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} / {maxQty.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={maxQty}
              step={maxQty > 100 ? 1 : maxQty / 1000}
              value={qty}
              onChange={e => setQty(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span>Tout vendre</span>
            </div>
          </div>

          {/* Résultat simulé */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-3">Impact simulé</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">MV réalisée</span>
              <span className="font-semibold text-red-500 dark:text-red-400">{fmt(realizedLoss)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Économie d'impôt estimée</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(taxSaving)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Taux appliqué</span>
              <span className="text-gray-700">{(taxRate * 100).toFixed(1)} %</span>
            </div>
          </div>

          {/* Raccourcis */}
          <div className="flex gap-2">
            {[0, 25, 50, 75, 100].map(pct => (
              <button
                key={pct}
                onClick={() => setQty((pct / 100) * maxQty)}
                className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-indigo-400 hover:text-indigo-700 transition"
              >
                {pct === 0 ? 'Reset' : `${pct} %`}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Simulation indicative — frais de courtage non inclus.
          </p>
        </div>
      </div>
    </div>
  )
}
