import { useState, useEffect } from 'react'
import {
  getPositions, createPosition, updatePosition,
  updateBalance, updateEstimatedValue, closePosition, deletePosition,
} from '../../api/patrimoine'
import PositionForm from './PositionForm'
import OrderPanel from './OrderPanel'

const CATEGORY_META = {
  BOURSE:        { label: 'Bourse / ETF',    color: 'bg-blue-100 text-blue-700',    icon: '📈' },
  CRYPTO:        { label: 'Crypto',           color: 'bg-purple-100 text-purple-700', icon: '🪙' },
  IMMO_PAPIER:   { label: 'Immo. Papier',     color: 'bg-orange-100 text-orange-700', icon: '🏗️' },
  IMMO_PHYSIQUE: { label: 'Immo. Physique',   color: 'bg-red-100 text-red-700',       icon: '🏠' },
  LIVRET:        { label: 'Livret / Épargne', color: 'bg-blue-100 text-blue-700',     icon: '🏦' },
  LIQUIDITE:     { label: 'Liquidités',       color: 'bg-amber-100 text-amber-700',   icon: '💵' },
}

const FISCAL_ENVELOPE_LABELS = {
  NONE: null,
  CTO:  { label: 'CTO',  color: 'bg-gray-100 text-gray-600' },
  PEA:  { label: 'PEA',  color: 'bg-emerald-100 text-emerald-700' },
  AV:   { label: 'AV',   color: 'bg-violet-100 text-violet-700' },
}

function fmt(value, currency = 'EUR') {
  if (value == null) return '—'
  const symbol = currency === 'EUR' ? ' €' : ` ${currency}`
  return parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + symbol
}

function fmtUnits(value) {
  if (value == null) return null
  const n = parseFloat(value)
  return n % 1 === 0 ? n.toLocaleString('fr-FR') : n.toLocaleString('fr-FR', { maximumFractionDigits: 6 })
}

// ── Modal mise à jour solde (LIQUIDITE) ────────────────────────

