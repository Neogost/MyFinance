import { useState } from 'react'
import { createPortal } from 'react-dom'
import { getOrders } from '../../api/patrimoine'
import { CATEGORY_META, FISCAL_ENVELOPE_LABELS } from './constants'

const ORDER_TYPE_LABELS = {
  DEPOSIT:    'Dépôt',
  WITHDRAWAL: 'Retrait',
  BUY:        'Achat',
  SELL:       'Vente',
  INTEREST:   'Intérêts',
  DIVIDEND:   'Dividende',
  AIRDROP:    'Airdrop',
  ABONDEMENT: 'Abondement',
}

const OWNERSHIP_LABELS = {
  PLEINE_PROPRIETE: 'Pleine propriété',
  NUE_PROPRIETE:    'Nue-propriété',
  USUFRUIT:         'Usufruit',
}

const CATEGORY_ORDER = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']

function csvCell(val) {
  if (val == null || val === '') return ''
  return `"${String(val).replace(/"/g, '""')}"`
}

function csvRow(cells) {
  return cells.map(csvCell).join(';')
}

function buildPositionsCsv(positions) {
  const headers = [
    'Nom', 'Partenaire', 'Catégorie', 'Sous-type', 'Enveloppe fiscale',
    'Statut', 'Propriété', 'ISIN', 'Ticker', 'Devise',
    'Quantité', 'Prix unitaire (€)', 'Valeur actuelle (€)',
    'Montant investi (€)', 'Plus-value (€)', 'Plus-value (%)',
    'Date création', 'Date clôture',
  ]
  const rows = positions.map(p => {
    const c = p.computed ?? {}
    return csvRow([
      p.label,
      p.partner ?? '',
      CATEGORY_META[p.category]?.label ?? p.category,
      p.assetSubType ?? '',
      FISCAL_ENVELOPE_LABELS[p.fiscalEnvelope]?.label ?? p.fiscalEnvelope ?? '',
      p.status === 'ACTIVE' ? 'Active' : 'Clôturée',
      OWNERSHIP_LABELS[p.ownershipType] ?? p.ownershipType ?? '',
      p.instrument?.isin ?? '',
      p.instrument?.ticker ?? '',
      p.instrument?.currency ?? '',
      c.quantity != null ? String(c.quantity).replace('.', ',') : '',
      c.unitPriceEur != null ? String(parseFloat(c.unitPriceEur).toFixed(4)).replace('.', ',') : '',
      c.currentValueEur != null ? String(parseFloat(c.currentValueEur).toFixed(2)).replace('.', ',') : '',
      c.investedAmountEur != null ? String(parseFloat(c.investedAmountEur).toFixed(2)).replace('.', ',') : '',
      c.capitalGainEur != null ? String(parseFloat(c.capitalGainEur).toFixed(2)).replace('.', ',') : '',
      c.capitalGainPct != null ? String(parseFloat(c.capitalGainPct).toFixed(2)).replace('.', ',') : '',
      p.createdAt ? p.createdAt.substring(0, 10) : '',
      p.closedAt ? p.closedAt.substring(0, 10) : '',
    ])
  })
  return [csvRow(headers), ...rows].join('\r\n')
}

function buildMouvementsCsv(positions, ordersByPositionId) {
  const headers = [
    'Position', 'Catégorie', 'Type', 'Date',
    'Quantité', 'Prix unitaire', 'Montant (€)', 'Taux de change', 'Frais', 'Notes',
  ]
  const rows = []
  for (const pos of positions) {
    const orders = ordersByPositionId[pos.id] ?? []
    for (const o of orders) {
      rows.push(csvRow([
        pos.label,
        CATEGORY_META[pos.category]?.label ?? pos.category,
        ORDER_TYPE_LABELS[o.orderType] ?? o.orderType,
        o.orderDate ?? '',
        o.quantity != null ? String(o.quantity).replace('.', ',') : '',
        o.unitPrice != null ? String(parseFloat(o.unitPrice).toFixed(4)).replace('.', ',') : '',
        o.amount != null ? String(parseFloat(o.amount).toFixed(2)).replace('.', ',') : '',
        o.exchangeRate != null ? String(parseFloat(o.exchangeRate).toFixed(6)).replace('.', ',') : '',
        o.fees != null ? String(parseFloat(o.fees).toFixed(2)).replace('.', ',') : '',
        o.notes ?? '',
      ]))
    }
  }
  return [csvRow(headers), ...rows].join('\r\n')
}

