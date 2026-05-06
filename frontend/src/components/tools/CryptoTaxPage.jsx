import { useState, useEffect, useCallback } from 'react'
import {
  getCryptoTaxState,
  getCryptoTaxSummary,
  getCryptoCessions,
  confirmCryptoHistory,
  exportCryptoTaxCsv,
} from '../../api/cryptoTax'
import { useAnalytics } from '../../hooks/useAnalytics'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i)
const LS_KEY = 'myfinance_crypto_tax_manual_ops'

function fmt(v, digits = 2) {
  if (v == null) return '—'
  return Number(v).toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }) + ' €'
}

function KpiCard({ label, value, sub, colorClass = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function InfoTooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block ml-1 align-middle">
      <button type="button"
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold leading-none flex items-center justify-center hover:bg-gray-300"
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>?</button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </span>
  )
}

// ── Simulateur hypothétique ────────────────────────────────────

function HypotheticalSimulator({ currentPta, taxOption, tmi }) {
  const [sellAmount, setSellAmount] = useState('')
  const [portfolioValue, setPortfolioValue] = useState('')

  const pc  = parseFloat(sellAmount)
  const vgp = parseFloat(portfolioValue)
  const pta = parseFloat(currentPta) || 0

  const valid = !isNaN(pc) && !isNaN(vgp) && pc > 0 && vgp > 0
  const vgpTooLow = valid && vgp < pc

  let pv = null, tax = null
  if (valid && !vgpTooLow) {
    pv = pc - (pta * pc / vgp)
    const pvPositive = Math.max(0, pv)
    if (taxOption === 'BAREME' && tmi != null) {
      tax = pvPositive * ((tmi / 100) + 0.172)
    } else {
      tax = pvPositive * 0.314
    }
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-indigo-800 mb-3">
        🧮 Simuler une cession hypothétique
      </p>
      <p className="text-xs text-indigo-600 mb-4">
        PTA actuel : <strong>{fmt(pta)}</strong> — base de coût restante à déduire
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-indigo-700">Je vends (€)</label>
          <input type="number" min="0.01" step="0.01" value={sellAmount}
            onChange={e => setSellAmount(e.target.value)}
            placeholder="ex : 5 000" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
            Mon portefeuille vaut (€)
            <InfoTooltip text="Valeur totale de TOUTES vos cryptos à ce moment-là (BTC + ETH + USDC + …), pas seulement celle que vous vendez." />
          </label>
          <input type="number" min="0.01" step="0.01" value={portfolioValue}
            onChange={e => setPortfolioValue(e.target.value)}
            placeholder="ex : 20 000" className={inputCls} />
        </div>
      </div>
      {vgpTooLow && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          ⚠ La valeur du portefeuille ne peut pas être inférieure au montant vendu.
        </p>
      )}
      {valid && !vgpTooLow && pv !== null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Partie récupération', value: pc - Math.max(0, pv), color: 'text-gray-700' },
            { label: 'Plus-value imposable', value: Math.max(0, pv), color: pv > 0 ? 'text-red-600' : 'text-green-600' },
            { label: 'Impôt estimé', value: tax, color: 'text-orange-700' },
            { label: 'Net après impôt', value: pc - tax, color: 'text-indigo-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg p-3 border border-indigo-100">
              <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
              <p className={`text-base font-bold ${color}`}>{fmt(value)}</p>
            </div>
          ))}
        </div>
      )}
      {!valid && (
        <p className="text-xs text-indigo-400 text-center py-2">
          Renseignez les deux montants pour voir le résultat.
        </p>
      )}
    </div>
  )
}

// ── Algorithme fiscal (PTA + PV) ────────────────────────────────

const CRYPTO_OP_LABELS = {
  BUY_FIAT:     'Achat (fiat)',
  SELL_FIAT:    'Vente (fiat)',
  SWAP_OUT:     'Échange sortant',
  SWAP_IN:      'Échange entrant',
  TRANSFER_IN:  'Réception',
  TRANSFER_OUT: 'Envoi',
}

