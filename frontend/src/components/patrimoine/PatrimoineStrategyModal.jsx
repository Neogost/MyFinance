import { useState, useMemo, useEffect } from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import { savePatrimoineTargets, getBreakdown } from '../../api/patrimoine'
import { CATEGORY_META } from './constants'

const CATEGORY_ORDER = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']

// Catégories où un plafond (max) est pertinent
const MAX_TARGET_CATEGORIES = ['LIQUIDITE', 'LIVRET']

const CATEGORY_DIMENSIONS = {
  IMMO_PHYSIQUE: [
    {
      dimension: 'PROPERTY_USAGE',
      title: 'Répartition RP / Locatif',
      placeholder: 'Usage (ex : RESIDENCE_PRINCIPALE)',
      actualKey: 'propertyUsage',
      staticSuggestions: ['RESIDENCE_PRINCIPALE', 'LOCATIF', 'SECONDAIRE_LOISIRS', 'AUTRE'],
    },
  ],
  BOURSE: [
    {
      dimension: 'SECTOR',
      title: 'Diversification sectorielle',
      placeholder: 'Secteur (ex : Technology)',
      actualKey: 'sector',
      staticSuggestions: ['Technology', 'Financial Services', 'Healthcare', 'Consumer Cyclical',
        'Industrials', 'Real Estate', 'Energy', 'Basic Materials', 'Utilities', 'Communication Services'],
    },
    {
      dimension: 'COUNTRY',
      title: 'Diversification géographique',
      placeholder: 'Pays (ex : Etats-Unis)',
      actualKey: 'country',
      staticSuggestions: ['Etats-Unis', 'France', 'Allemagne', 'Japon', 'Royaume-Uni',
        'Suisse', 'Pays-Bas', 'Australie', 'Corée du Sud', 'Canada'],
    },
    {
      dimension: 'CONTINENT',
      title: 'Diversification par continent',
      placeholder: 'Continent (ex : Europe)',
      actualKey: 'continent',
      staticSuggestions: ['Amérique du Nord', 'Europe', 'Asie-Pacifique',
        'Amérique latine', 'Moyen-Orient & Afrique'],
    },
    {
      dimension: 'CURRENCY',
      title: 'Répartition par devise',
      placeholder: 'Devise ISO (ex : EUR)',
      actualKey: 'bourseCurrency',
      staticSuggestions: ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK'],
    },
    {
      dimension: 'ASSET_SUBTYPE',
      title: "Répartition par type d'actif",
      placeholder: 'Type (ex : ETF)',
      actualKey: 'assetSubType',
      staticSuggestions: ['ETF', 'ACTION', 'OBLIGATION', 'SCPI', 'FONDS_EUROS', 'TRACKERS'],
    },
  ],
  CRYPTO: [
    {
      dimension: 'CRYPTO_TYPE',
      title: 'Type de crypto',
      placeholder: 'Type (ex : STABLECOIN)',
      actualKey: 'cryptoType',
      staticSuggestions: ['STABLECOIN', 'STORE_OF_VALUE', 'SMART_CONTRACT', 'LAYER_2', 'DEFI', 'OTHER'],
    },
    {
      dimension: 'CRYPTO_NETWORK',
      title: 'Réseau / Blockchain',
      placeholder: 'Réseau (ex : ETHEREUM)',
      actualKey: 'cryptoNetwork',
      staticSuggestions: ['BITCOIN', 'ETHEREUM', 'SOLANA', 'POLYGON', 'AVALANCHE',
        'BNB_CHAIN', 'ARBITRUM', 'OPTIMISM', 'BASE', 'OTHER'],
    },
    {
      dimension: 'INSTRUMENT',
      title: 'Par instrument (crypto)',
      placeholder: 'Ticker (ex : BTC)',
      actualKey: 'cryptoInstrument',
      staticSuggestions: [],
    },
  ],
}

function newRow(dim) {
  return { dimension: dim, key: '', targetPercentage: '' }
}

