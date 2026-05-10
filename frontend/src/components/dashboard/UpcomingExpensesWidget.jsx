import { useState, useEffect, useMemo } from 'react'
import { getExpenses } from '../../api/expenses'

const CAT_DOT = {
  LOGEMENT:     'bg-indigo-500',
  TRANSPORT:    'bg-blue-500',
  ASSURANCES:   'bg-purple-500',
  ABONNEMENTS:  'bg-violet-500',
  SANTE:        'bg-green-500',
  FAMILLE:      'bg-orange-500',
  ALIMENTATION: 'bg-emerald-500',
  EPARGNE:      'bg-teal-500',
  AUTRE:        'bg-gray-400',
}

function isActive(e) {
  if (!e.endDate) return true
  return new Date(e.endDate + 'T00:00:00') >= new Date()
}

/** Retourne la prochaine date de prélèvement à partir d'aujourd'hui (minuit). */
function nextOccurrence(expense) {
  const today = new Date(); today.setHours(0, 0, 0, 0)

  if (expense.frequency === 'MONTHLY' && expense.paymentDay) {
    const day = expense.paymentDay
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), day)
    return thisMonth >= today
      ? thisMonth
      : new Date(today.getFullYear(), today.getMonth() + 1, day)
  }

  if (expense.frequency === 'ANNUAL' && expense.startDate) {
    const ref = new Date(expense.startDate + 'T00:00:00')
    const thisYear = new Date(today.getFullYear(), ref.getMonth(), ref.getDate())
    return thisYear >= today
      ? thisYear
      : new Date(today.getFullYear() + 1, ref.getMonth(), ref.getDate())
  }

  return null
}

/** Fenêtre d'affichage : 14j pour mensuelles, 60j pour annuelles. */
function inWindow(expense, date) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((date - today) / 86_400_000)
  return diff >= 0 && diff <= (expense.frequency === 'ANNUAL' ? 60 : 14)
}

function relativeDate(date) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((date - today) / 86_400_000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff <= 7)  return `Dans ${diff}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function fmt(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ExpenseRow({ e, isUrgent }) {
  const dot    = CAT_DOT[e.category] ?? CAT_DOT.AUTRE
  const amount = e.frequency === 'ANNUAL' ? e.annualAmount : e.monthlyAmount
  return (
    <li className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition
      ${isUrgent ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-gray-800 truncate">{e.label}</span>
          {e.frequency === 'ANNUAL' && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
              annuel
            </span>
          )}
        </div>
        <p className={`text-[11px] mt-0.5 font-medium ${isUrgent ? 'text-orange-600' : 'text-gray-500'}`}>
          {relativeDate(e.nextDate)}
        </p>
      </div>
      <span className="text-xs font-bold text-gray-900 whitespace-nowrap shrink-0">
        {fmt(amount ?? 0)} €
        <span className="text-gray-400 font-normal">{e.frequency === 'ANNUAL' ? '/an' : '/m'}</span>
      </span>
    </li>
  )
}

function FallbackItem({ expense: e }) {
  const dot    = CAT_DOT[e.category] ?? CAT_DOT.AUTRE
  const amount = e.annualAmount
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-gray-800 truncate">{e.label}</span>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">annuel</span>
        </div>
        <p className="text-[11px] mt-0.5 font-medium text-amber-600">
          {e.nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
        </p>
      </div>
      <span className="text-xs font-bold text-gray-900 whitespace-nowrap shrink-0">
        {fmt(amount ?? 0)} €<span className="text-gray-400 font-normal">/an</span>
      </span>
    </div>
  )
}

export default function UpcomingExpensesWidget({ onNavigate }) {
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getExpenses()
      .then(setExpenses)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const { upcoming, fallbackAnnual } = useMemo(() => {
    const withDates = expenses
      .filter(isActive)
      .map(e => ({ ...e, nextDate: nextOccurrence(e) }))
      .filter(e => e.nextDate)

    const inWindowItems = withDates
      .filter(e => inWindow(e, e.nextDate))
      .sort((a, b) => a.nextDate - b.nextDate)
      .slice(0, 6)

    // Fallback : prochaine dépense annuelle quelle que soit la date
    const nextAnnual = inWindowItems.length === 0
      ? withDates
          .filter(e => e.frequency === 'ANNUAL')
          .sort((a, b) => a.nextDate - b.nextDate)[0] ?? null
      : null

    return { upcoming: inWindowItems, fallbackAnnual: nextAnnual }
  }, [expenses])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-gray-800">Prochains prélèvements</h3>
        {onNavigate && (
          <button
            onClick={() => onNavigate('subscription-calendar')}
            className="text-xs text-indigo-600 hover:text-indigo-800 transition">
            Voir tout →
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Mensuels dans les 14 jours · Annuels dans les 60 jours
      </p>

      {loading && <p className="text-xs text-gray-400">Chargement…</p>}

      {!loading && upcoming.length === 0 && !fallbackAnnual && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <p className="text-sm text-gray-400">Aucun prélèvement à venir.</p>
          {onNavigate && (
            <button onClick={() => onNavigate('expenses')}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition">
              Ajouter des dates de prélèvement →
            </button>
          )}
        </div>
      )}

      {!loading && upcoming.length === 0 && fallbackAnnual && (
        <div className="flex-1 flex flex-col gap-3">
          <p className="text-xs text-gray-400 italic">Aucun prélèvement imminent — prochaine échéance annuelle :</p>
          <FallbackItem expense={fallbackAnnual} />
        </div>
      )}

      {!loading && upcoming.length > 0 && (
        <ul className="flex flex-col gap-2.5 flex-1">
          {upcoming.map((e, i) => {
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const diff  = Math.round((e.nextDate - today) / 86_400_000)
            return <ExpenseRow key={i} e={e} isUrgent={diff <= 3} />
          })}
        </ul>
      )}
    </div>
  )
}
