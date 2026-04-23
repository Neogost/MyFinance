import { useState, useEffect } from 'react'
import { getInstruments, createInstrument, updateInstrument, runMarketDataUpdate } from '../../api/patrimoine'
import AdminInstrumentForm from './AdminInstrumentForm'

const STALE_MS = 30 * 24 * 60 * 60 * 1000

function fmt(value, currency = 'EUR') {
  if (value == null) return '—'
  const symbol = currency === 'EUR' ? ' €' : ` ${currency}`
  return parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + symbol
}

function fmtDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function isStale(iso) {
  if (!iso) return true
  return new Date(iso) < new Date(Date.now() - STALE_MS)
}

export default function AdminInstrumentPage() {
  const [instruments,   setInstruments]   = useState([])
  const [formTarget,    setFormTarget]    = useState(undefined)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [updating,      setUpdating]      = useState(false)
  const [updateReport,  setUpdateReport]  = useState(null)
  const [updateError,   setUpdateError]   = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      setInstruments(await getInstruments())
    } catch {
      setError('Impossible de charger les instruments.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateInstrument(formTarget.id, payload)
      setInstruments(is => is.map(i => i.id === updated.id ? updated : i))
    } else {
      const created = await createInstrument(payload)
      setInstruments(is => [created, ...is])
    }
    setFormTarget(undefined)
  }

  async function handleUpdate() {
    setUpdating(true)
    setUpdateReport(null)
    setUpdateError(null)
    try {
      const report = await runMarketDataUpdate()
      setUpdateReport(report)
      setInstruments(await getInstruments())
    } catch {
      setUpdateError('Erreur lors de la mise à jour des cours.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  const bourse = instruments.filter(i => i.category === 'BOURSE')
  const crypto = instruments.filter(i => i.category === 'CRYPTO')

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestion des instruments</h2>
          <p className="text-sm text-gray-500 mt-0.5">{instruments.length} instrument(s) au total</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-300 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100 disabled:opacity-60 transition"
          >
            {updating ? <><span className="animate-spin inline-block">⟳</span> Mise à jour…</> : '⟳ Mettre à jour les cours'}
          </button>
          <button
            onClick={() => setFormTarget(null)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* ── Rapport de mise à jour ── */}
      {updateError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{updateError}</p>
      )}
      {updateReport && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs">
          <p className="font-semibold text-emerald-700 mb-2">Mise à jour terminée</p>
          <div className="grid grid-cols-3 gap-x-8 gap-y-1 text-gray-600">
            <span>Cours mis à jour</span><span className="font-medium text-emerald-700 col-span-2">{updateReport.instrumentsUpdated}</span>
            <span>Cours en échec</span><span className={`font-medium col-span-2 ${updateReport.instrumentsFailed > 0 ? 'text-red-600' : ''}`}>{updateReport.instrumentsFailed}</span>
            <span>Taux de change</span><span className="font-medium col-span-2">{updateReport.ratesUpdated}</span>
            <span>Snapshots créés</span><span className="font-medium col-span-2">{updateReport.snapshotsCreated}</span>
          </div>
          {updateReport.errors?.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-amber-600 font-medium">
                {updateReport.errors.length} avertissement{updateReport.errors.length > 1 ? 's' : ''}
              </summary>
              <ul className="mt-1 space-y-0.5 text-amber-700">
                {updateReport.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* ── Tables ── */}
      {[{ label: 'BOURSE', items: bourse }, { label: 'CRYPTO', items: crypto }].map(({ label, items }) => (
        <div key={label} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</h3>
          {items.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">
              Aucun instrument {label}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                  <col className="w-[8%]" />
                  <col className="w-[6%]" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {label === 'BOURSE' ? 'ISIN' : 'Ticker'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {label === 'BOURSE' ? 'Boursorama' : 'CoinGecko ID'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix actuel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mis à jour</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix fixe</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map(inst => {
                    const stale = !inst.stablePrice && isStale(inst.lastPriceUpdatedAt)
                    const dateStr = fmtDate(inst.lastPriceUpdatedAt)
                    return (
                      <tr key={inst.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium truncate" title={inst.name}>
                          {inst.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono truncate">
                          {inst.isin ?? inst.ticker ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono truncate">
                          {label === 'BOURSE'
                            ? inst.boursoramaSymbol
                              ? <span className="text-indigo-700">{inst.boursoramaSymbol}</span>
                              : <span className="text-gray-300">—</span>
                            : inst.coinGeckoId
                              ? <span className="text-orange-700">{inst.coinGeckoId}</span>
                              : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">
                          {fmt(inst.lastPrice, inst.currency)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {inst.stablePrice
                            ? <span className="text-gray-400">—</span>
                            : dateStr
                              ? <span className={stale ? 'text-orange-500 font-medium' : 'text-gray-400'}>
                                  {stale && '⚠ '}{dateStr}
                                </span>
                              : <span className="text-gray-300">Jamais</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {inst.stablePrice
                            ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">🔒 Fixe</span>
                            : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setFormTarget(inst)}
                            className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
                          >
                            Modifier
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {formTarget !== undefined && (
        <AdminInstrumentForm
          item={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