function BreakdownDimensionEditor({ config, rows, onRowsChange, suggestions }) {
  const [expanded, setExpanded] = useState(rows.length > 0)

  const sum = rows.reduce((s, r) => {
    const v = parseFloat(r.targetPercentage)
    return s + (isNaN(v) ? 0 : v)
  }, 0)
  const over = sum > 100

  const usedKeys = new Set(rows.map(r => r.key.trim().toLowerCase()).filter(k => k))

  // Fusionner suggestions du portefeuille + statiques, dédoublonner, exclure déjà utilisées
  const portfolioSuggestions = (suggestions ?? []).filter(s => s && s !== 'Non classé')
  const staticSuggestions    = (config.staticSuggestions ?? [])
  const allSuggestions = [...new Set([...portfolioSuggestions, ...staticSuggestions])]
  const availableSuggestions = allSuggestions.filter(s => !usedKeys.has(s.toLowerCase()))

  function update(idx, patch) {
    onRowsChange(rows.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function add(prefilledKey) {
    onRowsChange([...rows, { ...newRow(config.dimension), key: prefilledKey ?? '' }])
  }

  function remove(idx) {
    onRowsChange(rows.filter((_, i) => i !== idx))
  }

  return (
    <div className="ml-9 mt-2">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
      >
        {expanded ? '▾' : '▸'} {config.title} ({rows.length})
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
          {rows.length === 0 && (
            <p className="text-xs text-gray-500 italic">
              Aucun objectif défini. Ajoutez des entrées ci-dessous pour suivre cette dimension.
            </p>
          )}

          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={config.placeholder}
                value={row.key}
                onChange={e => update(idx, { key: e.target.value })}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="0"
                  value={row.targetPercentage}
                  onChange={e => update(idx, { targetPercentage: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
              </div>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-gray-400 hover:text-red-500 text-sm w-5 text-center"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}

          {availableSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              <span className="text-[10px] text-gray-500 mr-1 self-center">Suggestions :</span>
              {availableSuggestions.slice(0, 6).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => add(s)}
                  className="text-[10px] px-2 py-0.5 bg-white border border-gray-300 rounded-full text-gray-700 hover:bg-indigo-50 hover:border-indigo-300"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => add()}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              + Ajouter une entrée
            </button>
            <div className={`text-[11px] font-medium ${over ? 'text-red-600' : 'text-gray-600'}`}>
              Total : {sum.toFixed(0)} %
              {!over && sum < 100 && rows.length > 0 && (
                <span className="text-gray-400"> · {(100 - sum).toFixed(0)} % non alloué</span>
              )}
              {over && <span> · dépassement de {(sum - 100).toFixed(0)} pts</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PatrimoineStrategyModal({
  onClose,
  targets,
  maxTargets,
  breakdowns,
  sectorBreakdown,
  actualBreakdowns,
  onSave,
}) {
  const [inputs, setInputs] = useState(() => {
    const init = {}
    CATEGORY_ORDER.forEach(cat => {
      init[cat] = targets?.[cat] != null ? String(targets[cat]) : ''
    })
    return init
  })

  // Plafonds (max) pour LIQUIDITE et LIVRET
  const [maxInputs, setMaxInputs] = useState(() => {
    const init = {}
    MAX_TARGET_CATEGORIES.forEach(cat => {
      init[cat] = maxTargets?.[cat] != null ? String(maxTargets[cat]) : ''
    })
    return init
  })

  // rows par catégorie et dimension : { BOURSE: { SECTOR: [...], ... }, CRYPTO: { CRYPTO_TYPE: [...], ... } }
  const [rowsByCatDim, setRowsByCatDim] = useState(() => {
    const init = {}
    Object.entries(CATEGORY_DIMENSIONS).forEach(([cat, dims]) => {
      init[cat] = {}
      dims.forEach(({ dimension }) => {
        const existing = (breakdowns?.[cat] ?? []).filter(b => b.dimension === dimension)
        init[cat][dimension] = existing.map(b => ({
          dimension,
          key: b.key,
          targetPercentage: String(b.targetPercentage),
        }))
      })
    })
    return init
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [cryptoInstrumentBreakdown, setCryptoInstrumentBreakdown] = useState(null)
  const { trackEvent } = useAnalytics()

  useEffect(() => {
    getBreakdown('INSTRUMENT', 'CRYPTO')
      .then(data => setCryptoInstrumentBreakdown(data))
      .catch(() => {})
  }, [])

  const suggestionsByDim = useMemo(() => {
    const merged = { ...(actualBreakdowns ?? {}) }
    if (!merged.sector && sectorBreakdown) merged.sector = sectorBreakdown
    if (cryptoInstrumentBreakdown) merged.cryptoInstrument = cryptoInstrumentBreakdown
    const result = {}
    Object.values(CATEGORY_DIMENSIONS).flat().forEach(({ dimension, actualKey }) => {
      const breakdown = merged[actualKey]?.breakdown ?? []
      result[dimension] = breakdown.map(b => b.key).filter(k => k && k !== 'Non classé')
    })
    return result
  }, [actualBreakdowns, sectorBreakdown, cryptoInstrumentBreakdown])

  const overallOver = Object.entries(CATEGORY_DIMENSIONS).some(([cat, dims]) =>
    dims.some(({ dimension }) => {
      const rows = rowsByCatDim[cat]?.[dimension] ?? []
      const sum = rows.reduce((s, r) => {
        const v = parseFloat(r.targetPercentage)
        return s + (isNaN(v) ? 0 : v)
      }, 0)
      return sum > 100
    })
  )

  function canEditDimensions(cat) {
    const v = parseFloat(inputs[cat])
    return !isNaN(v) && v > 0
  }

  function setRowsForCatDim(cat, dim, rows) {
    setRowsByCatDim(prev => ({ ...prev, [cat]: { ...prev[cat], [dim]: rows } }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const targetsPayload = {}
      CATEGORY_ORDER.forEach(cat => {
        const v = parseFloat(inputs[cat])
        if (!isNaN(v) && v > 0) targetsPayload[cat] = v
      })

      const breakdownsPayload = {}
      Object.entries(CATEGORY_DIMENSIONS).forEach(([cat, dims]) => {
        if (!targetsPayload[cat]) return
        const all = []
        dims.forEach(({ dimension }) => {
          ;(rowsByCatDim[cat]?.[dimension] ?? [])
            .filter(r => r.key.trim() && parseFloat(r.targetPercentage) > 0)
            .forEach(r => all.push({
              dimension,
              key: r.key.trim(),
              targetPercentage: parseFloat(r.targetPercentage),
            }))
        })
        if (all.length > 0) breakdownsPayload[cat] = all
      })

      const maxTargetsPayload = {}
      MAX_TARGET_CATEGORIES.forEach(cat => {
        const v = parseFloat(maxInputs[cat])
        if (!isNaN(v) && v > 0) maxTargetsPayload[cat] = v
      })

      const updated = await savePatrimoineTargets({
        targets: targetsPayload,
        maxTargets: maxTargetsPayload,
        breakdowns: breakdownsPayload,
      })
      trackEvent('FEATURE_USE', 'patrimoine.strategy.save')
      onSave(updated)
      onClose()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data || 'Impossible d\'enregistrer les objectifs.'
      setError(typeof msg === 'string' ? msg : 'Impossible d\'enregistrer les objectifs.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Stratégie & Objectifs patrimoniaux</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          Définissez un montant cible par catégorie. Sur Liquidités et Livret, vous pouvez aussi fixer un plafond à ne pas dépasser. Sur Bourse, Crypto et Immobilier physique, des objectifs de répartition sont disponibles.
        </p>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="space-y-3">
          {CATEGORY_ORDER.map(cat => {
            const meta = CATEGORY_META[cat]
            const dims = CATEGORY_DIMENSIONS[cat]
            return (
              <div key={cat}>
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{meta.icon}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-28 text-center shrink-0 ${meta.color}`}>
                    {meta.label}
                  </span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="Pas d'objectif"
                      value={inputs[cat]}
                      onChange={e => setInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                  </div>
                </div>

                {/* Plafond (max) — LIQUIDITE et LIVRET */}
                {MAX_TARGET_CATEGORIES.includes(cat) && canEditDimensions(cat) && (
                  <div className="ml-9 mt-2">
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs font-semibold text-amber-800 mb-2">
                        🔔 Plafond à ne pas dépasser
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            placeholder="Pas de plafond"
                            value={maxInputs[cat] ?? ''}
                            onChange={e => setMaxInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                            className="w-full border border-amber-300 bg-white rounded px-3 py-1.5 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-500">€</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-600 mt-1">
                        Une alerte s'affiche si la valeur dépasse ce montant.
                      </p>
                    </div>
                  </div>
                )}

                {dims && canEditDimensions(cat) && (
                  <div className="space-y-1">
                    {dims.map(config => (
                      <BreakdownDimensionEditor
                        key={config.dimension}
                        config={config}
                        rows={rowsByCatDim[cat]?.[config.dimension] ?? []}
                        onRowsChange={rows => setRowsForCatDim(cat, config.dimension, rows)}
                        suggestions={suggestionsByDim[config.dimension]}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || overallOver}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
