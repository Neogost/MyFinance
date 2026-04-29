import { useState, useEffect } from 'react'
import { getActiveInstruments, updateInstrumentPrices, updateInstrumentStablePrice } from '../../api/patrimoine'

const STALE_MS = 30 * 24 * 60 * 60 * 1000  // 30 jours — cohérent avec PatrimoineGroupedView

const CATEGORY_META = {
  BOURSE: { label: 'Bourse', icon: '📈', color: 'bg-blue-100 text-blue-700' },
  CRYPTO: { label: 'Crypto', icon: '🪙', color: 'bg-purple-100 text-purple-700' },
}

const CATEGORY_ORDER = ['BOURSE', 'CRYPTO']

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
  return new Date(isoString) < new Date(Date.now() - STALE_MS)
}

export default function InstrumentPriceUpdateModal({ onClose, onSaved }) {
  const [instruments, setInstruments] = useState([])
  const [prices, setPrices]           = useState({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [toggling, setToggling]       = useState(null)
  const [error, setError]             = useState(null)

  useEffect(() => {
    getActiveInstruments()
      .then(data => {
        setInstruments(data)
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

  async function handleToggleStable(inst) {
    const newValue = !inst.stablePrice
    setToggling(inst.id)
    setError(null)
    setInstruments(prev => prev.map(i => i.id === inst.id ? { ...i, stablePrice: newValue } : i))
    try {
      await updateInstrumentStablePrice(inst.id, newValue)
    } catch {
      setInstruments(prev => prev.map(i => i.id === inst.id ? { ...i, stablePrice: !newValue } : i))
      setError('Impossible de modifier le statut de prix fixe.')
    } finally {
      setToggling(null)
    }
  }

  const filledCount   = Object.values(prices).filter(v => v !== '' && parseFloat(v) > 0).length
  const obsoleteCount = instruments.filter(i => !i.stablePrice && isObsolete(i.lastPriceUpdatedAt)).length

  // Groupes par catégorie — obsolètes en premier dans chaque groupe, puis tri alpha
  const byCategory = CATEGORY_ORDER
    .map(cat => ({
      cat,
      instruments: instruments
        .filter(i => i.category === cat)
        .sort((a, b) => {
          const aObs = isObsolete(a.lastPriceUpdatedAt)
          const bObs = isObsolete(b.lastPriceUpdatedAt)
          if (aObs !== bObs) return aObs ? -1 : 1
          return (a.name ?? '').localeCompare(b.name ?? '', 'fr')
        }),
    }))
    .filter(({ instruments }) => instruments.length > 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* ── En-tête ── */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Mettre à jour les cours</h3>
              <p className="text-sm text-gray-500 mt-1">
                Instruments liés à au moins une position active. Laissez un champ vide pour ne pas modifier le cours.
              </p>
            </div>
            {!loading && obsoleteCount > 0 && (
              <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                {obsoleteCount} cours obsolète{obsoleteCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── Notifications (zone fixe, toujours visible) ── */}
        {error && (
          <div className="px-6 pt-3 pb-0">
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          </div>
        )}

        {/* ── Corps ── */}
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-6">
          {loading && <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>}

          {!loading && instruments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Aucun instrument actif trouvé.</p>
          )}

          {!loading && byCategory.map(({ cat, instruments: catInsts }) => {
            const meta        = CATEGORY_META[cat]
            const catObsolete = catInsts.filter(i => isObsolete(i.lastPriceUpdatedAt)).length

            return (
              <div key={cat}>
                {/* En-tête de catégorie */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{meta.icon}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                  <span className="text-xs text-gray-400">
                    {catInsts.length} instrument{catInsts.length > 1 ? 's' : ''}
                  </span>
                  {catObsolete > 0 && (
                    <span className="text-xs font-medium text-orange-500">
                      — {catObsolete} obsolète{catObsolete > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Instrument</th>
                      <th className="text-left pb-2 font-medium">Devise</th>
                      <th className="text-right pb-2 font-medium">Cours actuel</th>
                      <th className="text-right pb-2 font-medium w-36">Nouveau cours</th>
                      <th className="text-right pb-2 font-medium w-20">Variation</th>
                      <th className="text-center pb-2 font-medium w-10">Fixe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {catInsts.map(inst => {
                      const obsolete   = !inst.stablePrice && isObsolete(inst.lastPriceUpdatedAt)
                      const identifier = inst.isin ?? inst.ticker
                      const newVal     = prices[inst.id] ?? ''
                      const newPrice   = parseFloat(newVal)
                      const curPrice   = parseFloat(inst.lastPrice)
                      const hasFilled  = newVal !== '' && !isNaN(newPrice) && newPrice > 0
                      const variation  = hasFilled && inst.lastPrice != null && curPrice > 0
                        ? ((newPrice - curPrice) / curPrice) * 100
                        : null

                      return (
                        <tr key={inst.id} className={`transition ${inst.stablePrice ? 'opacity-50' : hasFilled ? 'bg-indigo-50/50' : ''}`}>
                          {/* Nom + identifiant + cadenas si prix fixe */}
                          <td className="py-3 pr-4">
                            <p className="font-medium text-gray-900">{inst.name}</p>
                            {identifier && <p className="text-xs text-gray-400">{identifier}</p>}
                          </td>

                          {/* Devise */}
                          <td className="py-3 pr-4 text-gray-500">{inst.currency}</td>

                          {/* Cours actuel + date */}
                          <td className="py-3 pr-4 text-right">
                            <p className="font-semibold text-gray-700">
                              {inst.lastPrice != null ? fmt(inst.lastPrice, inst.currency) : '—'}
                            </p>
                            {!inst.stablePrice && (
                              <p className={`text-xs mt-0.5 ${obsolete ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                                {obsolete && '⚠ '}{fmtDate(inst.lastPriceUpdatedAt)}
                              </p>
                            )}
                          </td>

                          {/* Saisie nouveau cours — désactivée si prix fixe */}
                          <td className="py-3 pr-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="—"
                              disabled={inst.stablePrice}
                              value={newVal}
                              onChange={e => setPrices(prev => ({ ...prev, [inst.id]: e.target.value }))}
                              className={`w-full px-3 py-1.5 border rounded-lg text-sm text-right outline-none transition ${
                                inst.stablePrice
                                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                                  : hasFilled
                                    ? 'border-indigo-400 ring-2 ring-indigo-100 bg-white'
                                    : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                              }`}
                            />
                          </td>

                          {/* Variation % */}
                          <td className="py-3 text-right">
                            {variation !== null ? (
                              <span className={`text-xs font-semibold ${variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {variation >= 0 ? '+' : ''}{variation.toFixed(2)} %
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>

                          {/* Toggle prix fixe */}
                          <td className="py-3 text-center">
                            <button
                              onClick={() => handleToggleStable(inst)}
                              disabled={toggling === inst.id}
                              title={inst.stablePrice ? 'Prix fixe — cliquer pour déverrouiller' : 'Marquer comme prix fixe'}
                              className={`text-base transition hover:scale-110 disabled:opacity-40 ${toggling === inst.id ? 'animate-pulse' : ''}`}
                            >
                              {inst.stablePrice ? '🔒' : '🔓'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}

        </div>

        {/* ── Pied ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition disabled:opacity-60">
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={saving || filledCount === 0 || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
            {saving ? 'Enregistrement…' : `Enregistrer${filledCount > 0 ? ` (${filledCount} cours)` : ''}`}
          </button>
        </div>

      </div>
    </div>
  )
}
