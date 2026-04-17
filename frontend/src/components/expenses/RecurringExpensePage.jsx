import { useState, useEffect } from 'react'
import { getExpenses, getExpenseSummary, createExpense, updateExpense, deleteExpense } from '../../api/expenses'
import RecurringExpenseForm from './RecurringExpenseForm'

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

function fmt(n) {
  return n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) ?? '—'
}

function SavingsCard({ label, value, sub, color, unit = '€', tooltip }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-1 relative"
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <p className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
        {label}
        {tooltip && <span className="text-gray-300 text-xs">ⓘ</span>}
      </p>
      <p className={`text-2xl font-bold ${color ?? 'text-gray-900'}`}>
        {value != null ? `${fmt(value)} ${unit}` : '—'}
      </p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}

      {showTooltip && tooltip && (
        <div className="absolute top-full left-0 mt-2 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-56">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Par catégorie</p>
          <div className="flex flex-col gap-1.5">
            {tooltip.map(({ category, monthlyAmount }) => {
              const meta = CATEGORY_META[category] ?? CATEGORY_META.AUTRE
              return (
                <div key={category} className="flex items-center justify-between gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {fmt(monthlyAmount)} €
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RecurringExpensePage() {
  const [expenses,   setExpenses]   = useState([])
  const [summary,    setSummary]    = useState(null)
  const [formTarget, setFormTarget] = useState(undefined)
  const [filter,     setFilter]     = useState('ALL')
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      const [exp, sum] = await Promise.all([getExpenses(), getExpenseSummary()])
      setExpenses(exp)
      setSummary(sum)
    } catch {
      setError('Impossible de charger les dépenses.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      await updateExpense(formTarget.id, payload)
    } else {
      await createExpense(payload)
    }
    setFormTarget(undefined)
    await fetchAll()
  }

  async function handleDelete(exp) {
    if (!confirm(`Supprimer « ${exp.label} » ?`)) return
    await deleteExpense(exp.id)
    setExpenses(es => es.filter(e => e.id !== exp.id))
    // Rafraîchir le résumé
    try { setSummary(await getExpenseSummary()) } catch {}
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
          onClick={() => setFormTarget(null)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter
        </button>
      </div>

      {/* ── Résumé capacité d'épargne ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <SavingsCard
            label="Revenus nets mensuels"
            value={summary.monthlyNetIncome}
            sub={summary.incomeSource === 'NET_IMPOSABLE' ? '⚠ Net imposable (profil fiscal incomplet)' : summary.incomeSource === 'NONE' ? 'Aucun contrat actif' : null}
            color={summary.incomeSource === 'NONE' ? 'text-gray-400' : undefined}
          />
          <SavingsCard
            label="Total dépenses / mois"
            value={summary.totalMonthlyExpenses}
            sub={summary.totalAnnualExpenses != null ? `${fmt(summary.totalAnnualExpenses)} €/an` : null}
            tooltip={summary.byCategory?.length > 0 ? summary.byCategory : null}
          />
          <SavingsCard
            label="Capacité d'épargne"
            value={summary.savingsCapacity}
            sub={summary.savingsRate != null ? `Taux d'épargne : ${summary.savingsRate.toFixed(1)} %` : null}
            color={savingsColor}
          />
          <SavingsCard
            label="Taux d'épargne"
            value={summary.savingsRate != null ? summary.savingsRate.toFixed(1) : null}
            unit="%"
            color={summary.savingsRate != null && summary.savingsRate >= 0 ? 'text-green-600' : 'text-red-600'}
          />
        </div>
      )}

      {/* ── Répartition par catégorie (mini barres) ── */}
      {summary?.byCategory?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Répartition par catégorie</p>
          <div className="flex flex-col gap-2">
            {summary.byCategory.map(cat => {
              const meta = CATEGORY_META[cat.category] ?? CATEGORY_META.AUTRE
              const pct = summary.totalMonthlyExpenses > 0
                ? (cat.monthlyAmount / summary.totalMonthlyExpenses) * 100
                : 0
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color} w-36 text-center shrink-0`}>
                    {meta.label}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`${meta.dot} h-2 rounded-full`}
                      style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-24 text-right shrink-0">
                    {fmt(cat.monthlyAmount)} €/mois
                  </span>
                </div>
              )
            })}
          </div>
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
                  <span className="text-sm font-semibold text-gray-700">
                    {fmt(catMonthly)} €/mois
                  </span>
                </div>
                <table className="w-full border-collapse">
                  <tbody>
                    {items.map(exp => (
                      <tr key={exp.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{exp.label}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {fmt(exp.amount)} € {FREQ_LABEL[exp.frequency]}
                          {exp.sharePercentage < 100 && (
                            <span className="ml-1 text-indigo-500">({exp.sharePercentage} %)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">{fmt(exp.monthlyAmount)} €/mois</span>
                          <span className="text-xs text-gray-400 ml-2">{fmt(exp.annualAmount)} €/an</span>
                        </td>
                        {exp.endDate && (
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            jusqu'au {exp.endDate}
                          </td>
                        )}
                        {!exp.endDate && <td className="px-4 py-3" />}
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
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
            )
          })}
        </div>
      )}

      {/* ── Total bas de page ── */}
      {filtered.length > 0 && (
        <div className="mt-4 flex justify-end gap-8 text-sm text-gray-600 bg-white rounded-xl shadow-sm px-6 py-4">
          <span>
            Total affiché :
            <strong className="ml-2 text-gray-900">
              {fmt(filtered.reduce((s, e) => s + e.monthlyAmount, 0))} €/mois
            </strong>
          </span>
          <span>
            <strong className="text-gray-900">
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
    </div>
  )
}
