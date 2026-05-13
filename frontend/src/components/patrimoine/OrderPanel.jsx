import { useState, useEffect } from 'react'
import { getOrders, createOrder, updateOrder, deleteOrder, getPositions } from '../../api/patrimoine'
import { useAnalytics } from '../../hooks/useAnalytics'
import { MONTHS_FR_SHORT } from '../../utils/constants.js'
import DateInput from '../ui/DateInput'

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

// Options spécifiques aux positions CRYPTO — remplacent le sélecteur BUY/SELL brut
// orderType : valeur envoyée au backend (champ existant)
// cryptoOperationType : nouveau champ fiscal (null pour AIRDROP/INTEREST)
const CRYPTO_OPERATION_OPTIONS = [
  {
    value: 'BUY_FIAT',     label: 'Achat avec euros',
    orderType: 'BUY',      cryptoOperationType: 'BUY_FIAT',
    color: 'bg-blue-100 text-blue-700',
    tooltip: 'Tu utilises de l\'argent fiat (EUR, USD…) pour acheter cette crypto. Augmente ta base de coût (PTA).',
  },
  {
    value: 'SELL_FIAT',    label: 'Vente contre euros',
    orderType: 'SELL',     cryptoOperationType: 'SELL_FIAT',
    color: 'bg-orange-100 text-orange-700',
    tooltip: 'Tu vends cette crypto contre de l\'argent fiat. Opération imposable — déclenche un calcul de plus-value (art. 150 VH bis CGI).',
  },
  {
    value: 'SWAP_OUT',     label: 'Échange sortant (vers une autre crypto)',
    orderType: 'SELL',     cryptoOperationType: 'SWAP_OUT',
    color: 'bg-amber-100 text-amber-700',
    tooltip: 'Tu échanges cette crypto contre une autre (ex : ETH → BTC). Non imposable en France (opération intercalaire), mais à tracer pour le suivi des quantités. MyFinance crée automatiquement l\'opération miroir sur la crypto reçue.',
  },
  {
    value: 'SWAP_IN',      label: 'Échange entrant (depuis une autre crypto)',
    orderType: 'BUY',      cryptoOperationType: 'SWAP_IN',
    color: 'bg-amber-100 text-amber-700',
    tooltip: 'Crypto reçue suite à un swap depuis une autre crypto. Généralement créé automatiquement par MyFinance — pas besoin de le saisir à la main.',
  },
  {
    value: 'TRANSFER_IN',  label: 'Réception (wallet propre)',
    orderType: 'BUY',      cryptoOperationType: 'TRANSFER_IN',
    color: 'bg-teal-100 text-teal-700',
    tooltip: 'Crypto reçue depuis un autre de tes wallets ou exchanges. Non imposable, ne change que la quantité.',
  },
  {
    value: 'TRANSFER_OUT', label: 'Envoi (wallet propre)',
    orderType: 'SELL',     cryptoOperationType: 'TRANSFER_OUT',
    color: 'bg-teal-100 text-teal-700',
    tooltip: 'Crypto envoyée vers un autre de tes wallets ou exchanges. Non imposable. À ne pas confondre avec un paiement à un tiers (= cession imposable).',
  },
  {
    value: 'AIRDROP',      label: 'Airdrop',
    orderType: 'AIRDROP',  cryptoOperationType: null,
    color: 'bg-teal-100 text-teal-700',
    tooltip: 'Réception gratuite de tokens. Hors périmètre fiscal V1 (traitement BNC spécifique).',
  },
  {
    value: 'INTEREST',     label: 'Intérêts / Staking',
    orderType: 'INTEREST', cryptoOperationType: null,
    color: 'bg-violet-100 text-violet-700',
    tooltip: 'Revenus de staking ou intérêts. Hors périmètre fiscal V1.',
  },
]

function CryptoOpLabel({ option }) {
  const [showTip, setShowTip] = useState(false)
  return (
    <span className="flex items-center gap-1">
      {option.label}
      <span
        className="relative inline-block"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        <span className="w-3.5 h-3.5 rounded-full bg-gray-300 text-gray-600 text-[9px] font-bold flex items-center justify-center cursor-default">?</span>
        {showTip && (
          <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-60 bg-gray-800 text-white text-xs rounded-lg p-2.5 shadow-xl whitespace-normal">
            {option.tooltip}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
          </span>
        )}
      </span>
    </span>
  )
}

