import { useMemo } from 'react'

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAY_NAMES   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const CAT_META = {
  LOGEMENT:     { dot: 'bg-indigo-500',  label: 'Logement'               },
  TRANSPORT:    { dot: 'bg-blue-500',    label: 'Transport'               },
  ASSURANCES:   { dot: 'bg-purple-500',  label: 'Assurances'              },
  ABONNEMENTS:  { dot: 'bg-violet-500',  label: 'Abonnements'             },
  SANTE:        { dot: 'bg-green-500',   label: 'Santé'                   },
  FAMILLE:      { dot: 'bg-orange-500',  label: 'Famille'                 },
  ALIMENTATION: { dot: 'bg-emerald-500', label: 'Alimentation'            },
  EPARGNE:      { dot: 'bg-teal-500',    label: 'Épargne'                 },
  AUTRE:        { dot: 'bg-gray-400',    label: 'Autre'                   },
}

function fmt(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getPaymentDay(expense, month) {
  if (expense.frequency === 'MONTHLY') return expense.paymentDay ?? null
  if (expense.frequency === 'ANNUAL' && expense.startDate) {
    const d = new Date(expense.startDate + 'T00:00:00')
    return d.getMonth() + 1 === month ? d.getDate() : null
  }
  return null
}

function isActive(expense) {
  if (!expense.endDate) return true
  return new Date(expense.endDate + 'T00:00:00') >= new Date()
}

export default function CalendarGridView({ expenses, month, year, onMonthChange, onGoToday }) {
  const daysInMonth  = new Date(year, month, 0).getDate()
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7

  const byDay = useMemo(() => {
    const map = {}
    expenses.filter(isActive).forEach(e => {
      const day = getPaymentDay(e, month)
      if (!day || day < 1 || day > daysInMonth) return
      if (!map[day]) map[day] = []
      map[day].push(e)
    })
    return map
  }, [expenses, month, year, daysInMonth])

  // Catégories présentes ce mois (pour la légende)
  const presentCategories = useMemo(() => {
    const seen = new Set()
    Object.values(byDay).flat().forEach(e => seen.add(e.category))
    return [...seen]
  }, [byDay])

  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today  = new Date()
  const isToday  = (day) => day && today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day
  const isCurrentMonthYear = today.getFullYear() === year && today.getMonth() + 1 === month

  const totalMonth = Object.values(byDay).flat().reduce((sum, e) =>
    sum + (e.frequency === 'ANNUAL' ? (e.annualAmount ?? 0) : (e.monthlyAmount ?? 0)), 0)

  return (
    <div>
      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <button onClick={() => onMonthChange(-1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition shrink-0">
          ← Précédent
        </button>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-base font-semibold text-gray-900">{MONTH_NAMES[month - 1]} {year}</h2>
          <div className="flex items-center gap-2">
            {totalMonth > 0 && (
              <p className="text-xs text-gray-500">Total : <span className="font-semibold text-gray-700">{fmt(totalMonth)} €</span></p>
            )}
            {!isCurrentMonthYear && (
              <button onClick={onGoToday}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition">
                Aujourd'hui
              </button>
            )}
          </div>
        </div>
        <button onClick={() => onMonthChange(1)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition shrink-0">
          Suivant →
        </button>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        {/* En-têtes jours */}
        {DAY_NAMES.map((d, i) => (
          <div key={d}
            className={`text-center py-2 text-xs font-semibold text-gray-500 ${i >= 5 ? 'bg-gray-100' : 'bg-gray-50'}`}>
            {d}
          </div>
        ))}

        {/* Cellules */}
        {cells.map((day, i) => {
          const weekday = i % 7
          const isWeekend = weekday >= 5
          const items = day ? (byDay[day] ?? []) : []
          return (
            <div key={i}
              className={`min-h-[72px] p-1.5 flex flex-col gap-1
                ${!day ? 'opacity-30' : ''}
                ${isWeekend ? 'bg-gray-50/70' : 'bg-white'}`}>
              {day && (
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full self-start
                  ${isToday(day) ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}>
                  {day}
                </span>
              )}
              {items.map((e, j) => {
                const meta = CAT_META[e.category] ?? CAT_META.AUTRE
                return (
                  <div key={j} className="group relative">
                    <div className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight cursor-default
                      ${e.frequency === 'ANNUAL' ? 'bg-amber-50 border border-amber-200' : 'bg-gray-100'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                      <span className="truncate text-gray-700 max-w-[56px]">{e.label}</span>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-0 mb-1 z-30 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg pointer-events-none">
                      <p className="font-semibold mb-0.5">{e.label}</p>
                      <p className="text-gray-300">{e.frequency === 'ANNUAL'
                        ? `${fmt(e.annualAmount ?? 0)} €/an`
                        : `${fmt(e.monthlyAmount ?? 0)} €/mois`}</p>
                      <p className="text-gray-400 mt-0.5">{meta.label}</p>
                      {e.frequency === 'ANNUAL' && <p className="text-amber-300 text-[10px] mt-0.5">Prélèvement annuel</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Légende des catégories présentes ce mois */}
      {presentCategories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {presentCategories.map(cat => {
            const meta = CAT_META[cat] ?? CAT_META.AUTRE
            return (
              <span key={cat} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            )
          })}
        </div>
      )}

      {totalMonth === 0 && (
        <p className="text-center text-sm text-gray-400 mt-6">Aucun prélèvement daté ce mois-ci.</p>
      )}
    </div>
  )
}
