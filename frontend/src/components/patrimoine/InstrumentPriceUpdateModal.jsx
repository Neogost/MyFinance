import { useState, useEffect } from 'react'
import { getActiveInstruments, updateInstrumentPrices } from '../../api/patrimoine'

const CATEGORY_META = {
  BOURSE: { label: 'Bourse', color: 'bg-blue-100 text-blue-700' },
  CRYPTO: { label: 'Crypto', color: 'bg-purple-100 text-purple-700' },
}

function fmt(value, currency = 'EUR') {
  if (value == null) return '—'
  const symbol = currency === 'EUR' ? ' €' : ` ${currency}`
  return parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + symbol
}

function fmtDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function isObsolete(isoString) {
  if (!isoString) return true
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return new Date(isoString) < sevenDaysAgo
}

export default function InstrumentPriceUpdateModal({ onClose, onSaved }) {
  const [instruments, setInstruments] = useState([])
  const [prices, setPrices]           = useState({})   // { [instrumentId]: string }
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)

  useEffect(() => {
    getActiveInstruments()
      .then(data => {
        setInstruments(data)
        // Pré-initialise toutes les entrées à vide
        const init = {}
        data.forEach(i => { init[i.id] = '' })
        setPrices(init)
      })
      .catch(() => setError('Impossible de charger les instruments.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    const updates = Object.entries(prices)
      .filter(([, v]) => v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) > 0)
      .map(([id, v]) => ({ instrumentId: parseInt(id), lastPrice: parseFloat(v) }))

    if (updates.length === 0) return

    setSaving(true)
    setError(null)
    try {
      await updateInstrumentPrices(updates)
      onSaved()
      onClose()
    } catch {
      setError('Erreur lors de la mise à jour des cours.')
    } finally {
      setSaving(false)
    }
  }

  const hasAnyValue = Object.values(prices).some(v => v !== '' && parseFloat(v) > 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* En-tête */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Mettre à jour les cours</h3>
          <p className="text-sm text-gray-500 mt-1">
            Instruments liés à au moins une position active. Laissez un champ vide pour ne pas modifier le cours correspondant.
          </p>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>
          )}

          {!loading && instruments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Aucun instrument actif trouvé.
            </p>
          )}

          {!loading && instruments.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left pb-3 font-medium">Instrument</th>
                  <th className="text-left pb-3 font-medium">Devise</th>
                  <th className="text-right pb-3 font-medium">Cours actuel</th>
                  <th className="text-right pb-3 font-medium w-40">Nouveau cours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {instruments.map(inst => {
                  const meta      = CATEGORY_META[inst.category] ?? {}
                  const obsolete  = isObsolete(inst.lastPriceUpdatedAt)
                  const identifier = inst.isin ?? inst.ticker

                  return (
                    <tr key={inst.id} className="group">
                      {/* Nom + badge + identifiant */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                            {meta.label}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{inst.name}</p>
                            {identifier && (
                              <p className="text-xs text-gray-400">{identifier}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Devise */}
                      <td className="py-3 pr-4 text-gray-500">{inst.currency}</td>

                      {/* Cours actuel + date */}
                      <td className="py-3 pr-4 text-right">
                        <p className="font-semibold text-gray-700">
                          {inst.lastPrice != null ? fmt(inst.lastPrice, inst.currency) : '—'}
                        </p>
                        <p className={`text-xs mt-0.5 ${obsolete ? 'text-orange-500' : 'text-gray-400'}`}>
                          {fmtDate(inst.lastPriceUpdatedAt)}
                        </p>
                      </td>

                      {/* Saisie nouveau cours */}
                      <td className="py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="—"
                          value={prices[inst.id] ?? ''}
                          onChange={e => setPrices(prev => ({ ...prev, [inst.id]: e.target.value }))}
                          className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
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
            onClick={handleSave}
            disabled={saving || !hasAnyValue || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