function formatDate(iso) {
  const [year, month, day] = iso.split('-')
  return `${parseInt(day, 10)} ${MONTHS_FR_SHORT[parseInt(month, 10) - 1]} ${year}`
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-xs font-semibold text-gray-600'

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY_ORDER = {
  orderType: 'DEPOSIT', quantity: '', unitPrice: '',
  amount: '', orderDate: TODAY, notes: '',
  // Champs fiscalité crypto
  cryptoOpValue: 'BUY_FIAT',       // valeur combinée (clé dans CRYPTO_OPERATION_OPTIONS)
  portfolioValueAtDateEur: '',      // override VGP manuel pour SELL_FIAT
  swapCounterpartPositionId: '',    // pour SWAP_OUT
  swapCounterpartQuantity: '',      // pour SWAP_OUT
  swapCounterpartAmount: '',        // pour SWAP_OUT
}

// ── Formulaire d'ordre ─────────────────────────────────────────

function OrderForm({ order, category, onSubmit, onCancel }) {
  const isEdit    = Boolean(order?.id)
  const isCrypto  = category === 'CRYPTO'
  const needsQty  = category === 'BOURSE' || category === 'CRYPTO'
  const orderTypes = ORDER_TYPES_BY_CATEGORY[category] ?? ['DEPOSIT', 'WITHDRAWAL', 'INTEREST']

  const [form, setForm]       = useState(EMPTY_ORDER)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [cryptoPositions, setCryptoPositions] = useState([])

  // Chargement des positions CRYPTO pour le sélecteur de SWAP
  useEffect(() => {
    if (isCrypto) {
      getPositions({ category: 'CRYPTO', status: 'ACTIVE' })
        .then(setCryptoPositions)
        .catch(() => {})
    }
  }, [isCrypto])

  useEffect(() => {
    if (order) {
      // En édition : reconstituer cryptoOpValue depuis cryptoOperationType ou orderType
      const existingCryptoOp = order.cryptoOperationType
        ? CRYPTO_OPERATION_OPTIONS.find(o => o.cryptoOperationType === order.cryptoOperationType)
        : CRYPTO_OPERATION_OPTIONS.find(o => o.orderType === order.orderType && !o.cryptoOperationType)
      setForm({
        orderType:                 order.orderType,
        quantity:                  order.quantity ?? '',
        unitPrice:                 order.unitPrice ?? '',
        amount:                    order.amount,
        orderDate:                 order.orderDate,
        notes:                     order.notes ?? '',
        cryptoOpValue:             existingCryptoOp?.value ?? 'BUY_FIAT',
        portfolioValueAtDateEur:   order.portfolioValueAtDateEur ?? '',
        swapCounterpartPositionId: '',
        swapCounterpartQuantity:   '',
        swapCounterpartAmount:     '',
      })
    } else {
      const defaultType = isCrypto ? 'BUY_FIAT' : orderTypes[0]
      const cryptoOption = CRYPTO_OPERATION_OPTIONS.find(o => o.value === defaultType)
      setForm({
        ...EMPTY_ORDER,
        orderType:     isCrypto ? (cryptoOption?.orderType ?? 'BUY') : orderTypes[0],
        cryptoOpValue: defaultType,
      })
    }
  }, [order])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => {
      const updated = { ...f, [name]: value }
      // Quand on change le type d'opération crypto, mettre à jour orderType en conséquence
      if (name === 'cryptoOpValue') {
        const opt = CRYPTO_OPERATION_OPTIONS.find(o => o.value === value)
        if (opt) updated.orderType = opt.orderType
      }
      return updated
    })
  }

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

  const selectedCryptoOption = isCrypto
    ? CRYPTO_OPERATION_OPTIONS.find(o => o.value === form.cryptoOpValue)
    : null

  const isSwapOut  = selectedCryptoOption?.cryptoOperationType === 'SWAP_OUT'
  const isSellFiat = selectedCryptoOption?.cryptoOperationType === 'SELL_FIAT'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        orderType: form.orderType,
        quantity:  needsQty && form.quantity !== '' ? parseFloat(form.quantity) : null,
        unitPrice: needsQty && form.unitPrice !== '' ? parseFloat(form.unitPrice) : null,
        amount:    parseFloat(form.amount),
        orderDate: form.orderDate,
        notes:     form.notes || null,
      }
      if (isCrypto && selectedCryptoOption) {
        payload.cryptoOperationType    = selectedCryptoOption.cryptoOperationType
        payload.portfolioValueAtDateEur = isSellFiat && form.portfolioValueAtDateEur !== ''
          ? parseFloat(form.portfolioValueAtDateEur) : null
        if (isSwapOut && form.swapCounterpartPositionId !== '') {
          payload.swapCounterpartPositionId = parseInt(form.swapCounterpartPositionId, 10)
          payload.swapCounterpartQuantity   = form.swapCounterpartQuantity !== ''
            ? parseFloat(form.swapCounterpartQuantity) : null
          payload.swapCounterpartAmount     = form.swapCounterpartAmount !== ''
            ? parseFloat(form.swapCounterpartAmount) : null
        }
      }
      await onSubmit(payload)
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
              {isCrypto ? (
                <select name="cryptoOpValue" value={form.cryptoOpValue}
                  onChange={handleChange} className={inputCls}>
                  {CRYPTO_OPERATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <select name="orderType" value={form.orderType} onChange={handleChange} className={inputCls}>
                  {orderTypes.map(t => (
                    <option key={t} value={t}>{ORDER_TYPE_LABELS[t]?.label ?? t}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date *</label>
              <DateInput name="orderDate" value={form.orderDate} onChange={val => setForm(f => ({ ...f, orderDate: val }))} required />
            </div>
          </div>

          {/* Tooltip sur le type crypto sélectionné */}
          {isCrypto && selectedCryptoOption?.tooltip && (
            <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 leading-relaxed">
              💡 {selectedCryptoOption.tooltip}
            </p>
          )}

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

          {/* Override VGP (SELL_FIAT uniquement) */}
          {isSellFiat && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                Valeur du portefeuille à la date (VGP) — optionnel
              </label>
              <input name="portfolioValueAtDateEur" type="number" min="0" step="0.01"
                value={form.portfolioValueAtDateEur} onChange={handleChange}
                placeholder="Laissez vide pour calcul automatique depuis les cours historiques"
                className={inputCls} />
              <p className="text-xs text-gray-400">
                À renseigner uniquement si le cours historique est indisponible pour cette date.
              </p>
            </div>
          )}

          {/* Swap — position de destination (SWAP_OUT uniquement) */}
          {isSwapOut && (
            <div className="flex flex-col gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-800">Crypto reçue en échange</p>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Position de destination *</label>
                <select name="swapCounterpartPositionId" value={form.swapCounterpartPositionId}
                  onChange={handleChange} className={inputCls}>
                  <option value="">— Sélectionner une position CRYPTO —</option>
                  {cryptoPositions.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">
                  MyFinance créera automatiquement l'opération miroir (Échange entrant) sur cette position.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Quantité reçue</label>
                  <input name="swapCounterpartQuantity" type="number" min="0" step="any"
                    value={form.swapCounterpartQuantity} onChange={handleChange}
                    placeholder="ex : 0.05" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Montant (devise dest.)</label>
                  <input name="swapCounterpartAmount" type="number" min="0" step="0.01"
                    value={form.swapCounterpartAmount} onChange={handleChange}
                    placeholder="ex : 4200" className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Note</label>
            <input name="notes" type="text" value={form.notes}
              onChange={handleChange}
              placeholder={isCrypto
                ? 'Exchange, hash de transaction, motif… (recommandé pour traçabilité fiscale)'
                : 'Commentaire libre…'}
              className={inputCls} />
            {isCrypto && (
              <p className="text-xs text-gray-400">
                Recommandé : exchange utilisé, hash de transaction. Ces informations sont précieuses en cas de contrôle fiscal (délai 3 ans).
              </p>
            )}
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
  const [filterType, setFilterType]       = useState(null)

  useEffect(() => { fetchOrders() }, [position.id])

  const { trackEvent } = useAnalytics()

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
      trackEvent('FEATURE_USE', 'patrimoine.order.edit')
      setOrders(os => os.map(o => o.id === updated.id ? updated : o))
    } else {
      const created = await createOrder(position.id, payload)
      trackEvent('FEATURE_USE', 'patrimoine.order.create')
      setOrders(os => [created, ...os])
    }
    setFormTarget(undefined)
    onOrdersChanged?.()
  }

  async function handleDelete(order) {
    try {
      await deleteOrder(position.id, order.id)
      trackEvent('FEATURE_USE', 'patrimoine.order.delete')
      setOrders(os => os.filter(o => o.id !== order.id))
      onOrdersChanged?.()
    } catch {
      setError('Impossible de supprimer ce mouvement.')
    }
  }

  const isBourseOrCrypto = position.category === 'BOURSE' || position.category === 'CRYPTO'

  // Types distincts présents dans la liste, dans l'ordre d'apparition
  const availableTypes = [...new Set(orders.map(o => o.orderType))]

  // Liste affichée (filtrée), les totaux restent calculés sur tous les ordres
  const visibleOrders = filterType ? orders.filter(o => o.orderType === filterType) : orders

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

        {/* Filtres par type — uniquement si ≥ 2 types différents */}
        {!loading && availableTypes.length > 1 && (
          <div className="flex flex-wrap gap-1.5 px-6 py-2 border-b border-gray-100">
            <button
              onClick={() => setFilterType(null)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                filterType === null
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Tous ({orders.length})
            </button>
            {availableTypes.map(type => {
              const { label, color } = ORDER_TYPE_LABELS[type] ?? { label: type, color: 'bg-gray-100 text-gray-600' }
              const count = orders.filter(o => o.orderType === type).length
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(f => f === type ? null : type)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                    filterType === type ? color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label} ({count})
                </button>
              )
            })}
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
          {!loading && visibleOrders.length === 0 && orders.length > 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Aucun mouvement pour ce filtre.</p>
          )}
          {visibleOrders.map(order => {
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
