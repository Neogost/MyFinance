import { useState, useEffect } from 'react'
import {
  getAdminUserPositions, getAdminSnapshot,
  createAdminSnapshot, updateAdminSnapshot
} from '../../api/patrimoine'

const CATEGORY_LABELS = {
  BOURSE:        'Bourse',
  CRYPTO:        'Crypto',
  IMMO_PAPIER:   'Immo. Papier',
  IMMO_PHYSIQUE: 'Immo. Physique',
  LIVRET:        'Livret',
  LIQUIDITE:     'Liquidités',
}

const HAS_UNITS = new Set(['BOURSE', 'CRYPTO'])

function fmt(v) {
  if (v == null || v === '') return '—'
  return parseFloat(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function sumField(inputs, field) {
  return Object.values(inputs).reduce((acc, row) => {
    const val = parseFloat(row[field])
    return acc + (isNaN(val) ? 0 : val)
  }, 0)
}

export default function ManualSnapshotModal({ users, snapshot, onClose, onSaved }) {
  const isEdit = snapshot != null

  const [selectedUserId, setSelectedUserId] = useState(isEdit ? String(snapshot.userId) : '')
  const [snapshotDate,   setSnapshotDate]   = useState(isEdit ? snapshot.snapshotDate : '')
  const [positions,      setPositions]      = useState([])
  const [inputs,         setInputs]         = useState({})  // { [positionId]: { investedAmountEur, currentValueEur, units, unitPriceEur } }
  const [loadingPos,     setLoadingPos]     = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState(null)

  // Chargement des positions à la sélection d'un utilisateur
  useEffect(() => {
    if (!selectedUserId) { setPositions([]); setInputs({}); return }
    setLoadingPos(true)
    setError(null)

    const loadPositions = getAdminUserPositions(selectedUserId)
    const loadSnapshot  = isEdit ? getAdminSnapshot(snapshot.id) : Promise.resolve(null)

    Promise.all([loadPositions, loadSnapshot])
      .then(([posData, snapData]) => {
        setPositions(posData)

        const init = {}
        posData.forEach(p => {
          const existing = snapData?.positions?.find(e => e.positionId === p.id)
          init[p.id] = {
            investedAmountEur: existing ? String(existing.investedAmountEur) : '',
            currentValueEur:   existing ? String(existing.currentValueEur)   : '',
            units:             existing?.units      != null ? String(existing.units)      : '',
            unitPriceEur:      existing?.unitPriceEur != null ? String(existing.unitPriceEur) : '',
          }
        })
        setInputs(init)
      })
      .catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoadingPos(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId])

  function setField(posId, field, value) {
    setInputs(prev => ({ ...prev, [posId]: { ...prev[posId], [field]: value } }))
  }

  async function handleSubmit() {
    if (!selectedUserId || !snapshotDate) {
      setError('Veuillez sélectionner un utilisateur et une date.')
      return
    }

    const positionsPayload = Object.entries(inputs)
      .filter(([, row]) => row.currentValueEur !== '')
      .map(([positionId, row]) => ({
        positionId:       parseInt(positionId),
        investedAmountEur: row.investedAmountEur !== '' ? parseFloat(row.investedAmountEur) : null,
        currentValueEur:   parseFloat(row.currentValueEur),
        units:             row.units !== '' ? parseFloat(row.units) : null,
        unitPriceEur:      row.unitPriceEur !== '' ? parseFloat(row.unitPriceEur) : null,
      }))

    if (positionsPayload.length === 0) {
      setError('Saisissez au moins une position.')
      return
    }

    const body = {
      userId:       parseInt(selectedUserId),
      snapshotDate: snapshotDate,
      positions:    positionsPayload,
    }

    setSaving(true)
    setError(null)
    try {
      if (isEdit) await updateAdminSnapshot(snapshot.id, body)
      else await createAdminSnapshot(body)
      onSaved()
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.message
      setError(msg || 'Erreur lors de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  const totalInvested      = sumField(inputs, 'investedAmountEur')
  const totalCurrentValue  = sumField(inputs, 'currentValueEur')
  const totalCapitalGain   = totalCurrentValue - totalInvested
  const hasAnyInput = Object.values(inputs).some(r => r.currentValueEur !== '')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh]">

        {/* En-tête */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Modifier le relevé de patrimoine' : 'Ajouter manuellement un Relevé de patrimoine'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Saisissez les montants pour chaque position. Les totaux sont calculés automatiquement.
          </p>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Sélecteur utilisateur + date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Utilisateur
              </label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                disabled={isEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">— Choisir un utilisateur —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Date du relevé
              </label>
              <input
                type="date"
                value={snapshotDate}
                onChange={e => setSnapshotDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>
          </div>

          {/* Tableau de saisie des positions */}
          {loadingPos && (
            <p className="text-sm text-gray-400 text-center py-8">Chargement des positions…</p>
          )}

          {!loadingPos && selectedUserId && positions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-xl">
              Aucune position active pour cet utilisateur.
            </p>
          )}

          {!loadingPos && positions.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Position</th>
                    <th className="text-right px-3 py-3 font-medium w-36">Investi (€)</th>
                    <th className="text-right px-3 py-3 font-medium w-36">Valeur actuelle (€) <span className="text-red-500">*</span></th>
                    <th className="text-right px-3 py-3 font-medium w-28">Plus-value</th>
                    <th className="text-right px-3 py-3 font-medium w-28">Unités</th>
                    <th className="text-right px-3 py-3 font-medium w-28">Prix unit. (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {positions.map(pos => {
                    const row        = inputs[pos.id] ?? {}
                    const invested   = parseFloat(row.investedAmountEur)
                    const current    = parseFloat(row.currentValueEur)
                    const gain       = (!isNaN(invested) && !isNaN(current)) ? current - invested : null
                    const hasUnits   = HAS_UNITS.has(pos.category)

                    return (
                      <tr key={pos.id} className="group hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{pos.label}</p>
                          <p className="text-xs text-gray-400">
                            {CATEGORY_LABELS[pos.category] ?? pos.category}
                            {pos.partner ? ` · ${pos.partner}` : ''}
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number" min="0" step="0.01" placeholder="0.00"
                            value={row.investedAmountEur ?? ''}
                            onChange={e => setField(pos.id, 'investedAmountEur', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition amount"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number" min="0" step="0.01" placeholder="0.00"
                            value={row.currentValueEur ?? ''}
                            onChange={e => setField(pos.id, 'currentValueEur', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition amount"
                          />
                        </td>

                        <td className="px-3 py-3 text-right">
                          {gain != null
                            ? <span className={`font-semibold text-sm amount ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {gain >= 0 ? '+' : ''}{gain.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number" min="0" step="any" placeholder="—"
                            value={row.units ?? ''}
                            onChange={e => setField(pos.id, 'units', e.target.value)}
                            disabled={!hasUnits}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-300"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number" min="0" step="any" placeholder="—"
                            value={row.unitPriceEur ?? ''}
                            onChange={e => setField(pos.id, 'unitPriceEur', e.target.value)}
                            disabled={!hasUnits}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-300"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totaux récapitulatifs */}
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-end gap-8 text-sm">
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Total investi</p>
                  <p className="font-semibold text-gray-900 amount">{fmt(totalInvested)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Valeur totale</p>
                  <p className="font-semibold text-gray-900 amount">{fmt(totalCurrentValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Plus-value</p>
                  <p className={`font-semibold amount ${totalCapitalGain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {totalCapitalGain >= 0 ? '+' : ''}{fmt(totalCapitalGain)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Pied */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition disabled:opacity-60">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !hasAnyInput || !selectedUserId || !snapshotDate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
            {saving ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer le relevé')}
          </button>
        </div>
      </div>
    </div>
  )
}
