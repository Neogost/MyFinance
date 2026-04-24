import { useState, useEffect, useRef } from 'react'
import { getInstruments, createInstrument } from '../../api/patrimoine'
import { CATEGORY_META, FISCAL_ENVELOPE_LABELS, FISCAL_ENVELOPES_BY_CATEGORY, ASSET_SUB_TYPES, OWNERSHIP_TYPES } from './constants'

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

const EMPTY_FORM = {
  partner: '', label: '', currency: 'EUR',
  fiscalEnvelope: 'NONE', assetSubType: '', instrumentId: null,
  ownershipType: 'PLEINE_PROPRIETE', address: '', estimatedCurrentValue: '',
  acquisitionDate: '', acquisitionPrice: '',
  commissionRate: '', annualRate: '', currentBalance: '',
  includeInIncomeProjection: false,
}

// ── Autocomplete instrument ────────────────────────────────────

function InstrumentSearch({ category, value, onChange }) {
  const [query, setQuery]                 = useState(value?.name ?? '')
  const [results, setResults]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [open, setOpen]                   = useState(false)
  const [creating, setCreating]           = useState(false)
  const [newName, setNewName]             = useState('')
  const [newCurrency, setNewCurrency]     = useState('EUR')
  const [newStablePrice, setNewStablePrice] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError]     = useState(null)
  const debounceRef                       = useRef(null)

  useEffect(() => {
    if (value?.name) setQuery(value.name)
  }, [value?.name])

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    setCreating(false)
    setCreateError(null)
    if (!q) { onChange(null); setResults([]); setOpen(false); return }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (q.length < 2) return
      setLoading(true)
      try {
        const data = await getInstruments({ q, category })
        setResults(data)
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function select(instrument) {
    setQuery(instrument.name)
    setResults([])
    setOpen(false)
    setCreating(false)
    onChange(instrument)
  }

  function openCreateForm() {
    setOpen(false)
    setCreating(true)
    setNewName('')
    setNewCurrency('EUR')
    setNewStablePrice(false)
    setCreateError(null)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreateLoading(true)
    setCreateError(null)
    try {
      const payload = {
        category,
        isin:        category === 'BOURSE' ? query.trim().toUpperCase() : null,
        ticker:      category === 'CRYPTO' ? query.trim().toUpperCase() : null,
        name:        newName.trim(),
        currency:    newCurrency,
        stablePrice: newStablePrice,
      }
      const created = await createInstrument(payload)
      select(created)
    } catch (err) {
      const msg = err?.response?.data?.message
      setCreateError(msg ?? "Erreur lors de la création de l'instrument.")
    } finally {
      setCreateLoading(false)
    }
  }

  const isBourse          = category === 'BOURSE'
  const identifierLabel   = isBourse ? 'ISIN' : 'Ticker'
  const searchPlaceholder = isBourse ? 'Rechercher par ISIN ou nom…' : 'Rechercher par ticker ou nom…'

  return (
    <div className="relative">
      <input
        type="text" value={query} onChange={handleInput}
        placeholder={searchPlaceholder}
        className={inputCls}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading && (
        <span className="absolute right-3 top-3 text-xs text-gray-400">Recherche…</span>
      )}

      {/* Résultats */}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map(inst => (
            <li key={inst.id}
              onMouseDown={() => select(inst)}
              className="px-3 py-2 hover:bg-indigo-50 cursor-pointer">
              <span className="font-medium text-sm text-gray-900">{inst.name}</span>
              <span className="ml-2 text-xs text-gray-400">
                {inst.isin ?? inst.ticker} · {inst.currency}
                {inst.lastPrice != null && ` · ${parseFloat(inst.lastPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${inst.currency}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Aucun résultat → proposition de création */}
      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow">
          <p className="px-3 py-2 text-sm text-gray-400">Aucun instrument trouvé.</p>
          <button
            type="button"
            onMouseDown={openCreateForm}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 transition">
            Créer un nouvel instrument « {query.trim().toUpperCase()} » ?
          </button>
        </div>
      )}

      {/* Formulaire de création inline */}
      {creating && (
        <div className="mt-2 p-3 border border-indigo-200 bg-indigo-50 rounded-lg flex flex-col gap-3">
          <p className="text-xs font-semibold text-indigo-700">
            Nouvel instrument — {identifierLabel} : <span className="font-bold">{query.trim().toUpperCase()}</span>
          </p>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={isBourse ? 'Nom complet (ex : Amundi MSCI World)' : 'Nom complet (ex : Bitcoin)'}
            className={inputCls}
            autoFocus
          />
          <select value={newCurrency} onChange={e => setNewCurrency(e.target.value)} className={inputCls}>
            {['EUR', 'USD', 'GBP', 'CHF', 'JPY'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-700 select-none">
            <input
              type="checkbox"
              checked={newStablePrice}
              onChange={e => setNewStablePrice(e.target.checked)}
              className="accent-indigo-600"
            />
            Prix fixe (fonds euros, stablecoin) — pas d'indicateur d'obsolescence
          </label>
          {createError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{createError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setCreating(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-gray-400 transition">
              Annuler
            </button>
            <button type="button" onClick={handleCreate}
              disabled={createLoading || !newName.trim()}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
              {createLoading ? 'Création…' : 'Créer et sélectionner'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

export default function PositionForm({ position, onSubmit, onCancel }) {
  const isEdit = Boolean(position?.id)
  const [step, setStep]         = useState(isEdit ? 2 : 1)
  const [category, setCategory] = useState(position?.category ?? null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [instrument, setInstrument] = useState(position?.instrument ?? null)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (position?.id) {
      setCategory(position.category)
      setInstrument(position.instrument ?? null)
      setForm({
        partner:                   position.partner ?? '',
        label:                     position.label ?? '',
        currency:                  position.currency ?? 'EUR',
        fiscalEnvelope:            position.fiscalEnvelope ?? 'NONE',
        assetSubType:              position.assetSubType ?? '',
        instrumentId:              position.instrument?.id ?? null,
        ownershipType:             position.ownershipType ?? 'PLEINE_PROPRIETE',
        address:                   position.address ?? '',
        estimatedCurrentValue:     position.estimatedCurrentValue ?? '',
        acquisitionDate:           position.acquisitionDate ?? '',
        acquisitionPrice:          position.acquisitionPrice ?? '',
        commissionRate:            position.commissionRate ?? '',
        annualRate:                position.annualRate ?? '',
        currentBalance:            position.currentBalance ?? '',
        includeInIncomeProjection: position.includeInIncomeProjection ?? false,
      })
    }
  }, [position])

  function selectCategory(cat) {
    setCategory(cat)
    setForm({ ...EMPTY_FORM,
      currency: (cat === 'BOURSE' || cat === 'CRYPTO') ? 'EUR' : 'EUR',
    })
    setInstrument(null)
    setStep(2)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        category,
        partner:                   form.partner || null,
        label:                     form.label,
        currency:                  form.currency || 'EUR',
        fiscalEnvelope:            form.fiscalEnvelope || null,
        assetSubType:              form.assetSubType || null,
        instrumentId:              instrument?.id ?? null,
        ownershipType:             form.ownershipType || null,
        address:                   form.address || null,
        estimatedCurrentValue:     form.estimatedCurrentValue !== '' ? parseFloat(form.estimatedCurrentValue) : null,
        acquisitionDate:           form.acquisitionDate || null,
        acquisitionPrice:          form.acquisitionPrice !== '' ? parseFloat(form.acquisitionPrice) : null,
        commissionRate:            form.commissionRate !== '' ? parseFloat(form.commissionRate) : null,
        annualRate:                form.annualRate !== '' ? parseFloat(form.annualRate) : null,
        currentBalance:            form.currentBalance !== '' ? parseFloat(form.currentBalance) : null,
        includeInIncomeProjection: form.includeInIncomeProjection,
      }
      await onSubmit(payload)
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const isBourse       = category === 'BOURSE'
  const isCrypto       = category === 'CRYPTO'
  const isImmoPapier   = category === 'IMMO_PAPIER'
  const isImmoPhysique = category === 'IMMO_PHYSIQUE'
  const isLivret       = category === 'LIVRET'
  const isLiquidite    = category === 'LIQUIDITE'
  const hasInstrument  = isBourse || isCrypto
  const hasFiscal      = isBourse || isCrypto || isImmoPapier
  const availableEnvelopes = FISCAL_ENVELOPES_BY_CATEGORY[category] ?? []
  const hasProjection  = !isLiquidite
  const hasPartner     = !isImmoPhysique

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">

        {/* ── En-tête ── */}
        <div className="px-8 pt-7 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Modifier la position' : 'Nouvelle position'}
          </h2>
          {!isEdit && (
            <div className="flex items-center gap-2 mt-3">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>{s}</span>
                  <span className="text-xs text-gray-400">{s === 1 ? 'Catégorie' : 'Informations'}</span>
                  {s < 2 && <div className={`w-8 h-0.5 ${step > s ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-6 overflow-y-auto">

          {/* ── Étape 1 : Choix de la catégorie ── */}
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Choisissez le type de position à créer :</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(CATEGORY_META).map(([value, { label, icon }]) => (
                  <button key={value} onClick={() => selectCategory(value)}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition group">
                    <span className="text-2xl">{icon}</span>
                    <span className="text-xs font-semibold text-gray-700 group-hover:text-indigo-700 text-center leading-tight">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button type="button" onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 2 : Formulaire ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Instrument (BOURSE / CRYPTO) */}
              {hasInstrument && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>
                    {isBourse ? 'Instrument (ISIN)' : 'Crypto (ticker)'} *
                  </label>
                  <InstrumentSearch
                    category={category}
                    value={instrument}
                    onChange={setInstrument}
                  />
                  {instrument && (
                    <p className="text-xs text-indigo-600 mt-0.5">
                      {instrument.isin ?? instrument.ticker} · {instrument.currency}
                      {instrument.lastPrice != null
                        ? ` · Dernier prix : ${parseFloat(instrument.lastPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${instrument.currency}`
                        : ' · Prix non disponible'}
                    </p>
                  )}
                </div>
              )}

              {/* Sous-type (BOURSE) */}
              {isBourse && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Sous-type</label>
                  <select name="assetSubType" value={form.assetSubType} onChange={handleChange} className={inputCls}>
                    <option value="">— Choisir —</option>
                    {ASSET_SUB_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Libellé + Partenaire */}
              <div className="grid grid-cols-2 gap-4">
                {hasPartner && (
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Partenaire</label>
                    <input name="partner" type="text" value={form.partner}
                      onChange={handleChange}
                      placeholder={isBourse ? 'ex : SaxoBank - PEA' : isCrypto ? 'ex : Binance' : 'ex : BNP Parisbas'}
                      className={inputCls} />
                  </div>
                )}
                <div className={`flex flex-col gap-1.5 ${!hasPartner ? 'col-span-2' : ''}`}>
                  <label className={labelCls}>Libellé *</label>
                  <input name="label" type="text" value={form.label}
                    onChange={handleChange} required
                    placeholder={isImmoPhysique ? 'ex : Appartement Cholet' : 'ex : Livret A'}
                    className={inputCls} />
                </div>
              </div>

              {/* Devise (BOURSE / CRYPTO) */}
              {hasInstrument && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Devise</label>
                  <select name="currency" value={form.currency} onChange={handleChange} className={inputCls}>
                    {['EUR', 'USD', 'GBP', 'CHF', 'JPY'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Enveloppe fiscale (BOURSE / LIVRET / IMMO_PAPIER) */}
              {hasFiscal && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Enveloppe fiscale</label>
                  <select name="fiscalEnvelope" value={form.fiscalEnvelope} onChange={handleChange} className={inputCls}>
                    <option value="NONE">Aucune</option>
                    {availableEnvelopes.map(value => (
                      <option key={value} value={value}>{FISCAL_ENVELOPE_LABELS[value].formLabel}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* LIVRET : taux annuel */}
              {isLivret && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Taux annuel (%)</label>
                  <input name="annualRate" type="number" min="0" step="0.01"
                    value={form.annualRate} onChange={handleChange}
                    placeholder="ex : 3.00" className={inputCls} />
                </div>
              )}

              {/* IMMO_PAPIER : taux de commission */}
              {isImmoPapier && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Taux de commission plateforme (%)</label>
                  <input name="commissionRate" type="number" min="0" step="0.01"
                    value={form.commissionRate} onChange={handleChange}
                    placeholder="ex : 10.0" className={inputCls} />
                </div>
              )}

              {/* IMMO_PHYSIQUE : adresse + type propriété + valeur estimée */}
              {isImmoPhysique && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Adresse</label>
                    <input name="address" type="text" value={form.address}
                      onChange={handleChange}
                      placeholder="ex : 6 Rue Édouard Branly 49300 Cholet"
                      className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Type de propriété</label>
                      <select name="ownershipType" value={form.ownershipType} onChange={handleChange} className={inputCls}>
                        {OWNERSHIP_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Valeur estimée (€)</label>
                      <input name="estimatedCurrentValue" type="number" min="0" step="0.01"
                        value={form.estimatedCurrentValue} onChange={handleChange}
                        placeholder="ex : 115000" className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Date d'acquisition</label>
                      <input name="acquisitionDate" type="date"
                        value={form.acquisitionDate} onChange={handleChange}
                        className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls}>Prix d'acquisition (€)</label>
                      <input name="acquisitionPrice" type="number" min="0" step="0.01"
                        value={form.acquisitionPrice} onChange={handleChange}
                        placeholder="ex : 95000" className={inputCls} />
                    </div>
                  </div>
                </>
              )}

              {/* LIQUIDITE : solde actuel */}
              {isLiquidite && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Solde actuel (€)</label>
                  <input name="currentBalance" type="number" min="0" step="0.01"
                    value={form.currentBalance} onChange={handleChange}
                    placeholder="ex : 525.79" className={inputCls} />
                </div>
              )}

              {/* Projection revenus (toutes sauf LIQUIDITE) */}
              {hasProjection && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" name="includeInIncomeProjection"
                    checked={form.includeInIncomeProjection} onChange={handleChange}
                    className="accent-indigo-600 w-4 h-4" />
                  <span className="text-sm text-gray-700">
                    Inclure dans la projection des revenus complémentaires
                  </span>
                </label>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-between mt-2">
                {!isEdit && (
                  <button type="button" onClick={() => setStep(1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
                    ← Retour
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
                    Annuler
                  </button>
                  <button type="submit" disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
                    {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
