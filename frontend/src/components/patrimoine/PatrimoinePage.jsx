import { useState, useEffect } from 'react'
import {
  getPositions, createPosition, updatePosition,
  updateBalance, updateEstimatedValue, closePosition, deletePosition,
  getSnapshots,
} from '../../api/patrimoine'
import { CATEGORY_META, PROJECTION_RATES } from './constants'
import { fmt, Tooltip } from './utils'
import PositionCard from './PositionCard'
import { BalanceEditModal, EstimatedValueModal } from './ValueEditModals'
import PositionForm from './PositionForm'
import OrderPanel from './OrderPanel'
import InstrumentPriceUpdateModal from './InstrumentPriceUpdateModal'
import ExchangeRateUpdateModal from './ExchangeRateUpdateModal'
import SnapshotPanel from './SnapshotPanel'
import PatrimoineGroupedView from './PatrimoineGroupedView'

export default function PatrimoinePage({ currentUser }) {
  const [positions, setPositions]             = useState([])
  const [snapshots, setSnapshots]             = useState([])
  const [formTarget, setFormTarget]           = useState(undefined)
  const [balanceTarget, setBalanceTarget]     = useState(null)
  const [estimatedTarget, setEstimatedTarget] = useState(null)
  const [ordersTarget, setOrdersTarget]       = useState(null)
  const [showPriceUpdate, setShowPriceUpdate]               = useState(false)
  const [showExchangeRateUpdate, setShowExchangeRateUpdate] = useState(false)
  const [showSnapshots, setShowSnapshots]                   = useState(false)
  const [filter, setFilter]                   = useState('ALL')
  const [showClosed, setShowClosed]           = useState(false)
  const [viewMode, setViewMode] = useState(() => sessionStorage.getItem('patrimoine.viewMode') ?? 'grouped')

  function handleSetViewMode(mode) {
    sessionStorage.setItem('patrimoine.viewMode', mode)
    setViewMode(mode)
  }
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)

  const isAdmin = currentUser?.role === 'ADMIN'

  useEffect(() => { fetchPositions(); fetchSnapshots() }, [])

  async function fetchPositions() {
    try {
      setLoading(true)
      setPositions(await getPositions())
    } catch {
      setError('Impossible de charger le patrimoine.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSnapshots() {
    try {
      setSnapshots(await getSnapshots())
    } catch {
      // snapshots non critiques, on ignore l'erreur
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updatePosition(formTarget.id, payload)
      setPositions(ps => ps.map(p => p.id === updated.id ? updated : p))
    } else {
      const created = await createPosition(payload)
      setPositions(ps => [created, ...ps])
    }
    setFormTarget(undefined)
  }

  async function handleUpdateBalance(position, newBalance) {
    const updated = await updateBalance(position.id, { currentBalance: newBalance })
    setPositions(ps => ps.map(p => p.id === updated.id ? updated : p))
    setBalanceTarget(null)
  }

  async function handleUpdateEstimatedValue(position, newValue) {
    const updated = await updateEstimatedValue(position.id, { estimatedCurrentValue: newValue })
    setPositions(ps => ps.map(p => p.id === updated.id ? updated : p))
    setEstimatedTarget(null)
  }

  async function handleClose(position) {
    try {
      const updated = await closePosition(position.id)
      setPositions(ps => ps.map(p => p.id === updated.id ? updated : p))
    } catch {
      setError('Impossible de fermer la position.')
    }
  }

  async function handleDelete(position) {
    try {
      await deletePosition(position.id)
      setPositions(ps => ps.filter(p => p.id !== position.id))
    } catch {
      setError('Impossible de supprimer la position.')
    }
  }

  async function handleOrdersChanged() {
    setPositions(await getPositions())
  }

  // ── Filtres ──────────────────────────────────────────────────────

  const CATEGORY_ORDER = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']

  const allCategories  = ['ALL', ...CATEGORY_ORDER]
  const categoryLabels = { ALL: 'Tous', ...Object.fromEntries(
    Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label])
  )}
  const filtered = positions
    .filter(p => {
      if (!showClosed && p.status === 'CLOSED') return false
      if (filter !== 'ALL' && p.category !== filter) return false
      return true
    })
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))

  // ── Synthèse ─────────────────────────────────────────────────────

  const IMMO_CATEGORIES = new Set(['IMMO_PHYSIQUE', 'IMMO_PAPIER'])
  const active = positions.filter(p => p.status === 'ACTIVE')
  const allPos = positions

  const patrimoineBrut      = active.reduce((s, p) => s + parseFloat(p.computed?.currentValueEur  ?? 0), 0)
  const patrimoineFinancier = active
    .filter(p => !IMMO_CATEGORIES.has(p.category))
    .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
  const totalInvesti   = allPos.reduce((s, p) => s + parseFloat(p.computed?.investedAmountEur ?? 0), 0)
  const totalPlusValue = allPos.reduce((s, p) => s + parseFloat(p.computed?.capitalGainEur ?? 0), 0)
  const totalProjection = active
    .filter(p => p.computed?.monthlyIncomeProjectionEur != null)
    .reduce((s, p) => s + parseFloat(p.computed.monthlyIncomeProjectionEur), 0)

  const investiByCategory = Object.entries(
    allPos
      .filter(p => p.computed?.investedAmountEur != null && parseFloat(p.computed.investedAmountEur) !== 0)
      .reduce((acc, p) => {
        acc[p.category] = (acc[p.category] ?? 0) + parseFloat(p.computed.investedAmountEur)
        return acc
      }, {})
  ).sort(([, a], [, b]) => b - a)

  const gainsByCategory = Object.entries(
    allPos
      .filter(p => p.computed?.capitalGainEur != null && parseFloat(p.computed.capitalGainEur) !== 0)
      .reduce((acc, p) => {
        acc[p.category] = (acc[p.category] ?? 0) + parseFloat(p.computed.capitalGainEur)
        return acc
      }, {})
  ).sort(([, a], [, b]) => b - a)

  const categoryStats = CATEGORY_ORDER
    .map(cat => {
      const catActive  = active.filter(p => p.category === cat)
      const catAll     = allPos.filter(p => p.category === cat)
      const value      = catActive.reduce((s, p) => s + parseFloat(p.computed?.currentValueEur   ?? 0), 0)
      const gain       = catAll.reduce((s, p)    => s + parseFloat(p.computed?.capitalGainEur     ?? 0), 0)
      const invested   = catAll.reduce((s, p)    => s + parseFloat(p.computed?.investedAmountEur  ?? 0), 0)
      const gainPct    = invested !== 0 ? (gain / Math.abs(invested)) * 100 : null
      return { cat, value, gain, invested, gainPct }
    })
    .filter(({ value }) => value > 0)

  // Projection annuelle : valeur actuelle × taux moyen par catégorie
  const projectionByCategory = CATEGORY_ORDER
    .map(cat => {
      const rate  = PROJECTION_RATES[cat] ?? 0
      const value = active
        .filter(p => p.category === cat)
        .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
      return { cat, rate, value, projected: value * rate }
    })
    .filter(({ projected }) => projected > 0)

  const totalProjectionAnnuelle = projectionByCategory.reduce((s, { projected }) => s + projected, 0)

  // Prorata : jours restants dans l'année en cours
  const today       = new Date()
  const endOfYear   = new Date(today.getFullYear(), 11, 31)
  const daysInYear  = today.getFullYear() % 4 === 0 ? 366 : 365
  const daysLeft    = Math.round((endOfYear - today) / 86_400_000) + 1
  const projectionProrataYTD = totalProjectionAnnuelle * (daysLeft / daysInYear)

  const jan1CurrentYear = `${new Date().getFullYear()}-01-01`
  const ytdRefSnapshot  = snapshots
    .filter(s => s.snapshotDate < jan1CurrentYear)
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0] ?? null
  const totalPlusValueYTD = ytdRefSnapshot != null
    ? totalPlusValue - parseFloat(ytdRefSnapshot.totalCapitalGainEur ?? 0)
    : null

  if (loading) return <p className="text-gray-500">Chargement…</p>

  return (
    <div>
      {/* ── Erreur ── */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Patrimoine</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => setShowSnapshots(true)}
              className="px-4 py-2 border border-violet-300 text-violet-700 bg-violet-50 rounded-lg text-sm font-semibold hover:bg-violet-100 transition">
              Relevés de patrimoine
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowExchangeRateUpdate(true)}
              className="px-4 py-2 border border-teal-300 text-teal-700 bg-teal-50 rounded-lg text-sm font-semibold hover:bg-teal-100 transition">
              Taux de change
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowPriceUpdate(true)}
              className="px-4 py-2 border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition">
              Mettre à jour les cours
            </button>
          )}
          <button onClick={() => setFormTarget(null)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
            + Ajouter une position
          </button>
        </div>
      </div>

      {/* ── Synthèse globale ── */}
      {positions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center">
              Patrimoine Brut
              <Tooltip>Somme de l'ensemble des actifs : bourse, crypto, livrets, liquidités, immobilier physique et papier.</Tooltip>
            </p>
            <p className="text-lg font-bold text-gray-900 amount">{fmt(patrimoineBrut)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center">
              Patrimoine Financier
              <Tooltip>Actifs financiers uniquement : bourse, crypto, livrets et liquidités. Hors immobilier physique et papier.</Tooltip>
            </p>
            <p className="text-lg font-bold text-gray-700 amount">{fmt(patrimoineFinancier)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center">
              Total investi
              {investiByCategory.length > 0 && (
                <Tooltip>
                  <span className="block font-semibold mb-1">Ventilation par catégorie</span>
                  {investiByCategory.map(([cat, amount]) => (
                    <span key={cat} className="flex justify-between gap-3">
                      <span>{CATEGORY_META[cat]?.label ?? cat}</span>
                      <span className="amount">{fmt(amount)}</span>
                    </span>
                  ))}
                </Tooltip>
              )}
            </p>
            <p className="text-lg font-bold text-gray-700 amount">{fmt(totalInvesti)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center">
              Plus-value
              {gainsByCategory.length > 0 && (
                <Tooltip>
                  <span className="block font-semibold mb-1">Ventilation par catégorie</span>
                  {gainsByCategory.map(([cat, gain]) => (
                    <span key={cat} className="flex justify-between gap-3">
                      <span>{CATEGORY_META[cat]?.label ?? cat}</span>
                      <span className={`amount ${gain >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmt(gain)}</span>
                    </span>
                  ))}
                </Tooltip>
              )}
            </p>
            <p className={`text-lg font-bold amount ${totalPlusValue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {fmt(totalPlusValue)}
            </p>
          </div>
          {totalPlusValueYTD != null && (
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center">
                Plus-value YTD
                <Tooltip>Variation de la plus-value depuis le 1er janvier {new Date().getFullYear()}, calculée par rapport au dernier relevé de l'année précédente ({ytdRefSnapshot.snapshotDate}).</Tooltip>
              </p>
              <p className={`text-lg font-bold amount ${totalPlusValueYTD >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {totalPlusValueYTD >= 0 ? '+' : ''}{fmt(totalPlusValueYTD)}
              </p>
            </div>
          )}
          {totalProjection > 0 && (
            <div className="bg-emerald-50 rounded-xl shadow-sm p-3">
              <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Revenus / mois</p>
              <p className="text-lg font-bold text-emerald-700 amount">{fmt(totalProjection)}</p>
            </div>
          )}
          {totalProjectionAnnuelle > 0 && (
            <div className="bg-amber-50 rounded-xl shadow-sm p-3">
              <p className="text-xs text-amber-600 uppercase tracking-wide mb-1 flex items-center">
                Projection {today.getFullYear()}
                <Tooltip>
                  <span className="block font-semibold mb-1">Plus-value estimée ({daysLeft} j restants)</span>
                  {projectionByCategory.map(({ cat, rate, projected }) => (
                    <span key={cat} className="flex justify-between gap-3">
                      <span>{CATEGORY_META[cat]?.label ?? cat} ({(rate * 100).toFixed(1)} %)</span>
                      <span className="text-amber-300 amount">+{fmt(projected)}</span>
                    </span>
                  ))}
                  <span className="block mt-2 text-gray-400 text-xs">Taux annuels × valeur actuelle, proratisé sur {daysLeft} j. Estimation indicative.</span>
                </Tooltip>
              </p>
              <p className="text-lg font-bold text-amber-700 amount">+{fmt(projectionProrataYTD)}</p>
              <p className="text-xs text-amber-500 mt-0.5 amount">annuel : +{fmt(totalProjectionAnnuelle)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Répartition par catégorie ── */}
      {categoryStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {categoryStats.map(({ cat, value, gain, gainPct }) => {
            const meta     = CATEGORY_META[cat]
            const showGain = gain !== 0
            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm p-3">
                <p className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{meta.icon}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                </p>
                <p className="text-base font-bold text-gray-900 amount">{fmt(value)}</p>
                {patrimoineBrut > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {((value / patrimoineBrut) * 100).toFixed(1)} % du patrimoine
                  </p>
                )}
                {showGain && (
                  <p className={`text-xs font-semibold amount mt-0.5 ${gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {gain >= 0 ? '+' : ''}{fmt(gain)}
                    {gainPct !== null && (
                      <span className="ml-1 font-normal opacity-75">
                        ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)} %)
                      </span>
                    )}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Filtres ── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'
              }`}>
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
            <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)}
              className="accent-indigo-600" />
            Afficher les positions fermées
          </label>

          {/* Toggle vue */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => handleSetViewMode('grid')}
              title="Vue grille"
              className={`px-2.5 py-1.5 text-xs transition ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
              </svg>
            </button>
            <button
              onClick={() => handleSetViewMode('grouped')}
              title="Vue par partenaire"
              className={`px-2.5 py-1.5 text-xs border-l border-gray-200 transition ${viewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Positions ── */}
      {viewMode === 'grouped' ? (
        <PatrimoineGroupedView
          positions={filtered}
          onEdit={setFormTarget}
          onDelete={handleDelete}
          onClose={handleClose}
          onUpdateBalance={setBalanceTarget}
          onUpdateEstimatedValue={setEstimatedTarget}
          onViewOrders={setOrdersTarget}
        />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucune position</p>
          <p className="text-sm">Cliquez sur « + Ajouter une position » pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map(position => (
            <PositionCard
              key={position.id}
              position={position}
              onEdit={setFormTarget}
              onDelete={handleDelete}
              onClose={handleClose}
              onUpdateBalance={setBalanceTarget}
              onUpdateEstimatedValue={setEstimatedTarget}
              onViewOrders={setOrdersTarget}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {formTarget !== undefined && (
        <PositionForm
          position={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}

      {balanceTarget && (
        <BalanceEditModal
          position={balanceTarget}
          onSave={(v) => handleUpdateBalance(balanceTarget, v)}
          onCancel={() => setBalanceTarget(null)}
        />
      )}

      {estimatedTarget && (
        <EstimatedValueModal
          position={estimatedTarget}
          onSave={(v) => handleUpdateEstimatedValue(estimatedTarget, v)}
          onCancel={() => setEstimatedTarget(null)}
        />
      )}

      {ordersTarget && (
        <OrderPanel
          position={ordersTarget}
          onClose={() => setOrdersTarget(null)}
          onOrdersChanged={handleOrdersChanged}
        />
      )}

      {showPriceUpdate && (
        <InstrumentPriceUpdateModal
          onClose={() => setShowPriceUpdate(false)}
          onSaved={fetchPositions}
        />
      )}

      {showExchangeRateUpdate && (
        <ExchangeRateUpdateModal
          onClose={() => setShowExchangeRateUpdate(false)}
          onSaved={fetchPositions}
        />
      )}

      {showSnapshots && (
        <SnapshotPanel onClose={() => setShowSnapshots(false)} />
      )}
    </div>
  )
}
