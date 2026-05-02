import { useState, useEffect } from 'react'
import { inputCls, labelCls } from '../../components/common/formStyles.js'

const CRYPTO_TYPES = [
  { value: '', label: '— Non renseigné —' },
  { value: 'STABLECOIN',     label: 'Stablecoin (USDC, USDT…)' },
  { value: 'STORE_OF_VALUE', label: 'Store of value (BTC, PAXG…)' },
  { value: 'SMART_CONTRACT', label: 'Smart contract platform (ETH, SOL…)' },
  { value: 'LAYER_2',        label: 'Layer 2 (MATIC, ARB, OP…)' },
  { value: 'DEFI',           label: 'DeFi (AAVE, UNI, CRV…)' },
  { value: 'OTHER',          label: 'Autre' },
]

const CRYPTO_NETWORKS = [
  { value: '', label: '— Non renseigné —' },
  { value: 'BITCOIN',   label: 'Bitcoin' },
  { value: 'ETHEREUM',  label: 'Ethereum' },
  { value: 'SOLANA',    label: 'Solana' },
  { value: 'POLYGON',   label: 'Polygon' },
  { value: 'AVALANCHE', label: 'Avalanche' },
  { value: 'BNB_CHAIN', label: 'BNB Chain' },
  { value: 'ARBITRUM',  label: 'Arbitrum' },
  { value: 'OPTIMISM',  label: 'Optimism' },
  { value: 'BASE',      label: 'Base' },
  { value: 'OTHER',     label: 'Autre' },
]

const EMPTY = {
  category: 'BOURSE',
  isin: '',
  ticker: '',
  name: '',
  currency: 'EUR',
  stablePrice: false,
  marketSymbol: '',
  coinGeckoId: '',
  boursoramaSymbol: '',
  cryptoType: '',
  cryptoNetwork: '',
}

export default function AdminInstrumentForm({ item, onSubmit, onCancel }) {
  const isEdit = Boolean(item)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(item ? {
      category:         item.category         ?? 'BOURSE',
      isin:             item.isin             ?? '',
      ticker:           item.ticker           ?? '',
      name:             item.name             ?? '',
      currency:         item.currency         ?? 'EUR',
      stablePrice:      item.stablePrice      ?? false,
      marketSymbol:     item.marketSymbol     ?? '',
      coinGeckoId:      item.coinGeckoId      ?? '',
      boursoramaSymbol: item.boursoramaSymbol ?? '',
      cryptoType:       item.cryptoType       ?? '',
      cryptoNetwork:    item.cryptoNetwork    ?? '',
    } : EMPTY)
    setError(null)
  }, [item])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        category:         form.category,
        isin:             form.isin             || null,
        ticker:           form.ticker           || null,
        name:             form.name,
        currency:         form.currency,
        stablePrice:      form.stablePrice,
        marketSymbol:     form.marketSymbol     || null,
        coinGeckoId:      form.coinGeckoId      || null,
        boursoramaSymbol: form.boursoramaSymbol || null,
        cryptoType:       form.cryptoType       || null,
        cryptoNetwork:    form.cryptoNetwork    || null,
      })
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Une erreur est survenue.'
      setError(typeof msg === 'string' ? msg : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const isBourse = form.category === 'BOURSE'
  const isCrypto = form.category === 'CRYPTO'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier l\'instrument' : 'Ajouter un instrument'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Catégorie — uniquement en création */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Catégorie *</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                <option value="BOURSE">BOURSE</option>
                <option value="CRYPTO">CRYPTO</option>
              </select>
            </div>
          )}

          {/* Identifiant */}
          {isBourse && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>ISIN *</label>
              <input name="isin" type="text" value={form.isin} onChange={handleChange}
                required placeholder="ex : FR0011550185" className={inputCls} />
            </div>
          )}
          {isCrypto && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Ticker *</label>
              <input name="ticker" type="text" value={form.ticker} onChange={handleChange}
                required placeholder="ex : BTC" className={inputCls} />
            </div>
          )}

          {/* Nom + Devise */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Nom *</label>
            <input name="name" type="text" value={form.name} onChange={handleChange}
              required placeholder="ex : Amundi ETF S&P 500" className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Devise *</label>
            <input name="currency" type="text" value={form.currency} onChange={handleChange}
              required placeholder="ex : EUR" className={inputCls} />
          </div>

          {/* Symboles API */}
          {isBourse && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Symbole Twelve Data</label>
                <input name="marketSymbol" type="text" value={form.marketSymbol} onChange={handleChange}
                  placeholder="ex : ESE:XPAR" className={inputCls} />
                <p className="text-xs text-gray-400">Résolu automatiquement depuis l'ISIN. Modifier avec précaution.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Symbole Boursorama</label>
                <input name="boursoramaSymbol" type="text" value={form.boursoramaSymbol} onChange={handleChange}
                  placeholder="ex : 1rTESE" className={inputCls} />
                <p className="text-xs text-gray-400">Visible dans l'URL Boursorama : /cours/<strong>1rTESE</strong>/</p>
              </div>
            </>
          )}
          {isCrypto && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>ID CoinGecko</label>
                <input name="coinGeckoId" type="text" value={form.coinGeckoId} onChange={handleChange}
                  placeholder="ex : bitcoin" className={inputCls} />
                <p className="text-xs text-gray-400">Résolu automatiquement depuis le ticker. Modifier avec précaution.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Type de crypto</label>
                <select name="cryptoType" value={form.cryptoType} onChange={handleChange} className={inputCls}>
                  {CRYPTO_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Réseau / Blockchain</label>
                <select name="cryptoNetwork" value={form.cryptoNetwork} onChange={handleChange} className={inputCls}>
                  {CRYPTO_NETWORKS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Prix fixe */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="stablePrice" checked={form.stablePrice} onChange={handleChange}
              className="w-4 h-4 accent-indigo-600" />
            <span className="text-sm font-semibold text-gray-700">Prix fixe (fonds euros, stablecoins)</span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 mt-2">
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
