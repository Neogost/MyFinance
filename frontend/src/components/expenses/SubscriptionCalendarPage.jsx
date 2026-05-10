import { useState, useEffect, useMemo } from 'react'
import { getExpenses } from '../../api/expenses'
import { useAnalytics } from '../../hooks/useAnalytics'
import CalendarGridView from './CalendarGridView'
import CalendarTimelineView from './CalendarTimelineView'

function fmt(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isActive(expense) {
  if (!expense.endDate) return true
  return new Date(expense.endDate + 'T00:00:00') >= new Date()
}

function hasPaymentDate(expense) {
  if (expense.frequency === 'MONTHLY') return expense.paymentDay != null
  if (expense.frequency === 'ANNUAL')  return expense.startDate  != null
  return false
}

const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']

export default function SubscriptionCalendarPage({ onNavigate }) {
  const today = new Date()
  const { trackEvent } = useAnalytics()

  const [expenses,   setExpenses]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [viewMode,   setViewMode]   = useState('TIMELINE')
  const [month,      setMonth]      = useState(today.getMonth() + 1)
  const [year,       setYear]       = useState(today.getFullYear())

  useEffect(() => {
    trackEvent('PAGE_VIEW', 'expenses.subscription_calendar.view')
    getExpenses()
      .then(setExpenses)
      .catch(() => setError('Impossible de charger les dépenses.'))
      .finally(() => setLoading(false))
  }, [])

  function handleMonthChange(delta) {
    setMonth(m => {
      const next = m + delta
      if (next < 1)  { setYear(y => y - 1); return 12 }
      if (next > 12) { setYear(y => y + 1); return 1  }
      return next
    })
  }

  function handleYearChange(delta) { setYear(y => y + delta) }

  function goToToday() {
    setMonth(today.getMonth() + 1)
    setYear(today.getFullYear())
  }

  const activeExpenses  = useMemo(() => expenses.filter(isActive), [expenses])
  const datedActive     = useMemo(() => activeExpenses.filter(hasPaymentDate), [activeExpenses])
  const undatedCount    = useMemo(() => activeExpenses.filter(e => !hasPaymentDate(e)).length, [activeExpenses])

  const totalAnnual = useMemo(() =>
    datedActive.reduce((sum, e) => sum + (e.annualAmount ?? 0), 0)
  , [datedActive])

  const avgMonthly = totalAnnual / 12

  const busiestMonth = useMemo(() => {
    if (datedActive.length === 0) return null
    const totals = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const total = datedActive
        .filter(e => {
          if (e.frequency === 'MONTHLY') return true
          if (e.frequency === 'ANNUAL' && e.startDate)
            return new Date(e.startDate + 'T00:00:00').getMonth() + 1 === m
          return false
        })
        .reduce((s, e) => s + (e.frequency === 'ANNUAL' ? (e.annualAmount ?? 0) : (e.monthlyAmount ?? 0)), 0)
      return { month: m, total }
    })
    return totals.reduce((max, cur) => cur.total > max.total ? cur : max, totals[0])
  }, [datedActive])

  if (loading) return <p className="text-gray-500 p-6">Chargement…</p>
  if (error)   return <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 m-6">{error}</p>

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Calendrier des abonnements</h1>

      {/* ── Bandeau synthèse ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total annuel daté</p>
          <p className="text-lg font-bold text-gray-900">{fmt(totalAnnual)} €</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Coût mensuel moyen</p>
          <p className="text-lg font-bold text-gray-900">{fmt(avgMonthly)} €</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Abonnements datés</p>
          <p className="text-lg font-bold text-gray-900">{datedActive.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Mois le plus chargé</p>
          {busiestMonth && busiestMonth.total > 0
            ? <p className="text-lg font-bold text-gray-900">
                {MONTH_NAMES[busiestMonth.month - 1]}
                <span className="text-sm font-normal text-gray-500 ml-1">{fmt(busiestMonth.total)} €</span>
              </p>
            : <p className="text-sm text-gray-400 mt-1">—</p>
          }
        </div>
      </div>

      {/* ── Bannière dépenses sans date ── */}
      {undatedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">
            <strong>{undatedCount} dépense{undatedCount > 1 ? 's' : ''}</strong> active{undatedCount > 1 ? 's' : ''} sans date de prélèvement ne {undatedCount > 1 ? 'sont pas affichées' : 'est pas affichée'}.
          </p>
          <button onClick={() => onNavigate('expenses')}
            className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap transition">
            Compléter →
          </button>
        </div>
      )}

      {datedActive.length === 0 && undatedCount === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500">
          Aucune dépense saisie. Ajoutez vos charges depuis <em>Mes dépenses</em>.
        </div>
      )}

      {/* ── Toggle vue ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('TIMELINE')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'TIMELINE' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          📋 Vue annuelle
        </button>
        <button
          onClick={() => setViewMode('GRID')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'GRID' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          🗓 Vue mensuelle
        </button>
      </div>

      {/* ── Vue active ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
        {viewMode === 'TIMELINE'
          ? <CalendarTimelineView expenses={datedActive} year={year} onYearChange={handleYearChange} />
          : <CalendarGridView    expenses={datedActive} month={month} year={year}
              onMonthChange={handleMonthChange} onGoToday={goToToday} />
        }
      </div>
    </div>
  )
}