function computeCryptoTax(ops, year, taxOption, tmi) {
  const sorted = [...ops].sort((a, b) => a.date.localeCompare(b.date))
  let pta = 0
  const allCessions = []
  const warnings = []

  for (const op of sorted) {
    if (op.type === 'BUY_FIAT') {
      pta += op.amountEur
    } else if (op.type === 'SELL_FIAT') {
      const pc  = op.amountEur
      const vgp = op.vgpEur
      if (!vgp || vgp <= 0) {
        warnings.push(`VGP manquante pour la cession du ${op.date} — cession ignorée.`)
        continue
      }
      const ptaBefore = pta
      const ptaShare  = pta * pc / vgp
      const pv        = pc - ptaShare
      pta             = Math.max(0, pta - ptaShare)
      allCessions.push({ op, ptaBefore, ptaAfter: pta, pv, pc, vgp })
    }
    // SWAP_OUT/IN, TRANSFER_IN/OUT : PTA inchangé
  }

  const cessionsYear = allCessions.filter(c => c.op.date.startsWith(String(year)))

  const totalCessions   = cessionsYear.reduce((s, c) => s + c.pc, 0)
  const totalPlusValue  = cessionsYear.filter(c => c.pv >= 0).reduce((s, c) => s + c.pv, 0)
  const totalMoinsValue = cessionsYear.filter(c => c.pv < 0).reduce((s, c) => s + Math.abs(c.pv), 0)
  const pvNette         = Math.max(0, totalPlusValue - totalMoinsValue)
  const exempt          = totalCessions <= 305

  let estimatedTax = 0
  if (!exempt) {
    if (taxOption === 'BAREME' && tmi != null) {
      estimatedTax = pvNette * ((tmi / 100) + 0.172)
    } else {
      estimatedTax = pvNette * 0.30
    }
  }

  // PTA au début de l'année
  const sortedBeforeYear = [...ops]
    .filter(o => o.date < `${year}-01-01`)
    .sort((a, b) => a.date.localeCompare(b.date))
  let ptaStart = 0
  for (const op of sortedBeforeYear) {
    if (op.type === 'BUY_FIAT') ptaStart += op.amountEur
    else if (op.type === 'SELL_FIAT' && op.vgpEur > 0) {
      ptaStart = Math.max(0, ptaStart - ptaStart * op.amountEur / op.vgpEur)
    }
  }

  return {
    ptaAtYearStart:   ptaStart,
    ptaAtYearEnd:     pta,
    totalCessions,
    totalPlusValue,
    totalMoinsValue,
    pvNette,
    exempt,
    declarationRequired: !exempt && pvNette > 0,
    estimatedTax,
    cessionsYear,
    warnings,
  }
}

// ── Formulaire de saisie manuelle ──────────────────────────────

const EMPTY_OP = { date: new Date().toISOString().slice(0, 10), type: 'BUY_FIAT', label: '', amountEur: '', vgpEur: '', notes: '' }

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-xs font-semibold text-gray-600'

