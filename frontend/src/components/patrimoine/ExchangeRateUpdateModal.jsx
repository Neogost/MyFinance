import { useState, useEffect } from 'react'
import { getExchangeRates, updateExchangeRates } from '../../api/patrimoine'

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

export default function ExchangeRateUpdateModal({ onClose, onSaved }) {
  const [rates, setRates]         = useState([])      // taux existants en DB
  const [inputs, setInputs]       = useState({})      // { [currency]: string } — nouveaux taux saisis
  const [newCurrency, setNewCurrency] = useState('')
  const [newRate, setNewRate]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => {
    getExchangeRates()
      .then(data => {
        setRates(data)
        const init = {}
        data.forEach(r => { init[r.currency] = '' })
        setInputs(init)
      })
      .catch(() => setError('Impossible de charger les taux de change.'))
      .finally(() => setLoading(false))
  }, [])

  function handleAddNewCurrency() {
    const code = newCurrency.trim().toUpperCase()
    if (!code || !newRate || parseFloat(newRate) <= 0) return
    if (inputs[code] !== undefined) {
      // La devise existe déjà : pré-remplir son champ
      setInputs(prev => ({ ...prev, [code]: newRate }))
    } else {
      setInputs(prev => ({ ...prev, [code]: newRate }))
      setRates(prev => [...prev, { currency: code, rate: null, lastUpdatedAt: null }])
    }
    setNewCurrency('')
    setNewRate('')
  }

  async function handleSave() {
    const updates = Object.entries(inputs)
      .filter(([, v]) => v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) > 0)
      .map(([currency, v]) => ({ currency, rate: parseFloat(v) }))

    if (updates.length === 0) return

    setSaving(true)
    setError(null)
    try {
      await updateExchangeRates(updates)
      onSaved()
      onClose()
    } catch {
      setError('Erreur lors de la mise à jour des taux.')
    } finally {
      setSaving(false)
    }
  }

  const hasAnyValue = Object.values(inputs).some(v => v !== '' && parseFloat(v) > 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* En-tête */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Taux de change</h3>
          <p className="text-sm text-gray-500 mt-1">
            Saisissez le nombre d'unités de devise étrangère pour 1 EUR.
            Ex : USD = 1,08 signifie 1 EUR = 1,08 USD.
          </p>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>
          )}

          {!loading && (
            <>
              {/* Tableau des taux existants */}
              {rates.length > 0 && (
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left pb-3 font-medium">Devise</th>
                      <th className="text-right pb-3 font-medium">Taux actuel (1 EUR = …)</th>
                      <th className="text-right pb-3 font-medium">Mis à jour</th>
                      <th className="text-right pb-3 font-medium w-36">Nouveau taux</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rates.map(r => {
                      const obsolete = isObsolete(r.lastUpdatedAt)
                      return (
                        <tr key={r.currency} className="group">
                          {/* Devise */}
                          <td className="py-3 pr-4">
                            <span className="font-semibold text-gray-900 text-base">{r.currency}</span>
                          </td>

                          {/* Taux actuel */}
                          <td className="py-3 pr-4 text-right">
                            {r.rate != null
                              ? <span className="font-semibold text-gray-700">
                                  {parseFloat(r.rate).toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
                                </span>
                              : <span className="text-gray-400">—</span>
                            }
                          </td>

                          {/* Date */}
                          <td className="py-3 pr-4 text-right">
                            <span className={`text-xs ${obsolete ? 'text-orange-500' : 'text-gray-400'}`}>
                              {fmtDate(r.lastUpdatedAt)}
                            </span>
                          </td>

                          {/* Saisie nouveau taux */}
                          <td className="py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="—"
                              value={inputs[r.currency] ?? ''}
                              onChange={e => setInputs(prev => ({ ...prev, [r.currency]: e.target.value }))}
                              className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {rates.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6 mb-4">
                  Aucun taux configuré. Ajoutez votre première devise ci-dessous.
                </p>
              )}

              {/* Ajout d'une nouvelle devise */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Ajouter / modifier une devise
                </p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Code devise (ex : USD, GBP)</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="USD"
                      value={newCurrency}
                      onChange={e => setNewCurrency(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition uppercase"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">1 EUR = X {newCurrency || '…'}</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="1.08"
                      value={newRate}
                      onChange={e => setNewRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                  <button
                    onClick={handleAddNewCurrency}
                    disabled={!newCurrency.trim() || !newRate || parseFloat(newRate) <= 0}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 disabled:opacity-40 transition">
                    Ajouter
                  </button>
                </div>
              </div>
            </>
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
