import { useState, useEffect } from 'react'
import { getOrders, createOrder, updateOrder, deleteOrder } from '../../api/patrimoine'

const ORDER_TYPE_LABELS = {
  DEPOSIT:     { label: 'Dépôt',       color: 'bg-green-100 text-green-700'    },
  WITHDRAWAL:  { label: 'Retrait',     color: 'bg-red-100 text-red-700'        },
  BUY:         { label: 'Achat',       color: 'bg-blue-100 text-blue-700'      },
  SELL:        { label: 'Vente',       color: 'bg-orange-100 text-orange-700'  },
  INTEREST:    { label: 'Intérêts',    color: 'bg-violet-100 text-violet-700'  },
  DIVIDEND:    { label: 'Dividende',   color: 'bg-indigo-100 text-indigo-700'  },
  AIRDROP:     { label: 'Airdrop',     color: 'bg-teal-100 text-teal-700'      },
  ABONDEMENT:  { label: 'Abondement',  color: 'bg-emerald-100 text-emerald-700' },
}

const ORDER_TYPES_BY_CATEGORY = {
  BOURSE:        ['BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'ABONDEMENT'],
  CRYPTO:        ['BUY', 'SELL', 'INTEREST', 'AIRDROP'],
  IMMO_PAPIER:   ['DEPOSIT', 'WITHDRAWAL', 'INTEREST'],
  IMMO_PHYSIQUE: ['DEPOSIT', 'WITHDRAWAL', 'INTEREST'],
  LIVRET:        ['DEPOSIT', 'WITHDRAWAL', 'INTEREST'],
}

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
function formatDate(iso) {
  const [year, month, day] = iso.split('-')
  return `${parseInt(day, 10)} ${MONTHS_FR[parseInt(month, 10) - 1]} ${year}`
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-xs font-semibold text-gray-600'

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY_ORDER = {
  orderType: 'DEPOSIT', quantity: '', unitPrice: '',
  amount: '', orderDate: TODAY, notes: '',
}

// ── Formulaire d'ordre ─────────────────────────────────────────

function OrderForm({ order, category, onSubmit, onCancel }) {
  const isEdit   = Boolean(order?.id)
  const needsQty = category === 'BOURSE' || category === 'CRYPTO'
  const orderTypes = ORDER_TYPES_BY_CATEGORY[category] ?? ['DEPOSIT', 'WITHDRAWAL', 'INTEREST']

  const [form, setForm]     = useState(EMPTY_ORDER)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(order
      ? {
          orderType: order.orderType,
          quantity:  order.quantity ?? '',
          unitPrice: order.unitPrice ?? '',
          amount:    order.amount,
          orderDate: order.orderDate,
          notes:     order.notes ?? '',
        }
      : { ...EMPTY_ORDER, orderType: orderTypes[0] })
  }, [order])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  // Calcul automatique du montant si quantity * unitPrice sont renseignés
  function handleQtyOrPriceChange(e) {
    const { name, value } = e.target
    setForm(f => {
      const updated = { ...f, [name]: value }
      const qty   = parseFloat(name === 'quantity'  ? value : updated.quantity)
      const price = parseFloat(name === 'unitPrice' ? value : updated.unitPrice)
      if (!isNaN(qty) && !isNaN(price)) {
        updated.amount = (qty * price).toFixed(2)
      }
      return updated
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        orderType: form.orderType,
        quantity:  needsQty && form.quantity !== '' ? parseFloat(form.quantity) : null,
        unitPrice: needsQty && form.unitPrice !== '' ? parseFloat(form.unitPrice) : null,
        amount:    parseFloat(form.amount),
        orderDate: form.orderDate,
        notes:     form.notes || null,
      })
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-7 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-gray-900 mb-5">
          {isEdit ? 'Modifier le mouvement' : 'Ajouter un mouvement'}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Type + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Type *</label>
              <select name="orderType" value={form.orderType} onChange={handleChange} className={inputCls}>
                {orderTypes.map(t => (
                  <option key={t} value={t}>{ORDER_TYPE_LABELS[t]?.label ?? t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date *</label>
              <input name="orderDate" type="date" value={form.orderDate}
                onChange={handleChange} required className={inputCls} />
            </div>
          </div>

          {/* Quantité + Prix unitaire (BOURSE / CRYPTO) */}
          {needsQty && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Quantité *</label>
                <input name="quantity" type="number" min="0" step="any"
                  value={form.quantity} onChange={handleQtyOrPriceChange}
                  required placeholder="ex : 10" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Prix unitaire *</label>
                <input name="unitPrice" type="number" min="0" step="any"
                  value={form.unitPrice} onChange={handleQtyOrPriceChange}
                  required placeholder="ex : 88.44" className={inputCls} />
              </div>
            </div>
          )}

          {/* Montant */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Montant *</label>
            <input name="amount" type="number" min="0.01" step="0.01"
              value={form.amount} onChange={handleChange} required
              placeholder="ex : 884.40" className={inputCls} />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Note</label>
            <input name="notes" type="text" value={form.notes}
              onChange={handleChange} placeholder="Commentaire libre…"
              className={inputCls} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 mt-1">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Panneau principal ──────────────────────────────────────────

export default function OrderPanel({ position, onClose, onOrdersChanged }) {
  const [orders, setOrders]               = useState([])
  const [formTarget, setFormTarget]       = useState(undefined)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  useEffect(() => { fetchOrders() }, [position.id])

  async function fetchOrders() {
    try {
      setLoading(true)
      setOrders(await getOrders(position.id))
    } catch {
      setError('Impossible de charger les mouvements.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateOrder(position.id, formTarget.id, payload)
      setOrders(os => os.map(o => o.id === updated.id ? updated : o))
    } else {
      const created = await createOrder(position.id, payload)
      setOrders(os => [created, ...os])
    }
    setFormTarget(undefined)
    onOrdersChanged?.()
  }

  async function handleDelete(order) {
    try {
      await deleteOrder(position.id, order.id)
      setOrders(os => os.filter(o => o.id !== order.id))
      onOrdersChanged?.()
    } catch {
      setError('Impossible de supprimer ce mouvement.')
    }
  }

  const isBourseOrCrypto = position.category === 'BOURSE' || position.category === 'CRYPTO'

  const totalAchete = orders
    .filter(o => ['DEPOSIT', 'BUY'].includes(o.orderType))
    .reduce((s, o) => s + parseFloat(o.amountEur), 0)

  const totalVendu = orders
    .filter(o => ['WITHDRAWAL', 'SELL'].includes(o.orderType))
    .reduce((s, o) => s + parseFloat(o.amountEur), 0)

  const totalUnits = isBourseOrCrypto
    ? orders.reduce((s, o) => {
        if (o.quantity == null) return s
        return (['BUY', 'AIRDROP', 'ABONDEMENT'].includes(o.orderType)) ? s + parseFloat(o.quantity)
             : o.orderType === 'SELL' ? s - parseFloat(o.quantity)
             : s
      }, 0)
    : null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col">

        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{position.label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {position.instrument
                ? `${position.instrument.isin ?? position.instrument.ticker} · Mouvements`
                : 'Mouvements du compte'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setFormTarget(null)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition">
              + Ajouter
            </button>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition text-lg">
              ×
            </button>
          </div>
        </div>

        {/* Totaux */}
        {orders.length > 0 && (
          <div className={`grid gap-3 px-6 py-3 bg-gray-50 ${isBourseOrCrypto ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div>
              <p className="text-xs text-gray-400">Total investi</p>
              <p className="text-sm font-bold text-green-700 amount">
                +{totalAchete.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total retiré</p>
              <p className="text-sm font-bold text-red-600 amount">
                -{totalVendu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </p>
            </div>
            {isBourseOrCrypto && totalUnits !== null && (
              <div>
                <p className="text-xs text-gray-400">Quantité nette</p>
                <p className="text-sm font-bold text-gray-700">
                  {totalUnits.toLocaleString('fr-FR', { maximumFractionDigits: 6 })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Liste des ordres */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && <p className="text-sm text-gray-400">Chargement…</p>}
          {error   && <p className="text-sm text-red-600">{error}</p>}
          {!loading && orders.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">Aucun mouvement enregistré.</p>
              <p className="text-xs mt-1">Cliquez sur « + Ajouter » pour enregistrer un mouvement.</p>
            </div>
          )}
          {orders.map(order => {
            const { label, color } = ORDER_TYPE_LABELS[order.orderType] ?? {}
            const isDebit = ['WITHDRAWAL', 'SELL'].includes(order.orderType)
            return (
              <div key={order.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${color}`}>
                    {label}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">{formatDate(order.orderDate)}</p>
                    {isBourseOrCrypto && order.quantity != null && (
                      <p className="text-xs text-gray-400">
                        {parseFloat(order.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 6 })} ×{' '}
                        {parseFloat(order.unitPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {order.notes && <p className="text-xs text-gray-400 truncate">{order.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className={`text-sm font-bold amount ${isDebit ? 'text-red-600' : 'text-green-700'}`}>
                      {isDebit ? '-' : '+'}
                      {parseFloat(order.amountEur).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setFormTarget(order)}
                      className="px-2.5 py-1 border border-gray-300 rounded-md text-xs text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition">
                      Modifier
                    </button>
                    {confirmDeleteId === order.id ? (
                      <>
                        <button onClick={() => { setConfirmDeleteId(null); handleDelete(order) }}
                          className="px-2.5 py-1 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition">
                          Oui
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 border border-gray-300 rounded-md text-xs text-gray-500 hover:border-gray-400 transition">
                          Non
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(order.id)}
                        className="px-2.5 py-1 border border-gray-300 rounded-md text-xs text-gray-500 hover:border-red-400 hover:text-red-600 transition">
                        Suppr.
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {formTarget !== undefined && (
        <OrderForm
          order={formTarget}
          category={position.category}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