function BalanceEditModal({ position, onSave, onCancel }) {
  const [value, setValue] = useState(position.currentBalance ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try { await onSave(parseFloat(value)) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-7 w-full max-w-sm">
        <h3 className="font-bold text-gray-900 mb-4">Mettre à jour le solde</h3>
        <p className="text-sm text-gray-500 mb-3">{position.label}</p>
        <input type="number" min="0" step="0.01" value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
          placeholder="Nouveau solde en €" autoFocus />
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
            Annuler
          </button>
          <button onClick={handleSave} disabled={loading || value === ''}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal mise à jour valeur estimée (IMMO_PHYSIQUE) ───────────

function EstimatedValueModal({ position, onSave, onCancel }) {
  const [value, setValue] = useState(position.estimatedCurrentValue ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try { await onSave(parseFloat(value)) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-7 w-full max-w-sm">
        <h3 className="font-bold text-gray-900 mb-4">Mettre à jour la valeur estimée</h3>
        <p className="text-sm text-gray-500 mb-3">{position.label}</p>
        <input type="number" min="0" step="0.01" value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
          placeholder="Valeur estimée en €" autoFocus />
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
            Annuler
          </button>
          <button onClick={handleSave} disabled={loading || value === ''}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Carte de position ──────────────────────────────────────────

function PositionCard({ position, onEdit, onDelete, onClose, onUpdateBalance, onUpdateEstimatedValue, onViewOrders }) {
  const meta   = CATEGORY_META[position.category] ?? {}
  const fiscal = FISCAL_ENVELOPE_LABELS[position.fiscalEnvelope]
  const c      = position.computed ?? {}

  const isClosed       = position.status === 'CLOSED'
  const isLiquidite    = position.category === 'LIQUIDITE'
  const isImmoPhysique = position.category === 'IMMO_PHYSIQUE'
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
          <p className="text-base font-bold text-gray-900">{fmt(c.currentValueEur)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-0.5">Investi</p>
          <p className="text-base font-bold text-gray-700">{fmt(c.investedAmountEur)}</p>
        </div>

        {/* Plus-value (non nul et non LIQUIDITE) */}
        {!isLiquidite && c.capitalGainEur != null && parseFloat(c.capitalGainEur) !== 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Plus-value</p>
            <p className={`text-sm font-semibold ${capitalGainColor}`}>{fmt(c.capitalGainEur)}</p>
          </div>
        )}

        {/* Unités (BOURSE / CRYPTO) */}
        {isBourseOrCrypto && c.units != null && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Quantité</p>
            <p className="text-sm font-semibold text-gray-700">{fmtUnits(c.units)}</p>
          </div>
        )}

        {/* Prix marché (BOURSE / CRYPTO) */}
        {isBourseOrCrypto && position.instrument?.lastPrice != null && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Prix marché</p>
            <p className="text-sm font-semibold text-gray-700">
              {fmt(position.instrument.lastPrice, position.instrument.currency)}
            </p>
          </div>
        )}

        {/* Taux annuel (LIVRET) */}
        {position.annualRate != null && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Taux annuel</p>
            <p className="text-sm font-semibold text-gray-700">{position.annualRate} %</p>
          </div>
        )}

        {/* Projection mensuelle */}
        {c.monthlyIncomeProjectionEur != null && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-600 mb-0.5">Projection / mois</p>
            <p className="text-sm font-semibold text-emerald-700">{fmt(c.monthlyIncomeProjectionEur)}</p>
          </div>
        )}
      </div>

      {/* Adresse (IMMO_PHYSIQUE) */}
      {position.address && (
        <p className="text-xs text-gray-400 -mt-2 truncate">{position.address}</p>
      )}

      {/* Actions */}
      {!isClosed && (
        <div className="flex gap-2 flex-wrap">
          {isLiquidite ? (
            <button onClick={() => onUpdateBalance(position)}
              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
              Mettre à jour le solde
            </button>
          ) : isImmoPhysique ? (
            <button onClick={() => onUpdateEstimatedValue(position)}
              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
              Mettre à jour la valeur
            </button>
          ) : (
            <button onClick={() => onViewOrders(position)}
              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
              Mouvements
            </button>
          )}
          <button onClick={() => onEdit(position)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition">
            Modifier
          </button>
          <button onClick={() => onClose(position)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-orange-400 hover:text-orange-600 transition">
            Fermer
          </button>
          <button onClick={() => onDelete(position)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-red-400 hover:text-red-600 transition">
            Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────

export default function PatrimoinePage() {
  const [positions, setPositions]             = useState([])
  const [formTarget, setFormTarget]           = useState(undefined)
  const [balanceTarget, setBalanceTarget]     = useState(null)
  const [estimatedTarget, setEstimatedTarget] = useState(null)
  const [ordersTarget, setOrdersTarget]       = useState(null)
  const [filter, setFilter]                   = useState('ALL')
  const [showClosed, setShowClosed]           = useState(false)
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)

  useEffect(() => { fetchPositions() }, [])

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
    if (!confirm(`Fermer la position « ${position.label} » ?`)) return
    const updated = await closePosition(position.id)
    setPositions(ps => ps.map(p => p.id === updated.id ? updated : p))
  }

  async function handleDelete(position) {
    if (!confirm(`Supprimer la position « ${position.label} » et tous ses mouvements ?`)) return
    await deletePosition(position.id)
    setPositions(ps => ps.filter(p => p.id !== position.id))
  }

  async function handleOrdersChanged() {
    const refreshed = await getPositions()
    setPositions(refreshed)
  }

  const allCategories = ['ALL', ...Object.keys(CATEGORY_META)]
  const categoryLabels = { ALL: 'Tous', ...Object.fromEntries(
    Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label])
  )}

  const filtered = positions.filter(p => {
    if (!showClosed && p.status === 'CLOSED') return false
    if (filter !== 'ALL' && p.category !== filter) return false
    return true
  })

  const active = positions.filter(p => p.status === 'ACTIVE')
  const totalValeur     = active.reduce((s, p) => s + parseFloat(p.computed?.currentValueEur  ?? 0), 0)
  const totalInvesti    = active.reduce((s, p) => s + parseFloat(p.computed?.investedAmountEur ?? 0), 0)
  const totalPlusValue  = totalValeur - totalInvesti
  const totalProjection = active
    .filter(p => p.computed?.monthlyIncomeProjectionEur != null)
    .reduce((s, p) => s + parseFloat(p.computed.monthlyIncomeProjectionEur), 0)

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Patrimoine</h2>
        <button onClick={() => setFormTarget(null)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
          + Ajouter une position
        </button>
      </div>

      {/* ── Synthèse globale ── */}
      {positions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Valeur totale</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(totalValeur)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total investi</p>
            <p className="text-2xl font-bold text-gray-700">{fmt(totalInvesti)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Plus-value</p>
            <p className={`text-2xl font-bold ${totalPlusValue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {fmt(totalPlusValue)}
            </p>
          </div>
          {totalProjection > 0 && (
            <div className="bg-emerald-50 rounded-xl shadow-sm p-5">
              <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Revenus / mois</p>
              <p className="text-2xl font-bold text-emerald-700">{fmt(totalProjection)}</p>
            </div>
          )}
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
        <label className="ml-auto flex items-center gap-2 cursor-pointer text-xs text-gray-500">
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)}
            className="accent-indigo-600" />
          Afficher les positions fermées
        </label>
      </div>

      {/* ── Grille de positions ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucune position</p>
          <p className="text-sm">Cliquez sur « + Ajouter une position » pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  )
}
