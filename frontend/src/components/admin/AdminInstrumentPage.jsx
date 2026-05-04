import { useState, useEffect, useRef } from 'react'
import {
  getInstruments, createInstrument, updateInstrument, deleteInstrument,
  runMarketDataUpdate, runAllocationUpdate,
  getPriceHistorySummary, backfillCryptoPrices, importBoursePrices,
} from '../../api/patrimoine'
import AdminInstrumentForm from './AdminInstrumentForm'
import AdminAllocationModal from './AdminAllocationModal'
import AdminSectorAllocationModal from './AdminSectorAllocationModal'
import { useAnalytics } from '../../hooks/useAnalytics'

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
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('admin.instrument') }, [])
  const [instruments,   setInstruments]   = useState([])
  const [formTarget,    setFormTarget]    = useState(undefined)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [updating,         setUpdating]         = useState(false)
  const [updateReport,     setUpdateReport]     = useState(null)
  const [updateError,      setUpdateError]      = useState(null)
  const [allocating,       setAllocating]       = useState(false)
  const [allocationReport, setAllocationReport] = useState(null)
  const [allocationError,  setAllocationError]  = useState(null)
  const [tooltip,          setTooltip]          = useState(null)
  const [allocationTarget,       setAllocationTarget]       = useState(null)
  const [sectorAllocationTarget, setSectorAllocationTarget] = useState(null)
  const [deleteTarget,           setDeleteTarget]           = useState(null)
  const [deleting,               setDeleting]               = useState(false)
  const [deleteError,            setDeleteError]            = useState(null)
  const [historySummary,         setHistorySummary]         = useState({})
  const [backfillingId,          setBackfillingId]          = useState(null)
  const [backfillReport,         setBackfillReport]         = useState(null)
  const [backfillError,          setBackfillError]          = useState(null)
  const fileInputRef = useRef(null)
  const csvTargetIdRef = useRef(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      const [list, summary] = await Promise.all([
        getInstruments(),
        getPriceHistorySummary().catch(() => ({})),
      ])
      setInstruments(list)
      setHistorySummary(summary)
    } catch {
      setError('Impossible de charger les instruments.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBackfillCrypto(inst) {
    setBackfillingId(inst.id)
    setBackfillReport(null)
    setBackfillError(null)
    try {
      trackEvent('FEATURE_USE', 'admin.instrument.backfill_coingecko', { instrumentId: inst.id })
      const report = await backfillCryptoPrices(inst.id)
      setBackfillReport(report)
      setHistorySummary(await getPriceHistorySummary())
    } catch (e) {
      setBackfillError(e?.response?.data?.message || 'Échec du backfill CoinGecko.')
    } finally {
      setBackfillingId(null)
    }
  }

  function handleImportCsvClick(inst) {
    csvTargetIdRef.current = inst.id
    fileInputRef.current?.click()
  }

  async function handleCsvFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !csvTargetIdRef.current) return
    const id = csvTargetIdRef.current
    setBackfillingId(id)
    setBackfillReport(null)
    setBackfillError(null)
    try {
      trackEvent('FEATURE_USE', 'admin.instrument.backfill_csv', { instrumentId: id })
      const report = await importBoursePrices(id, file)
      setBackfillReport(report)
      setHistorySummary(await getPriceHistorySummary())
    } catch (err) {
      setBackfillError(err?.response?.data?.message || 'Échec de l\'import CSV.')
    } finally {
      setBackfillingId(null)
      csvTargetIdRef.current = null
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
      trackEvent('FEATURE_USE', 'admin.instrument.update_prices')
      const report = await runMarketDataUpdate()
      setUpdateReport(report)
      setInstruments(await getInstruments())
    } catch {
      setUpdateError('Erreur lors de la mise à jour des cours.')
    } finally {
      setUpdating(false)
    }
  }

  async function handleAllocationUpdate() {
    setAllocating(true)
    setAllocationReport(null)
    setAllocationError(null)
    try {
      const report = await runAllocationUpdate()
      setAllocationReport(report)
      setInstruments(await getInstruments())
    } catch {
      setAllocationError('Erreur lors de la mise à jour des allocations.')
    } finally {
      setAllocating(false)
    }
  }

  async function handleDeleteConfirm() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteInstrument(deleteTarget.id)
      setInstruments(is => is.filter(i => i.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setDeleteError('Erreur lors de la suppression.')
    } finally {
      setDeleting(false)
    }
  }

  function handleNameEnter(e, inst) {
    if (!inst.countryAllocation?.length && !inst.sectorAllocation?.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      id:      inst.id,
      x:       rect.left,
      y:       rect.bottom + 6,
      country: inst.countryAllocation ?? [],
      sector:  inst.sectorAllocation  ?? [],
    })
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  const bourse = instruments.filter(i => i.category === 'BOURSE')
  const crypto = instruments.filter(i => i.category === 'CRYPTO')

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestion des instruments</h2>
          <p className="text-sm text-gray-500 mt-0.5">{instruments.length} instrument(s) au total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAllocationUpdate}
            disabled={allocating}
            className="flex items-center gap-2 px-3 py-2 border border-emerald-300 bg-emerald-50 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60 transition"
          >
            {allocating
              ? <><span className="animate-spin inline-block">⟳</span> Allocations…</>
              : <><span>🌍</span><span className="hidden md:inline">Mettre à jour les allocations</span><span className="md:hidden">Allocations</span></>
            }
          </button>
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="flex items-center gap-2 px-3 py-2 border border-indigo-300 bg-indigo-50 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-semibold hover:bg-indigo-100 disabled:opacity-60 transition"
          >
            {updating
              ? <><span className="animate-spin inline-block">⟳</span> Mise à jour…</>
              : <><span>⟳</span><span className="hidden md:inline">Mettre à jour les cours</span><span className="md:hidden">Cours</span></>
            }
          </button>
          <button
            onClick={() => setFormTarget(null)}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* ── Rapport de mise à jour ── */}
      {allocationError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{allocationError}</p>
      )}
      {allocationReport && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs">
          <p className="font-semibold text-emerald-700">
            Allocations mises à jour : {allocationReport.instrumentsUpdated} instrument(s)
          </p>
        </div>
      )}

      {updateError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{updateError}</p>
      )}
      {updateReport && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs">
          <p className="font-semibold text-emerald-700 mb-2">Mise à jour terminée</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1 text-gray-600">
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

      {/* ── Rapport de backfill ── */}
      {backfillError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{backfillError}</p>
      )}
      {backfillReport && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-xs">
          <p className="font-semibold text-orange-700 mb-2">
            Backfill {backfillReport.targetLabel} : {backfillReport.linesInserted} insérés, {backfillReport.linesUpdated} mis à jour
            {backfillReport.linesSkipped > 0 && `, ${backfillReport.linesSkipped} ignorés`}
            {backfillReport.fromDate && ` (${backfillReport.fromDate} → ${backfillReport.toDate})`}
          </p>
          {backfillReport.errors?.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-amber-600 font-medium">
                {backfillReport.errors.length} avertissement{backfillReport.errors.length > 1 ? 's' : ''}
              </summary>
              <ul className="mt-1 space-y-0.5 text-amber-700">
                {backfillReport.errors.slice(0, 20).map((e, i) => <li key={i}>• {e}</li>)}
                {backfillReport.errors.length > 20 && <li className="italic">… et {backfillReport.errors.length - 20} autres</li>}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Input file caché pour les imports CSV BOURSE */}
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFileSelected} />

      {/* ── Tables ── */}
      {[{ label: 'BOURSE', items: bourse }, { label: 'CRYPTO', items: crypto }].map(({ label, items }) => (
        <div key={label} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</h3>
          {items.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">
              Aucun instrument {label}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {label === 'BOURSE' ? 'ISIN' : 'Ticker'}
                    </th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {label === 'BOURSE' ? 'Boursorama' : 'CoinGecko ID'}
                    </th>
                    <th className="px-2 md:px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mis à jour</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Historique</th>
                    <th className="px-2 md:px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map(inst => {
                    const stale = !inst.stablePrice && isStale(inst.lastPriceUpdatedAt)
                    const dateStr = fmtDate(inst.lastPriceUpdatedAt)
                    return (
                      <tr key={inst.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-2 md:px-4 py-3 text-sm text-gray-800 font-medium">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              title={inst.name}
                              className={`truncate max-w-[14ch] md:max-w-none ${inst.countryAllocation?.length || inst.sectorAllocation?.length ? 'border-b border-dashed border-gray-400 cursor-help' : ''}`}
                              onMouseEnter={e => handleNameEnter(e, inst)}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              {inst.name}
                            </span>
                            {label === 'BOURSE' && (
                              <>
                                <button
                                  onClick={() => { setTooltip(null); setAllocationTarget(inst) }}
                                  title="Éditer l'allocation géographique"
                                  className="hidden md:inline shrink-0 text-gray-300 hover:text-indigo-500 transition text-base leading-none"
                                >
                                  🌍
                                </button>
                                <button
                                  onClick={() => { setTooltip(null); setSectorAllocationTarget(inst) }}
                                  title="Éditer la répartition sectorielle"
                                  className="hidden md:inline shrink-0 text-gray-300 hover:text-indigo-500 transition text-base leading-none"
                                >
                                  🏭
                                </button>
                              </>
                            )}
                          </div>
                          <div className="md:hidden flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400 font-mono">{inst.isin ?? inst.ticker ?? '—'}</span>
                            {inst.stablePrice && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">🔒 Fixe</span>
                            )}
                            {stale && !inst.stablePrice && (
                              <span className="text-xs text-orange-500 font-medium">⚠ Cours obsolète</span>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500 font-mono truncate">
                          {inst.isin ?? inst.ticker ?? '—'}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm font-mono truncate">
                          {label === 'BOURSE'
                            ? inst.boursoramaSymbol
                              ? <span className="text-indigo-700">{inst.boursoramaSymbol}</span>
                              : <span className="text-gray-300">—</span>
                            : inst.coinGeckoId
                              ? <span className="text-orange-700">{inst.coinGeckoId}</span>
                              : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-2 md:px-4 py-3 text-sm text-right font-semibold text-gray-800 whitespace-nowrap">
                          {fmt(inst.lastPrice, inst.currency)}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-xs">
                          {inst.stablePrice
                            ? <span className="text-gray-400">—</span>
                            : dateStr
                              ? <span className={stale ? 'text-orange-500 font-medium' : 'text-gray-400'}>
                                  {stale && '⚠ '}{dateStr}
                                </span>
                              : <span className="text-gray-300">Jamais</span>
                          }
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-xs">
                          {(() => {
                            const summary = historySummary[inst.id]
                            if (!summary) return <span className="text-gray-300">—</span>
                            return (
                              <div className="space-y-0.5">
                                {summary.dayCount > 0 ? (
                                  <div>
                                    <span className="text-gray-700 font-medium">{summary.dayCount} j</span>
                                    <span className="text-gray-400 ml-1">
                                      ({summary.fromDate} → {summary.toDate})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-300">Aucun historique</span>
                                )}
                                {summary.firstOrderDate && (
                                  <div className={`text-xs font-medium ${summary.dayCount > 0 && summary.fromDate <= summary.firstOrderDate ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    Import depuis le {summary.firstOrderDate}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="px-2 md:px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setFormTarget(inst)}
                              className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
                            >
                              Modifier
                            </button>
                            {(label === 'BOURSE' || label === 'CRYPTO') && (
                              <button
                                onClick={() => handleImportCsvClick(inst)}
                                disabled={backfillingId === inst.id}
                                title="Importer un CSV d'historique (date;prix)"
                                className="hidden md:inline-flex px-3 py-1 border border-indigo-200 rounded-md text-xs text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-60 transition"
                              >
                                {backfillingId === inst.id ? '⟳ Import…' : '📤 Import CSV'}
                              </button>
                            )}
                            <button
                              onClick={() => { setDeleteTarget(inst); setDeleteError(null) }}
                              className="hidden md:inline-flex px-3 py-1 border border-red-200 rounded-md text-xs text-red-400 hover:border-red-500 hover:text-red-700 hover:bg-red-50 transition"
                            >
                              Supprimer
                            </button>
                          </div>
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

      {tooltip && (
        <div
          style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, zIndex: 50 }}
          className="w-60 bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs pointer-events-none"
        >
          {tooltip.country.length > 0 && (
            <>
              <p className="font-semibold text-gray-600 mb-1.5">Géographique</p>
              <ul className="space-y-0.5 mb-3">
                {tooltip.country.map((a, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-gray-700 truncate">{a.country}</span>
                    <span className="font-medium text-gray-900 shrink-0">{parseFloat(a.percentage).toFixed(1)} %</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {tooltip.sector.length > 0 && (
            <>
              <p className={`font-semibold text-gray-600 mb-1.5 ${tooltip.country.length > 0 ? 'border-t border-gray-100 pt-2' : ''}`}>Sectorielle</p>
              <ul className="space-y-0.5">
                {tooltip.sector.map((a, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-gray-700 truncate">{a.sector}</span>
                    <span className="font-medium text-gray-900 shrink-0">{parseFloat(a.percentage).toFixed(1)} %</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {sectorAllocationTarget && (
        <AdminSectorAllocationModal
          instrument={sectorAllocationTarget}
          onSave={(id, saved) => {
            setInstruments(is => is.map(i => i.id === id ? { ...i, sectorAllocation: saved } : i))
            setSectorAllocationTarget(null)
          }}
          onCancel={() => setSectorAllocationTarget(null)}
        />
      )}

      {allocationTarget && (
        <AdminAllocationModal
          instrument={allocationTarget}
          onSave={(id, saved) => {
            setInstruments(is => is.map(i => i.id === id ? { ...i, countryAllocation: saved } : i))
            setAllocationTarget(null)
          }}
          onCancel={() => setAllocationTarget(null)}
        />
      )}

      {formTarget !== undefined && (
        <AdminInstrumentForm
          item={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Supprimer l'instrument</h3>
            <p className="text-sm text-gray-700 mb-3">
              Êtes-vous sûr de vouloir supprimer <span className="font-semibold">{deleteTarget.name}</span> ?
              Cette action est irréversible.
            </p>
            {deleteTarget.orderCount > 0 ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span className="font-semibold">⚠ Attention :</span>{' '}
                {deleteTarget.orderCount} mouvement{deleteTarget.orderCount > 1 ? 's' : ''} associé{deleteTarget.orderCount > 1 ? 's' : ''}{' '}
                ser{deleteTarget.orderCount > 1 ? 'ont' : 'a'} également supprimé{deleteTarget.orderCount > 1 ? 's' : ''}.
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">Aucun mouvement associé.</p>
            )}
            {deleteError && (
              <p className="text-sm text-red-600 mb-3">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null) }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition"
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
