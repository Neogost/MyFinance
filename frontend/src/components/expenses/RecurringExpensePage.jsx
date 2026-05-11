import { useState, useEffect } from 'react'
import { getExpenses, getExpenseSummary, createExpense, updateExpense, deleteExpense, getExpenseBudgets, saveExpenseBudgets } from '../../api/expenses'
import RecurringExpenseForm from './RecurringExpenseForm'
import { fmt } from '../../utils/formatting.js'
import KpiCard from '../common/KpiCard'
import DeleteConfirmModal from '../common/DeleteConfirmModal'
import { useAnalytics } from '../../hooks/useAnalytics'

const CATEGORY_META = {
  LOGEMENT:    { label: 'Logement',               color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400' },
  TRANSPORT:   { label: 'Transport',              color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  ASSURANCES:  { label: 'Assurances',             color: 'bg-red-100 text-red-700',      dot: 'bg-red-400' },
  ABONNEMENTS: { label: 'Abonnements',            color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
  SANTE:       { label: 'Santé',                  color: 'bg-green-100 text-green-700',  dot: 'bg-green-400' },
  FAMILLE:     { label: 'Famille',                color: 'bg-pink-100 text-pink-700',    dot: 'bg-pink-400' },
  ALIMENTATION:{ label: 'Alimentation',            color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  EPARGNE:     { label: 'Épargne programmée',     color: 'bg-teal-100 text-teal-700',    dot: 'bg-teal-400' },
  AUTRE:       { label: 'Autre',                  color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
}

const FREQ_LABEL = { MONTHLY: 'mensuel', ANNUAL: 'annuel' }

export default function RecurringExpensePage() {
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('expenses.recurring') }, [])
  const [expenses,          setExpenses]          = useState([])
  const [summary,           setSummary]           = useState(null)
  const [formTarget,        setFormTarget]        = useState(undefined)
  const [filter,            setFilter]            = useState('ALL')
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState(null)
  const [budgets,           setBudgets]           = useState({})
  const [budgetsDirty,      setBudgetsDirty]      = useState(false)
  const [budgetsSaving,     setBudgetsSaving]     = useState(false)
  const [showBudgetEditor,  setShowBudgetEditor]  = useState(false)
  const [deleteTarget,      setDeleteTarget]      = useState(null)

  function updateBudget(category, value) {
    const updated = { ...budgets }
    if (value === '' || isNaN(parseFloat(value))) {
      delete updated[category]
    } else {
      updated[category] = parseFloat(value)
    }
    setBudgets(updated)
    setBudgetsDirty(true)
  }

  async function handleSaveBudgets() {
    setBudgetsSaving(true)
    try {
      const saved = await saveExpenseBudgets(budgets)
      setBudgets(saved)
      setBudgetsDirty(false)
    } finally {
      setBudgetsSaving(false)
    }
  }

  function budgetBarColor(category, amount) {
    const budget = budgets[category]
    if (!budget) return null
    const pct = (amount / budget) * 100
    if (pct > 100) return 'bg-red-500'
    if (pct > 75)  return 'bg-orange-400'
    return 'bg-green-500'
  }

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      const [exp, sum, bud] = await Promise.all([getExpenses(), getExpenseSummary(), getExpenseBudgets()])
      setExpenses(exp)
      setSummary(sum)
      setBudgets(bud ?? {})
    } catch {
      setError('Impossible de charger les dépenses.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      await updateExpense(formTarget.id, payload)
      trackEvent('FEATURE_USE', 'expenses.recurring.edit')
    } else {
      await createExpense(payload)
      trackEvent('FEATURE_USE', 'expenses.recurring.create', { category: payload.category })
    }
    setFormTarget(undefined)
    await fetchAll()
  }

  function handleDelete(exp) { setDeleteTarget(exp) }

  async function confirmDelete() {
    await deleteExpense(deleteTarget.id)
    trackEvent('FEATURE_USE', 'expenses.recurring.delete')
    setExpenses(es => es.filter(e => e.id !== deleteTarget.id))
    setSummary(await getExpenseSummary())
    setDeleteTarget(null)
  }

  const filtered = filter === 'ALL' ? expenses : expenses.filter(e => e.category === filter)

  // Groupement par catégorie pour l'affichage
  const grouped = filtered.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = []
    acc[e.category].push(e)
    return acc
  }, {})

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  const savingsColor = summary?.savingsCapacity != null
    ? summary.savingsCapacity >= 0 ? 'text-green-600' : 'text-red-600'
    : 'text-gray-900'

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Dépenses récurrentes</h2>
        <button
          onClick={() => { trackEvent('BUTTON_CLICK', 'expenses.recurring.open_form'); setFormTarget(null) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter
        </button>
      </div>

      {/* ── Résumé + Répartition ── */}
      {summary && (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Bloc 2×2 KPIs */}
          <div className="grid grid-cols-2 gap-4 md:w-1/2">
            <KpiCard
              label="Revenus nets mensuels"
              value={summary.monthlyNetIncome}
              sub={summary.incomeSource === 'NET_IMPOSABLE' ? '⚠ Net imposable (profil fiscal incomplet)' : summary.incomeSource === 'NONE' ? 'Aucun contrat actif' : null}
              color={summary.incomeSource === 'NONE' ? 'text-gray-400' : undefined}
              labelTooltip={
                summary.incomeSource === 'NONE' ? (
                  <span>Aucun contrat salarial actif trouvé.</span>
                ) : (
                  <div className="space-y-1.5">
                    {summary.breakdownNetImposable != null && (
                      <div className="flex justify-between gap-6">
                        <span>Net imposable</span>
                        <span className="font-medium">{fmt(summary.breakdownNetImposable)} €</span>
                      </div>
                    )}
                    {summary.breakdownEstimatedTax != null ? (
                      <div className="flex justify-between gap-6 text-red-300">
                        <span>− PAS estimé</span>
                        <span className="font-medium amount">−{fmt(summary.breakdownEstimatedTax)} €</span>
                      </div>
                    ) : (
                      <div className="text-yellow-300 text-xs">⚠ Profil fiscal incomplet (PAS non déduit)</div>
                    )}
                    {summary.breakdownBenefits != null && (
                      <div className="flex justify-between gap-6 text-green-300">
                        <span>+ Avantages en nature</span>
                        <span className="font-medium amount">+{fmt(summary.breakdownBenefits)} €</span>
                      </div>
                    )}
                    {summary.breakdownMealVoucherEmployer != null && (
                      <div className="flex justify-between gap-6 text-blue-300">
                        <span>+ TR part employeur</span>
                        <span className="font-medium amount">+{fmt(summary.breakdownMealVoucherEmployer)} €</span>
                      </div>
                    )}
                    {summary.breakdownMonthlyBonuses != null && (
                      <div className="flex justify-between gap-6 text-violet-300">
                        <span>+ Primes mensuelles</span>
                        <span className="font-medium amount">+{fmt(summary.breakdownMonthlyBonuses)} €</span>
                      </div>
                    )}
                    <div className="border-t border-gray-500 pt-1.5 flex justify-between gap-6 font-semibold">
                      <span>= Revenu net mensuel</span>
                      <span className="amount">{fmt(summary.monthlyNetIncome)} €</span>
                    </div>
                  </div>
                )
              }
            />
            <KpiCard
              label="Total dépenses / mois"
              value={summary.totalMonthlyExpenses}
              sub={summary.totalAnnualExpenses != null ? `${fmt(summary.totalAnnualExpenses)} €/an` : null}
            />
            <KpiCard
              label="Capacité d'épargne"
              value={summary.savingsCapacity}
              sub={summary.savingsRate != null ? `Taux d'épargne : ${summary.savingsRate.toFixed(1)} %` : null}
              color={savingsColor}
            />
            <KpiCard
              label="Taux d'épargne"
              value={summary.savingsRate != null ? summary.savingsRate.toFixed(1) : null}
              unit="%"
              color={summary.savingsRate == null ? 'text-gray-900' : summary.savingsRate >= 30 ? 'text-green-600' : summary.savingsRate >= 10 ? 'text-orange-500' : 'text-red-600'}
            />
          </div>

          {/* Répartition par catégorie */}
          {summary.byCategory?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5 md:w-1/2 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Répartition par catégorie</p>
                <button
                  onClick={() => setShowBudgetEditor(v => !v)}
                  className={`text-xs px-2 py-1 rounded-md border transition ${showBudgetEditor ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600'}`}
                >
                  ⚙ Budgets
                </button>
              </div>

              {showBudgetEditor && (
                <div className="mb-4 bg-gray-50 rounded-lg p-3 flex flex-col gap-2 border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Plafond mensuel par catégorie (laisser vide pour désactiver)</p>
                  {summary.byCategory.map(cat => {
                    const meta = CATEGORY_META[cat.category] ?? CATEGORY_META.AUTRE
                    return (
                      <div key={cat.category} className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color} w-32 text-center shrink-0`}>
                          {meta.label}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="— €"
                          value={budgets[cat.category] ?? ''}
                          onChange={e => updateBudget(cat.category, e.target.value)}
                          className="w-24 border border-gray-300 rounded-md px-2 py-1 text-xs text-right focus:outline-none focus:border-indigo-400"
                        />
                        <span className="text-xs text-gray-400">€/mois</span>
                      </div>
                    )
                  })}
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={handleSaveBudgets}
                      disabled={!budgetsDirty || budgetsSaving}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition"
                    >
                      {budgetsSaving ? 'Enregistrement…' : 'Sauvegarder les budgets'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {summary.byCategory.map(cat => {
                  const meta    = CATEGORY_META[cat.category] ?? CATEGORY_META.AUTRE
                  const budget  = budgets[cat.category]
                  const barColor = budgetBarColor(cat.category, cat.monthlyAmount) ?? meta.dot
                  const pct = budget
                    ? Math.min((cat.monthlyAmount / budget) * 100, 100)
                    : summary.totalMonthlyExpenses > 0
                      ? (cat.monthlyAmount / summary.totalMonthlyExpenses) * 100
                      : 0
                  const isOver = budget && cat.monthlyAmount > budget
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color} w-36 text-center shrink-0`}>
                        {meta.label}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`${barColor} h-2 rounded-full transition-all`}
                          style={{ width: `${pct.toFixed(1)}%` }}
                        />
                      </div>
                      <span className={`text-xs w-32 text-right shrink-0 amount ${isOver ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        {fmt(cat.monthlyAmount)}{budget ? ` / ${fmt(budget)}` : ''} €
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Filtre par catégorie ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['ALL', 'Toutes'], ...Object.entries(CATEGORY_META).map(([v, { label }]) => [v, label])].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === val
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Liste groupée par catégorie ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucune dépense récurrente</p>
          <p className="text-sm">Cliquez sur « + Ajouter » pour en saisir une.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([category, items]) => {
            const meta = CATEGORY_META[category] ?? CATEGORY_META.AUTRE
            const catMonthly = items.reduce((s, e) => s + e.monthlyAmount, 0)
            return (
              <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* En-tête de catégorie */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {budgets[category] && catMonthly > budgets[category] && (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                        ⚠ Plafond dépassé
                      </span>
                    )}
                    {budgets[category] && catMonthly <= budgets[category] && (
                      <span className="text-xs text-gray-400 amount">
                        {fmt(catMonthly)} / {fmt(budgets[category])} €
                      </span>
                    )}
                    {!budgets[category] && (
                      <span className="text-sm font-semibold text-gray-700 amount">
                        {fmt(catMonthly)} €/mois
                      </span>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {items.map(exp => (
                      <tr key={exp.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{exp.label}</td>
                        <td className="hidden md:table-cell px-4 py-3 text-xs text-gray-500 amount">
                          {fmt(exp.amount)} € {FREQ_LABEL[exp.frequency]}
                          {exp.sharePercentage < 100 && (
                            <span className="ml-1 text-indigo-500">({exp.sharePercentage} %)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900 amount">{fmt(exp.monthlyAmount)} €/mois</span>
                          <span className="hidden md:inline text-xs text-gray-400 ml-2 amount">{fmt(exp.annualAmount)} €/an</span>
                        </td>
                        {exp.endDate && (
                          <td className="hidden md:table-cell px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            jusqu'au {exp.endDate}
                          </td>
                        )}
                        {!exp.endDate && <td className="hidden md:table-cell px-4 py-3" />}
                        <td className="px-4 py-3">
                          <div className="flex flex-col md:flex-row gap-1 md:gap-2 items-end md:justify-end">
                            <button
                              onClick={() => setFormTarget(exp)}
                              className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(exp)}
                              className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Total bas de page ── */}
      {filtered.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-8 text-sm text-gray-600 bg-white rounded-xl shadow-sm px-6 py-4">
          <span>
            Total affiché :
            <strong className="ml-2 text-gray-900 amount">
              {fmt(filtered.reduce((s, e) => s + e.monthlyAmount, 0))} €/mois
            </strong>
          </span>
          <span>
            <strong className="text-gray-900 amount">
              {fmt(filtered.reduce((s, e) => s + e.annualAmount, 0))} €/an
            </strong>
          </span>
        </div>
      )}

      {formTarget !== undefined && (
        <RecurringExpenseForm
          expense={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title={`Supprimer « ${deleteTarget.label} » ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