function triggerDownload(content, filename) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ExportCsvModal({ positions, onClose, onTrackEvent }) {
  const [mode, setMode]               = useState('all')          // 'all' | 'selection'
  const [includeClosed, setIncludeClosed] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [exporting, setExporting]     = useState(false)
  const [error, setError]             = useState(null)

  const today = new Date().toISOString().substring(0, 10)

  const displayPositions = positions
    .filter(p => includeClosed || p.status === 'ACTIVE')
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))

  const byCategory = CATEGORY_ORDER
    .map(cat => ({ cat, items: displayPositions.filter(p => p.category === cat) }))
    .filter(g => g.items.length > 0)

  const allIds = new Set(displayPositions.map(p => p.id))
  const allSelected = allIds.size > 0 && [...allIds].every(id => selectedIds.has(id))

  function toggleId(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allIds))
  }

  const targetPositions = mode === 'all'
    ? displayPositions
    : displayPositions.filter(p => selectedIds.has(p.id))

  const canExport = targetPositions.length > 0 && !exporting

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const ordersByPositionId = {}
      await Promise.all(
        targetPositions.map(async p => {
          try {
            ordersByPositionId[p.id] = await getOrders(p.id)
          } catch {
            ordersByPositionId[p.id] = []
          }
        })
      )

      const positionsCsv   = buildPositionsCsv(targetPositions)
      const mouvementsCsv  = buildMouvementsCsv(targetPositions, ordersByPositionId)

      triggerDownload(positionsCsv,  `positions_${today}.csv`)
      // Petit délai pour que le navigateur ne bloque pas le second téléchargement
      await new Promise(r => setTimeout(r, 200))
      triggerDownload(mouvementsCsv, `mouvements_${today}.csv`)

      onTrackEvent?.('FEATURE_USE', 'patrimoine.export.csv', {
        mode,
        count: String(targetPositions.length),
      })
      onClose()
    } catch {
      setError('Une erreur est survenue lors de l\'export.')
    } finally {
      setExporting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={!exporting ? onClose : undefined} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Exporter en CSV</h3>
          {!exporting && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

          {/* Choix du mode */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-gray-700">Que souhaitez-vous exporter ?</p>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              <input
                type="radio" name="mode" value="all"
                checked={mode === 'all'}
                onChange={() => setMode('all')}
                className="mt-0.5 text-indigo-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Tout exporter</p>
                <p className="text-xs text-gray-500">Toutes vos positions et leurs mouvements associés</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              <input
                type="radio" name="mode" value="selection"
                checked={mode === 'selection'}
                onChange={() => setMode('selection')}
                className="mt-0.5 text-indigo-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Sélectionner des positions</p>
                <p className="text-xs text-gray-500">Choisissez les positions à inclure dans l'export</p>
              </div>
            </label>
          </div>

          {/* Toggle positions clôturées */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeClosed}
              onChange={e => {
                setIncludeClosed(e.target.checked)
                if (!e.target.checked) {
                  setSelectedIds(prev => {
                    const next = new Set(prev)
                    positions.filter(p => p.status === 'CLOSED').forEach(p => next.delete(p.id))
                    return next
                  })
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Inclure les positions clôturées</span>
          </label>

          {/* Liste de sélection */}
          {mode === 'selection' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  Positions ({selectedIds.size} sélectionnée{selectedIds.size !== 1 ? 's' : ''})
                </p>
                <button
                  onClick={toggleAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {byCategory.map(({ cat, items }) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {CATEGORY_META[cat]?.icon} {CATEGORY_META[cat]?.label}
                  </p>
                  <div className="flex flex-col gap-1">
                    {items.map(p => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleId(p.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        />
                        <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{p.label}</span>
                        {p.status === 'CLOSED' && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">Clôturée</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {displayPositions.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune position à afficher.</p>
              )}
            </div>
          )}

          {/* Info fichiers générés */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500 space-y-0.5">
            <p className="font-semibold text-gray-600 mb-1">Fichiers générés</p>
            <p>· <span className="font-mono">positions_{today}.csv</span> — une ligne par position</p>
            <p>· <span className="font-mono">mouvements_{today}.csv</span> — une ligne par mouvement</p>
            <p className="pt-1 text-gray-400">Format : CSV séparateur point-virgule, encodage UTF-8. Compatible Excel.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-between">
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleExport}
            disabled={!canExport}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {exporting
              ? 'Export en cours…'
              : `Exporter (${targetPositions.length} position${targetPositions.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
