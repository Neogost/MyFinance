import { useMemo } from 'react'

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const CAT_COLORS = {
  LOGEMENT:     { bg: 'bg-indigo-100',  text: 'text-indigo-800',  dot: 'bg-indigo-500'  },
  TRANSPORT:    { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500'    },
  ASSURANCES:   { bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-500'  },
  ABONNEMENTS:  { bg: 'bg-violet-100',  text: 'text-violet-800',  dot: 'bg-violet-500'  },
  SANTE:        { bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-500'   },
  FAMILLE:      { bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-500'  },
  ALIMENTATION: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  EPARGNE:      { bg: 'bg-teal-100',    text: 'text-teal-800',    dot: 'bg-teal-500'    },
  AUTRE:        { bg: 'bg-gray-100',    text: 'text-gray-700',    dot: 'bg-gray-400'    },
}

function fmt(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isActive(expense) {
  if (!expense.endDate) return true
  return new Date(expense.endDate + 'T00:00:00') >= new Date()
}

function getExpensesForMonth(expenses, month) {
  return expenses
    .filter(isActive)
    .filter(e => {
      if (e.frequency === 'MONTHLY') return e.paymentDay != null
      if (e.frequency === 'ANNUAL' && e.startDate) {
        return new Date(e.startDate + 'T00:00:00').getMonth() + 1 === month
      }
      return false
    })
    .map(e => {
      const day = e.frequency === 'MONTHLY'
        ? e.paymentDay
        : new Date(e.startDate + 'T00:00:00').getDate()
      return { ...e, dayInMonth: day, displayAmount: e.frequency === 'ANNUAL' ? e.annualAmount : e.monthlyAmount }
    })
    .sort((a, b) => a.dayInMonth - b.dayInMonth)
}

function daysUntil(dayInMonth, month, year) {
  const today = new Date()
  const target = new Date(year, month - 1, dayInMonth)
  const diff = Math.round((target - today) / 86400000)
  return diff
}

export default function CalendarTimelineView({ expenses, year, onYearChange }) {
  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      items: getExpensesForMonth(expenses, i + 1),
    }))
  , [expenses, year])

  const currentMonth = new Date().getMonth() + 1
  const currentYear  = new Date().getFullYear()

  return (
    <div>
      {/* Navigation année */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => onYearChange(-1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
          ← {year - 1}
        </button>
        <h2 className="text-base font-semibold text-gray-900">{year}</h2>
        <button onClick={() => onYearChange(1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
          {year + 1} →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map(({ month, items }) => {
          const total = items.reduce((s, e) => s + (e.displayAmount ?? 0), 0)
          const isCurrent = month === currentMonth && year === currentYear
          return (
            <div key={month}
              className={`rounded-xl border p-4 flex flex-col gap-3
                ${isCurrent ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold text-sm ${isCurrent ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {MONTH_NAMES[month - 1]}
                  {isCurrent && <span className="ml-2 text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">Ce mois</span>}
                </h3>
                {total > 0 && (
                  <span className="text-sm font-bold text-gray-900">{fmt(total)} €</span>
                )}
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun prélèvement daté</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {items.map((e, i) => {
                    const c = CAT_COLORS[e.category] ?? CAT_COLORS.AUTRE
                    return (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full shrink-0 ${c.bg} ${c.text} font-medium`}>
                            {e.dayInMonth}
                          </span>
                          <span className="text-xs text-gray-700 truncate">{e.label}</span>
                          {e.frequency === 'ANNUAL' && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded shrink-0">annuel</span>
                          )}
                          {(() => {
                            const d = daysUntil(e.dayInMonth, month, year)
                            if (d > 0 && d <= 7) return (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                                dans {d}j
                              </span>
                            )
                            if (d === 0) return (
                              <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                                aujourd'hui
                              </span>
                            )
                            return null
                          })()}
                        </div>
                        <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                          {fmt(e.displayAmount ?? 0)} €
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
