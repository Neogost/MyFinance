import { useState } from 'react'
import { CATEGORY_META, FISCAL_ENVELOPE_LABELS } from './constants'
import { fmt, fmtUnits, Amount } from './utils'
import DeleteConfirmModal from '../common/DeleteConfirmModal'

export default function PositionCard({ position, onEdit, onDelete, onClose, onUpdateBalance, onUpdateEstimatedValue, onViewOrders, linkedDebt }) {
  const meta   = CATEGORY_META[position.category] ?? {}
  const fiscal = FISCAL_ENVELOPE_LABELS[position.fiscalEnvelope]
  const c      = position.computed ?? {}
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmClose,  setConfirmClose]  = useState(false)

  const isClosed         = position.status === 'CLOSED'
  const isLiquidite      = position.category === 'LIQUIDITE'
  const isImmoPhysique   = position.category === 'IMMO_PHYSIQUE'
  const isBourseOrCrypto = position.category === 'BOURSE' || position.category === 'CRYPTO'

  const capitalGainColor = parseFloat(c.capitalGainEur ?? 0) >= 0
    ? 'text-emerald-700' : 'text-red-600'

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 ${isClosed ? 'opacity-60' : ''}`}>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{meta.icon}</span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{position.label}</p>
            {position.partner && <p className="text-xs text-gray-400">{position.partner}</p>}
            {position.instrument && (
              <p className="text-xs text-gray-400">{position.instrument.isin ?? position.instrument.ticker}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.label}
          </span>
          {position.assetSubType && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {position.assetSubType}
            </span>
          )}
          {fiscal && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fiscal.color}`}>
              {fiscal.label}
            </span>
          )}
          {isClosed && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Fermé
            </span>
          )}
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-0.5">Valeur actuelle</p>
          <p className="text-base font-bold text-gray-900 amount"><Amount value={c.currentValueEur} /></p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-0.5">Investi</p>
          <p className="text-base font-bold text-gray-700 amount"><Amount value={c.investedAmountEur} /></p>
        </div>

        {!isLiquidite && c.capitalGainEur != null && parseFloat(c.capitalGainEur) !== 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Plus-value</p>
            <p className={`text-sm font-semibold amount ${capitalGainColor}`}><Amount value={c.capitalGainEur} /></p>
          </div>
        )}

        {isBourseOrCrypto && c.units != null && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Quantité</p>
            <p className="text-sm font-semibold text-gray-700">{fmtUnits(c.units)}</p>
          </div>
        )}

        {isBourseOrCrypto && position.instrument?.lastPrice != null && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Prix marché</p>
            <p className="text-sm font-semibold text-gray-700 amount">
              {fmt(position.instrument.lastPrice, position.instrument.currency)}
            </p>
          </div>
        )}

        {position.annualRate != null && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Taux annuel</p>
            <p className="text-sm font-semibold text-gray-700">{position.annualRate} %</p>
          </div>
        )}

        {c.monthlyIncomeProjectionEur != null && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-600 mb-0.5">Projection / mois</p>
            <p className="text-sm font-semibold text-emerald-700 amount"><Amount value={c.monthlyIncomeProjectionEur} /></p>
          </div>
        )}
      </div>

      {/* Valeur nette (IMMO_PHYSIQUE lié à un crédit) */}
      {isImmoPhysique && linkedDebt && (() => {
        const netValue = parseFloat(c.currentValueEur ?? 0) - parseFloat(linkedDebt.remainingCapital ?? 0)
        return (
          <div className="col-span-2 bg-red-50 border border-red-100 rounded-lg p-3 -mt-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-red-400">Crédit lié — {linkedDebt.label}</p>
              <p className="text-sm font-semibold text-red-600 amount">− <Amount value={linkedDebt.remainingCapital} /></p>
            </div>
            <div className="flex items-center justify-between border-t border-red-100 pt-1.5">
              <p className="text-xs text-gray-500 font-medium">Valeur nette</p>
              <p className={`text-base font-bold amount ${netValue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                <Amount value={netValue} />
              </p>
            </div>
          </div>
        )
      })()}

      {/* Adresse + date d'acquisition (IMMO_PHYSIQUE) */}
      {position.address && (
        <p className="text-xs text-gray-400 -mt-2 truncate">{position.address}</p>
      )}
      {position.acquisitionDate && (
        <p className="text-xs text-gray-400 -mt-2">
          Acquis le {new Date(position.acquisitionDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}

      {/* Actions */}
      {!isClosed && (
        <div className="flex flex-wrap gap-1">
          {!confirmClose && !confirmDelete && (
            <>
              {isLiquidite ? (
                <button onClick={() => onUpdateBalance(position)}
                  className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                  Màj solde
                </button>
              ) : isImmoPhysique ? (
                <button onClick={() => onUpdateEstimatedValue(position)}
                  className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                  Màj valeur
                </button>
              ) : (
                <button onClick={() => onViewOrders(position)}
                  className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                  Mouvements
                </button>
              )}
              <button onClick={() => onEdit(position)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition">
                Modifier
              </button>
              <button onClick={() => setConfirmClose(true)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-orange-400 hover:text-orange-600 transition">
                Fermer
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-red-400 hover:text-red-600 transition">
                Supprimer
              </button>
            </>
          )}
          {confirmClose && (
            <>
              <span className="px-2 py-1 text-xs text-orange-700">Fermer cette position ?</span>
              <button onClick={() => { setConfirmClose(false); onClose(position) }}
                className="px-2 py-1 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition">
                Confirmer
              </button>
              <button onClick={() => setConfirmClose(false)}
                className="px-2 py-1 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-gray-400 transition">
                Annuler
              </button>
            </>
          )}
          {confirmDelete && (
            <DeleteConfirmModal
              title={`Supprimer « ${position.label} » ?`}
              description="Cette action est irréversible."
              warnings={[
                'Tous les mouvements (ordres) associés à cette position',
                'Toutes les lignes de relevés de patrimoine liées à cette position',
              ]}
              onConfirm={() => { setConfirmDelete(false); onDelete(position) }}
              onCancel={() => setConfirmDelete(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
