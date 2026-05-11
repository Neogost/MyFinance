import { useState, useEffect } from 'react'
import { getDebts, getDebtsSummary, createDebt, updateDebt, deleteDebt, getBalanceEntries, addBalanceEntry, deleteBalanceEntry } from '../../api/debts'
import { useCrud } from '../../hooks/useCrud'
import DebtForm from './DebtForm'
import DeleteConfirmModal from '../common/DeleteConfirmModal'
import { fmt, fmtPct, formatDate } from '../../utils/formatting.js'
import KpiCard from '../common/KpiCard'
import { useAnalytics } from '../../hooks/useAnalytics'

const TYPE_META = {
  IMMOBILIER:   { label: 'Immobilier',            color: 'bg-indigo-100 text-indigo-700',   dot: 'bg-indigo-400' },
  ETUDIANT:     { label: 'Prêt étudiant',          color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-400' },
  VEHICULE:     { label: 'Crédit véhicule',         color: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-400' },
  CONSOMMATION: { label: 'Crédit consommation',     color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400' },
  AUTRE:        { label: 'Autre',                   color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400' },
}


function ProgressBar({ pct, colorClass = 'bg-indigo-400' }) {
  const p = Math.min(Math.max(parseFloat(pct) || 0, 0), 100)
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
      <div className={`${colorClass} h-1.5 rounded-full transition-all`} style={{ width: `${p}%` }} />
    </div>
  )
}

function AmortizationTable({ schedule }) {
  if (!schedule || schedule.length === 0) return (
    <p className="text-xs text-gray-400 px-4 py-2">Tableau indisponible (paramètres manquants)</p>
  )
  return (
    <div className="overflow-x-auto">
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-3 py-2 text-left text-gray-400 uppercase tracking-wide">Mois</th>
          <th className="px-3 py-2 text-right text-gray-400 uppercase tracking-wide">Échéance</th>
          <th className="hidden md:table-cell px-3 py-2 text-right text-gray-400 uppercase tracking-wide">Intérêts</th>
          <th className="hidden md:table-cell px-3 py-2 text-right text-gray-400 uppercase tracking-wide">Capital</th>
          <th className="px-3 py-2 text-right text-gray-400 uppercase tracking-wide">Solde restant</th>
        </tr>
      </thead>
      <tbody>
        {schedule.map((row, i) => (
          <tr key={i} className="border-t border-gray-100">
            <td className="px-3 py-2 text-gray-600">{row.month}</td>
            <td className="px-3 py-2 text-right text-gray-700 amount">{fmt(row.payment)} €</td>
            <td className="hidden md:table-cell px-3 py-2 text-right text-red-500 amount">{fmt(row.interest)} €</td>
            <td className="hidden md:table-cell px-3 py-2 text-right text-green-600 amount">{fmt(row.capital)} €</td>
            <td className="px-3 py-2 text-right text-gray-700 font-semibold amount">{fmt(row.remainingCapital)} €</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

function BalanceHistoryPanel({ debtId, onUpdated }) {
  const { trackEvent } = useAnalytics()
  const [entries, setEntries]   = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ entryDate: new Date().toISOString().split('T')[0], balance: '', note: '' })
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    getBalanceEntries(debtId).then(setEntries).catch(() => setEntries([]))
  }, [debtId])

  async function handleAdd(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await addBalanceEntry(debtId, {
        entryDate: form.entryDate,
        balance: parseFloat(form.balance),
        note: form.note || null,
      })
      setShowForm(false)
      setForm({ entryDate: new Date().toISOString().split('T')[0], balance: '', note: '' })
      const updated = await getBalanceEntries(debtId)
      setEntries(updated)
      onUpdated()
      trackEvent('FORM_SUBMIT', 'debts.balance_entry.submit')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(entryId) {
    if (!confirm('Supprimer cette entrée ?')) return
    await deleteBalanceEntry(debtId, entryId)
    setEntries(e => e.filter(x => x.id !== entryId))
    onUpdated()
  }

  const inputCls = 'px-2.5 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:border-indigo-500 transition bg-white'

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historique des mises à jour manuelles</p>
        <button onClick={() => setShowForm(v => !v)} className="text-xs text-indigo-600 hover:underline">
          {showForm ? 'Annuler' : '+ Saisir un solde'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-3 sm:items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Date</label>
            <input type="date" value={form.entryDate} onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))}
              className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Capital restant (€)</label>
            <input type="number" min="0" step="0.01" value={form.balance}
              onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
              className={inputCls} placeholder="ex : 185000" required />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Note (optionnel)</label>
            <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className={inputCls} placeholder="ex : Relevé bancaire juin 2025" />
          </div>
          <button type="submit" disabled={loading}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
            {loading ? '…' : 'Enregistrer'}
          </button>
        </form>
      )}

      {entries === null ? (
        <p className="text-xs text-gray-400">Chargement…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Aucune mise à jour manuelle</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-white">
              <th className="px-2 py-1.5 text-left text-gray-400 uppercase tracking-wide">Date</th>
              <th className="px-2 py-1.5 text-right text-gray-400 uppercase tracking-wide">Capital restant</th>
              <th className="px-2 py-1.5 text-left text-gray-400 uppercase tracking-wide">Note</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-2 py-1.5 text-gray-600">{formatDate(e.entryDate)}</td>
                <td className="px-2 py-1.5 text-right font-semibold text-gray-700 amount">{fmt(e.balance)} €</td>
                <td className="px-2 py-1.5 text-gray-400">{e.note ?? '—'}</td>
                <td className="px-2 py-1.5 text-right">
                  <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}

function DebtRow({ debt, onEdit, onDelete, onUpdated }) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [showHistory, setShowHistory]   = useState(false)
  const meta = TYPE_META[debt.type] ?? TYPE_META.AUTRE
  const progress = parseFloat(debt.repaymentProgress ?? 0)

  return (
    <div className="border-t border-gray-100">
      {/* Ligne principale */}
      <div className="px-4 py-3 hover:bg-gray-50 transition">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-800">{debt.label}</p>
              {debt.lender && <span className="text-xs text-gray-400">{debt.lender}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${debt.projectionMode ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-700'}`}>
                {debt.projectionMode ? 'Calculé auto' : 'Saisi manuellement'}
              </span>
            </div>

            {/* Barre de remboursement */}
            <div className="flex items-center gap-2 mt-2">
              <ProgressBar pct={progress} colorClass="bg-indigo-400" />
              <span className="text-xs text-gray-500 shrink-0">{fmtPct(progress)} remboursé</span>
            </div>

            {/* Détails financiers */}
            <div className="flex gap-4 mt-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Taux :</span>
                <span className="text-xs font-semibold text-gray-700">{fmtPct(debt.annualRate ? debt.annualRate * 100 : null)}</span>
              </div>
              {debt.monthlyPayment && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Mensualité :</span>
                  <span className="text-xs font-semibold text-gray-700 amount">{fmt(debt.monthlyPayment)} €</span>
                </div>
              )}
              {parseFloat(debt.monthlyInsuranceCost) > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Assurance :</span>
                  <span className="text-xs font-semibold text-gray-700 amount">{fmt(debt.monthlyInsuranceCost)} €/mois</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Total mensuel :</span>
                <span className="text-xs font-bold text-indigo-600 amount">{fmt(debt.monthlyTotalCost)} €</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-base font-bold text-gray-900 amount">{fmt(debt.remainingCapital)} €</p>
            <p className="text-xs text-gray-400">capital restant</p>
            <p className="text-xs text-gray-400">/ {fmt(debt.initialCapital)} €</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setShowSchedule(v => !v)}
            data-testid={`toggle-amortization-${debt.id}`}
            aria-label={`${showSchedule ? 'Masquer' : 'Afficher'} le tableau d'amortissement de ${debt.label}`}
            className={`px-3 py-1 rounded-md text-xs transition border ${showSchedule ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'}`}
          >
            {showSchedule ? '▲' : '▼'} Tableau d'amortissement
          </button>
          <button
            onClick={() => setShowHistory(v => !v)}
            className={`px-3 py-1 rounded-md text-xs transition border ${showHistory ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600'}`}
          >
            {showHistory ? '▲' : '▼'} Historique manuel
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={() => onEdit(debt)}
              data-testid={`edit-debt-${debt.id}`}
              aria-label={`Modifier la dette ${debt.label}`}
              className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
              Modifier
            </button>
            <button onClick={() => onDelete(debt)}
              data-testid={`delete-debt-${debt.id}`}
              aria-label={`Supprimer la dette ${debt.label}`}
              className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition">
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Tableau d'amortissement */}
      {showSchedule && (
        <div className="border-t border-gray-100 bg-gray-50">
          <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">12 prochains mois</p>
          <AmortizationTable schedule={debt.nextMonthsSchedule} />
        </div>
      )}

      {/* Historique manuel */}
      {showHistory && (
        <BalanceHistoryPanel debtId={debt.id} onUpdated={onUpdated} />
      )}
    </div>
  )
}

export default function DettePage() {
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('debts.main') }, [])
  const [summary, setSummary] = useState(null)
  const [filter,  setFilter]  = useState('ALL')

  const {
    items: debts, loading, error,
    formTarget, setFormTarget,
    deleteTarget, setDeleteTarget,
    deleting, handleSubmit, handleDelete, confirmDelete, refresh,
  } = useCrud({
    fetchAll:     async () => {
      const [d, s] = await Promise.all([getDebts(), getDebtsSummary()])
      setSummary(s)
      return d
    },
    create:       async (d) => { const r = await createDebt(d); trackEvent('FEATURE_USE', 'debts.debt.create', { type: d.type }); return r },
    update:       async (id, d) => { const r = await updateDebt(id, d); trackEvent('FEATURE_USE', 'debts.debt.edit'); return r },
    remove:       async (id) => { await deleteDebt(id); trackEvent('FEATURE_USE', 'debts.debt.delete') },
    errorMessage: 'Impossible de charger les dettes.',
  })

  const filtered = filter === 'ALL' ? debts : debts.filter(d => d.type === filter)

  const grouped = filtered.reduce((acc, d) => {
    if (!acc[d.type]) acc[d.type] = []
    acc[d.type].push(d)
    return acc
  }, {})

  const totalEndettement = summary
    ? parseFloat(summary.totalRemainingCapital) / 1 // placeholder — could use patrimony
    : null

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Dettes & Emprunts</h2>
        <button
          onClick={() => { trackEvent('BUTTON_CLICK', 'debts.debt.open_form'); setFormTarget(null) }}
          data-testid="add-debt-button"
          aria-label="Ajouter une dette"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter
        </button>
      </div>

      {/* ── KPIs + Répartition ── */}
      {summary && (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="grid grid-cols-2 gap-4 md:w-1/2">
            <KpiCard
              label="Capital restant total"
              value={summary.totalRemainingCapital}
              color="text-red-600"
              sub={`${summary.totalCount} dette${summary.totalCount > 1 ? 's' : ''}`}
            />
            <KpiCard
              label="Mensualités totales"
              value={summary.totalMonthlyPayment}
              sub="hors assurance"
            />
            <KpiCard
              label="Assurance mensuelle"
              value={summary.totalMonthlyInsurance}
              sub="cotisations estimées"
            />
            <KpiCard
              label="Coût mensuel total"
              value={summary.totalMonthlyCost}
              color="text-indigo-600"
              sub="mensualités + assurance"
            />
          </div>

          {summary.byType?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5 md:w-1/2 flex flex-col justify-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Répartition par type</p>
              <div className="flex flex-col gap-2">
                {summary.byType.map(t => {
                  const meta = TYPE_META[t.type] ?? TYPE_META.AUTRE
                  const totalRemaining = parseFloat(summary.totalRemainingCapital)
                  const pct = totalRemaining > 0
                    ? (parseFloat(t.totalRemainingCapital) / totalRemaining) * 100
                    : 0
                  return (
                    <div key={t.type} className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color} w-36 text-center shrink-0 truncate`}>
                        {meta.label}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className={`${meta.dot} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-28 text-right shrink-0 amount">
                        {fmt(t.totalRemainingCapital)} €
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Filtre ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['ALL', 'Toutes'], ...Object.entries(TYPE_META).map(([v, { label }]) => [v, label])].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === val ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Liste groupée ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucune dette enregistrée</p>
          <p className="text-sm">Cliquez sur « + Ajouter » pour saisir un emprunt (immobilier, étudiant, auto…).</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([type, items]) => {
            const meta = TYPE_META[type] ?? TYPE_META.AUTRE
            const groupTotal = items.reduce((s, d) => s + parseFloat(d.remainingCapital ?? 0), 0)
            return (
              <div key={type} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-gray-400">{items.length} dette{items.length > 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600 amount">{fmt(groupTotal)} € restants</span>
                </div>
                {items.map(debt => (
                  <DebtRow
                    key={debt.id}
                    debt={debt}
                    onEdit={setFormTarget}
                    onDelete={setDeleteTarget}
                    onUpdated={refresh}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {formTarget !== undefined && (
        <DebtForm
          debt={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title={`Supprimer « ${deleteTarget.label} » ?`}
          description="Cette action est irréversible."
          warnings={[
            'Tout l\'historique des mises à jour manuelles du capital',
          ]}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  )
}