function ManualOpForm({ op, onSave, onCancel }) {
  const [form, setForm] = useState(op ? { ...op } : { ...EMPTY_OP })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const isSell   = form.type === 'SELL_FIAT'
  const vgpTooLow = isSell
    && form.vgpEur !== '' && form.amountEur !== ''
    && parseFloat(form.vgpEur) < parseFloat(form.amountEur)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.date || !form.type || form.amountEur === '') return
    if (vgpTooLow) return
    onSave({
      ...form,
      id:        form.id ?? crypto.randomUUID(),
      amountEur: parseFloat(form.amountEur),
      vgpEur:    form.vgpEur !== '' ? parseFloat(form.vgpEur) : null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          {op ? 'Modifier l\'opération' : 'Ajouter une opération'}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date *</label>
              <input name="date" type="date" value={form.date}
                onChange={handleChange} required className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Type *</label>
              <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                {Object.entries(CRYPTO_OP_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {isSell && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 space-y-1">
              <p className="text-xs text-orange-700 font-semibold">⚠ Opération imposable</p>
              <p className="text-xs text-orange-600">
                La <strong>VGP</strong> = valeur de <strong>toutes</strong> vos cryptos à cette date (BTC + ETH + USDC…), pas seulement celle que vous vendez. Consultez votre exchange pour ce total.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Libellé (crypto)</label>
            <input name="label" type="text" value={form.label}
              onChange={handleChange} placeholder="ex : Bitcoin, ETH…" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Montant EUR *</label>
              <input name="amountEur" type="number" min="0.01" step="0.01"
                value={form.amountEur} onChange={handleChange} required
                placeholder="ex : 1000" className={inputCls} />
            </div>
            {isSell && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>
                  VGP *
                  <InfoTooltip text="Valeur Globale du Portefeuille — somme de TOUTES vos cryptos en EUR à cette date (BTC + ETH + USDC…). Obligatoire pour le calcul de la plus-value." />
                </label>
                <input name="vgpEur" type="number" min="0.01" step="0.01"
                  value={form.vgpEur} onChange={handleChange} required={isSell}
                  placeholder="ex : 15000" className={`${inputCls} ${vgpTooLow ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} />
                {vgpTooLow && (
                  <p className="text-xs text-red-600">
                    La VGP ne peut pas être inférieure au montant vendu ({form.amountEur} €).
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Note</label>
            <input name="notes" type="text" value={form.notes}
              onChange={handleChange}
              placeholder="Exchange, hash de transaction, motif…"
              className={inputCls} />
          </div>

          <div className="flex justify-end gap-3 mt-1">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400">
              Annuler
            </button>
            <button type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
              {op ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Mode manuel ─────────────────────────────────────────────────

const OP_BADGE = {
  BUY_FIAT:     'bg-blue-100 text-blue-700',
  SELL_FIAT:    'bg-orange-100 text-orange-700',
  SWAP_OUT:     'bg-amber-100 text-amber-700',
  SWAP_IN:      'bg-amber-100 text-amber-700',
  TRANSFER_IN:  'bg-teal-100 text-teal-700',
  TRANSFER_OUT: 'bg-teal-100 text-teal-700',
}

function ManualMode({ year, taxOption, tmi }) {
  const [ops, setOps]           = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? [] } catch { return [] }
  })
  const [formOp, setFormOp]     = useState(undefined) // undefined=fermé, null=nouveau, obj=édition
  const [showCessions, setShowCessions] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(ops))
  }, [ops])

  function saveOp(saved) {
    setOps(prev => {
      const exists = prev.find(o => o.id === saved.id)
      return exists ? prev.map(o => o.id === saved.id ? saved : o) : [...prev, saved]
    })
    setFormOp(undefined)
  }

  function deleteOp(id) {
    setOps(prev => prev.filter(o => o.id !== id))
  }

  const result = computeCryptoTax(ops, year, taxOption, tmi)
  const threshold305Pct = Math.min(100, (result.totalCessions / 305) * 100)

  function exportCsv() {
    setExporting(true)
    const lines = ['N°,Date de cession,VGP,Prix de cession (PC),PTA avant,Plus-value,Notes']
    result.cessionsYear.forEach((c, i) => {
      lines.push([
        i + 1, c.op.date,
        c.vgp?.toFixed(2) ?? '',
        c.pc.toFixed(2),
        c.ptaBefore.toFixed(2),
        c.pv.toFixed(2),
        (c.op.notes ?? '').replace(',', ';'),
      ].join(','))
    })
    lines.push(`TOTAL,,,${result.totalCessions.toFixed(2)},,${result.pvNette.toFixed(2)},`)
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `fiscalite-crypto-2086-manuel-${year}.csv`; a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const sortedOps = [...ops].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="flex flex-col gap-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total des cessions" value={fmt(result.totalCessions)}
          sub={`${result.cessionsYear.length} cession(s)`} />
        <KpiCard label="Plus-value nette imposable" value={fmt(result.pvNette)}
          colorClass={result.pvNette > 0 ? 'text-red-600' : 'text-green-600'} />
        <KpiCard label="Impôt estimé"
          value={result.exempt ? 'Exonéré' : fmt(result.estimatedTax)}
          sub={result.exempt ? 'Seuil 305 € non atteint' : (taxOption === 'BAREME' ? 'Barème IR' : 'PFU 31,4 %')}
          colorClass={result.exempt ? 'text-green-600' : 'text-gray-900'} />
        <KpiCard label="PTA restant" value={fmt(result.ptaAtYearEnd)} sub="Base de coût cumulée" />
      </div>

      {/* Simulateur hypothétique */}
      <HypotheticalSimulator currentPta={result.ptaAtYearEnd} taxOption={taxOption} tmi={tmi} />

      {/* Seuil 305 € */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Seuil d'exonération 305 €</span>
          <span className="text-sm font-bold">{fmt(result.totalCessions, 0)} / 305 €</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${threshold305Pct >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${Math.min(threshold305Pct, 100)}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {result.exempt ? '✓ En dessous du seuil — pas d\'obligation déclarative' : '✗ Seuil dépassé — déclaration 2086 requise'}
        </p>
      </div>

      {/* Avertissements */}
      {result.warnings.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-800 mb-1">Avertissements</p>
          <ul className="text-xs text-orange-700 space-y-1 list-disc list-inside">
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Tableau des cessions de l'année */}
      {result.cessionsYear.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <button onClick={() => setShowCessions(v => !v)}
              className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span>{showCessions ? '▼' : '▶'}</span>
              Cessions {year} ({result.cessionsYear.length})
            </button>
            <button onClick={exportCsv} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {exporting ? 'Export…' : '⬇ Exporter CSV 2086'}
            </button>
          </div>
          {showCessions && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Crypto</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500">PC</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500">PTA avant</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500">VGP</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-500">Plus-value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cessionsYear.map((c, i) => (
                    <tr key={c.op.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-700">{c.op.date}</td>
                      <td className="px-3 py-2 text-gray-700">{c.op.label || '—'}</td>
                      <td className="px-3 py-2 text-right">{fmt(c.pc)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{fmt(c.ptaBefore)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{fmt(c.vgp)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${c.pv >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {fmt(c.pv)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                    <td className="px-3 py-2 text-right">{fmt(result.totalCessions)}</td>
                    <td colSpan={2} />
                    <td className={`px-3 py-2 text-right ${result.pvNette >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(result.pvNette)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Liste de toutes les opérations */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">
            Toutes les opérations ({ops.length})
          </p>
          <button onClick={() => setFormOp(null)}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            + Ajouter
          </button>
        </div>

        {sortedOps.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm">Aucune opération saisie.</p>
            <p className="text-xs mt-1">Cliquez sur « + Ajouter » pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Type</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Crypto</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500">Montant EUR</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500">VGP</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Note</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {sortedOps.map((op, i) => (
                  <tr key={op.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-700">{op.date}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${OP_BADGE[op.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CRYPTO_OP_LABELS[op.type] ?? op.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{op.label || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmt(op.amountEur)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{op.vgpEur ? fmt(op.vgpEur) : '—'}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs max-w-32 truncate">{op.notes || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => setFormOp(op)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600">
                          Modifier
                        </button>
                        <button onClick={() => deleteOp(op.id)}
                          className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-400 hover:border-red-400 hover:text-red-500">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ops.length > 0 && (
          <div className="p-3 border-t border-gray-100 flex justify-end">
            <button onClick={() => { if (confirm('Vider toutes les opérations ?')) setOps([]) }}
              className="text-xs text-gray-400 hover:text-red-500 underline">
              Vider toutes les opérations
            </button>
          </div>
        )}
      </div>

      {formOp !== undefined && (
        <ManualOpForm
          op={formOp}
          onSave={saveOp}
          onCancel={() => setFormOp(undefined)}
        />
      )}
    </div>
  )
}

// ── Mode connecté ───────────────────────────────────────────────

function ConnectedMode({ year, taxOption, tmi }) {
  const [state, setState]   = useState(null)
  const [summary, setSummary] = useState(null)
  const [cessions, setCessions] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [exporting, setExporting] = useState(false)
  const [showCessions, setShowCessions] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [s, summ, cess] = await Promise.all([
        getCryptoTaxState(),
        getCryptoTaxSummary({ year, taxOption, tmi }),
        getCryptoCessions(year),
      ])
      setState(s); setSummary(summ); setCessions(cess)
    } catch {
      setError('Erreur lors du chargement des données fiscales crypto.')
    } finally {
      setLoading(false)
    }
  }, [year, taxOption, tmi])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleConfirmHistory(value) {
    await confirmCryptoHistory(value)
    setState(prev => ({ ...prev, historicalDataConfirmed: value }))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportCryptoTaxCsv(year)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `fiscalite-crypto-2086-${year}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Erreur lors de l\'export CSV.')
    } finally { setExporting(false) }
  }

  const threshold305 = summary ? Number(summary.totalCessionsEur) : 0
  const threshold305Pct = Math.min(100, (threshold305 / 305) * 100)

  return (
    <>
      {/* Bandeau historique */}
      {state && !state.historicalDataConfirmed && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">⚠ Historique complet non confirmé — calculs en mode brouillon</p>
            <p className="text-xs text-amber-700 mt-0.5">Pour que le calcul du PTA soit juste, saisissez toutes vos opérations depuis le tout premier achat.</p>
          </div>
          <button onClick={() => handleConfirmHistory(true)}
            className="shrink-0 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700">
            Confirmer l'historique complet
          </button>
        </div>
      )}
      {state?.historicalDataConfirmed && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm text-green-700">✓ Historique complet confirmé — calculs officiels</p>
          <button onClick={() => handleConfirmHistory(false)} className="text-xs text-green-600 underline">Retirer</button>
        </div>
      )}

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Calcul en cours…</div>
      ) : summary && (
        <div className="flex flex-col gap-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total des cessions" value={fmt(summary.totalCessionsEur)} sub={`${summary.cessionsCount} cession(s)`} />
            <KpiCard label="Plus-value nette imposable" value={fmt(summary.plusValueNetteImposable)}
              colorClass={Number(summary.plusValueNetteImposable) > 0 ? 'text-red-600' : 'text-green-600'} />
            <KpiCard label="Impôt estimé"
              value={summary.exemptedBy305Threshold ? 'Exonéré' : fmt(summary.estimatedTaxEur)}
              sub={summary.exemptedBy305Threshold ? 'Seuil 305 € non atteint' : summary.taxOption}
              colorClass={summary.exemptedBy305Threshold ? 'text-green-600' : 'text-gray-900'} />
            <KpiCard label="PTA restant" value={fmt(summary.ptaAtYearEnd)} sub="Base de coût cumulée" />
          </div>

          {/* Simulateur hypothétique */}
          <HypotheticalSimulator currentPta={state?.currentPta} taxOption={taxOption} tmi={tmi} />

          {/* Seuil 305 € */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center">
                Seuil d'exonération 305 €
                <InfoTooltip text="En dessous de 305 € de cessions annuelles totales, aucun impôt n'est dû et la déclaration 2086 n'est pas obligatoire." />
              </span>
              <span className="text-sm font-bold">{fmt(summary.totalCessionsEur, 0)} / 305 €</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${threshold305Pct >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(threshold305Pct, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary.exemptedBy305Threshold ? '✓ Pas d\'obligation déclarative' : '✗ Seuil dépassé — déclaration 2086 requise'}
            </p>
          </div>

          {/* Avertissements */}
          {summary.warnings?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-orange-800 mb-1">Avertissements de calcul</p>
              <ul className="text-xs text-orange-700 space-y-1 list-disc list-inside">
                {summary.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Tableau des cessions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <button onClick={() => setShowCessions(v => !v)}
                className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span>{showCessions ? '▼' : '▶'}</span>
                Détail des cessions {year} ({cessions.length})
              </button>
              <button onClick={handleExport} disabled={exporting || cessions.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {exporting ? 'Export…' : '⬇ Exporter CSV 2086'}
              </button>
            </div>
            {showCessions && (
              <div className="overflow-x-auto">
                {cessions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Aucune cession en {year}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs text-gray-500">Date</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">Crypto</th>
                        <th className="px-3 py-2 text-right text-xs text-gray-500">PC</th>
                        <th className="px-3 py-2 text-right text-xs text-gray-500">PTA avant</th>
                        <th className="px-3 py-2 text-right text-xs text-gray-500">VGP</th>
                        <th className="px-3 py-2 text-right text-xs text-gray-500">Plus-value</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cessions.map((c, i) => {
                        const pv = Number(c.plusValueEur)
                        return (
                          <tr key={c.orderId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 text-gray-700">{c.cessionDate}</td>
                            <td className="px-3 py-2 text-gray-700">{c.instrumentLabel}</td>
                            <td className="px-3 py-2 text-right">{fmt(c.prixDeCessionEur)}</td>
                            <td className="px-3 py-2 text-right text-gray-500">{fmt(c.ptaAvantCession)}</td>
                            <td className="px-3 py-2 text-right text-gray-500">
                              {c.vgpEur ? fmt(c.vgpEur) : '—'}
                              {c.vgpFromManualOverride && <span className="ml-1 text-[10px] text-orange-500">Manuel</span>}
                            </td>
                            <td className={`px-3 py-2 text-right font-semibold ${pv >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {c.plusValueEur != null ? fmt(c.plusValueEur) : '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-400 text-xs max-w-32 truncate">{c.notes || '—'}</td>
                          </tr>
                        )
                      })}
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                        <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                        <td className="px-3 py-2 text-right">{fmt(summary.totalCessionsEur)}</td>
                        <td colSpan={2} />
                        <td className={`px-3 py-2 text-right ${Number(summary.plusValueNetteImposable) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {fmt(summary.plusValueNetteImposable)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Récap PTA */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-3">Base de coût (PTA)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">PTA au 1er janvier {year}</span>
                <span className="font-medium">{fmt(summary.ptaAtYearStart)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">PTA au 31 décembre {year}</span>
                <span className="font-medium">{fmt(summary.ptaAtYearEnd)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Page principale ─────────────────────────────────────────────

export default function CryptoTaxPage() {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('tools.crypto_tax') }, [])

  const [mode, setMode]           = useState('connected') // 'connected' | 'manual'
  const [year, setYear]           = useState(CURRENT_YEAR)
  const [taxOption, setTaxOption] = useState('PFU')
  const [tmi, setTmi]             = useState('')

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fiscalité crypto — Formulaire 2086</h1>
        <p className="text-sm text-gray-500 mt-1">
          Calcul des plus-values selon la méthode proportionnelle (art. 150 VH bis CGI)
        </p>
      </div>

      {/* Contrôles globaux */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">

        {/* Toggle mode */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Mode</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            <button onClick={() => setMode('connected')}
              className={`px-4 py-2 ${mode === 'connected' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              🔗 Connecté
            </button>
            <button onClick={() => setMode('manual')}
              className={`px-4 py-2 ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              ✏️ Manuel
            </button>
          </div>
        </div>

        {/* Année */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Année fiscale</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Option fiscale */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Option d'imposition</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {['PFU', 'BAREME'].map(opt => (
              <button key={opt} onClick={() => setTaxOption(opt)}
                className={`px-4 py-2 ${taxOption === opt ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                {opt === 'PFU' ? 'PFU 31,4 %' : 'Barème IR'}
              </button>
            ))}
          </div>
        </div>

        {/* TMI (barème uniquement) */}
        {taxOption === 'BAREME' && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">TMI (%)</label>
            <input type="number" min="0" max="45" step="1" value={tmi}
              onChange={e => setTmi(e.target.value)}
              placeholder="ex : 30"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white w-24" />
          </div>
        )}
      </div>

      {/* Bandeau mode manuel */}
      {mode === 'manual' && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-700">
          ✏️ <strong>Mode manuel</strong> — Saisie libre sans lien avec vos positions. Les données sont sauvegardées localement dans votre navigateur (localStorage).
        </div>
      )}

      {/* Contenu selon le mode */}
      {mode === 'connected'
        ? <ConnectedMode year={year} taxOption={taxOption} tmi={tmi !== '' ? parseFloat(tmi) : null} />
        : <ManualMode    year={year} taxOption={taxOption} tmi={tmi !== '' ? parseFloat(tmi) : null} />
      }

      {/* Exemple pédagogique */}
      <PedagoExample />
    </div>
  )
}

// ── Exemple pédagogique ────────────────────────────────────────

function PedagoExample() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="text-sm font-semibold text-gray-800">
          🍬 Comment ça marche ? (explication simple)
        </span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-6 text-sm text-gray-700 space-y-5 border-t border-gray-100 pt-4">

          <p className="text-gray-500 text-xs italic">
            Pas besoin d'être expert en fiscalité — voilà comment ça fonctionne avec des mots simples.
          </p>

          {/* Étape 1 */}
          <div className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">1</span>
            <div>
              <p className="font-semibold text-gray-800">Tu achètes du Bitcoin avec 1 000 €</p>
              <p className="text-gray-500 text-xs mt-0.5">
                C'est ta <strong>base de coût</strong> (le fisc l'appelle PTA). C'est simplement l'argent que tu as mis.
              </p>
              <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-xs">
                💰 PTA = <strong>1 000 €</strong>
              </div>
            </div>
          </div>

          {/* Étape 2 */}
          <div className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 text-sm font-bold flex items-center justify-center">2</span>
            <div>
              <p className="font-semibold text-gray-800">Un an plus tard, ton Bitcoin a grimpé</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Ton portefeuille vaut maintenant <strong>1 500 €</strong>. Tu n'as rien vendu donc tu ne paies pas encore d'impôt — les crypto ne sont taxées qu'à la vente en euros.
              </p>
              <div className="mt-2 bg-yellow-50 rounded-lg px-3 py-2 text-xs">
                📈 Portefeuille = <strong>1 500 €</strong> (ton Bitcoin a pris +50 %)
              </div>
            </div>
          </div>

          {/* Étape 3 */}
          <div className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center">3</span>
            <div>
              <p className="font-semibold text-gray-800">Tu retires 1 000 €</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Est-ce que tu as gagné 1 000 € ? <strong>Non !</strong> En France, le fisc ne regarde pas combien tu as retiré, mais quelle <em>proportion</em> de ton portefeuille tu as vendue.
              </p>
              <div className="mt-2 bg-orange-50 rounded-lg px-3 py-2 text-xs space-y-1">
                <p>Tu vends <strong>1 000 €</strong> sur un portefeuille de <strong>1 500 €</strong> → tu vends <strong>2/3 de ton portefeuille</strong></p>
                <p>Donc tu récupères aussi 2/3 de ta mise de départ : <strong>1 000 × 1 000 / 1 500 = 666,67 €</strong></p>
                <p className="text-orange-700 font-semibold">Plus-value = 1 000 − 666,67 = <strong>333,33 €</strong> imposables</p>
              </div>
            </div>
          </div>

          {/* Étape 4 */}
          <div className="flex gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center">4</span>
            <div>
              <p className="font-semibold text-gray-800">Tu déclares et tu paies l'impôt</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Avec la flat tax (PFU) à 31,4 % : <strong>333,33 × 31,4 % ≈ 104,67 €</strong> d'impôt.
                Il te reste donc 900 € net dans la poche — pas 1 000.
              </p>
              <div className="mt-2 bg-green-50 rounded-lg px-3 py-2 text-xs space-y-1">
                <p>✓ Argent de départ récupéré : 666,67 €</p>
                <p>✓ Bénéfice net après impôt : 333,33 − 100 = 233,33 €</p>
                <p className="font-semibold text-green-700">= 900 € en poche au total</p>
              </div>
            </div>
          </div>

          {/* Résumé formule */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs">
            <p className="font-semibold text-gray-700 mb-2">La formule officielle (art. 150 VH bis CGI)</p>
            <div className="font-mono text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 text-center">
              Plus-value = Vente − (PTA × Vente ÷ Valeur du portefeuille)
            </div>
            <p className="text-gray-400 mt-2">
              PTA = somme de tout ce que tu as investi depuis le début, réduit à chaque vente.
              Le portefeuille = valeur de <strong>toutes</strong> tes cryptos au moment de la vente (pas seulement celle vendue).
            </p>
          </div>

          <p className="text-xs text-gray-400 italic text-center">
            Ce simulateur est indicatif. Pour votre déclaration officielle, utilisez le formulaire 2086 sur impots.gouv.fr.
          </p>
        </div>
      )}
    </div>
  )
}
