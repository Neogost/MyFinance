import { useState, useEffect, useRef } from 'react'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DOW_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function parseDate(str) {
  if (!str) return null
  const d = new Date(str + 'T12:00:00')
  return isNaN(d) ? null : d
}

function toIso(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toFr(date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isDayDisabled(date, minDate, maxDate) {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  if (minDate) { const m = new Date(minDate); m.setHours(0,0,0,0); if (d < m) return true }
  if (maxDate) { const m = new Date(maxDate); m.setHours(0,0,0,0); if (d > m) return true }
  return false
}

function buildDays(year, month) {
  const firstDay  = new Date(year, month, 1)
  const lastDay   = new Date(year, month + 1, 0)

  // Décalage lundi = 0
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const days = []
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), other: true })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), other: false })
  }
  let next = 1
  while (days.length < 42) {
    days.push({ date: new Date(year, month + 1, next++), other: true })
  }
  return days
}

/**
 * Composant DateInput — remplace <input type="date"> par un popover calendrier
 * stylé Tailwind, cohérent avec le thème indigo de l'application.
 *
 * Props :
 *   value      string YYYY-MM-DD (ou "")
 *   onChange   (value: string) => void   — rappelé avec "" si effacé
 *   placeholder string (défaut "jj/mm/aaaa")
 *   className  string — classes supplémentaires sur le bouton déclencheur
 *   required   bool
 *   name       string — attribut HTML name (compatibilité formulaire)
 *   popoverAlign "left" | "right"  (défaut "left")
 */
export default function DateInput({
  value = '',
  onChange,
  placeholder = 'jj/mm/aaaa',
  className = '',
  required,
  name,
  popoverAlign = 'left',
  minDate = null,
  maxDate = null,
}) {
  const parsed  = parseDate(value)
  const today   = new Date()

  const [open, setOpen]         = useState(false)
  const [viewYear, setViewYear] = useState((parsed ?? today).getFullYear())
  const [viewMonth, setViewMonth] = useState((parsed ?? today).getMonth())
  const ref = useRef(null)

  // Ferme le popover au clic extérieur
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Synchronise la vue si la valeur change de l'extérieur
  useEffect(() => {
    if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()) }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const select = (date) => { onChange(toIso(date)); setOpen(false) }
  const clear  = ()     => { onChange('');           setOpen(false) }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const days = buildDays(viewYear, viewMonth)

  const triggerCls = [
    'flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 bg-white',
    'hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300',
    'transition-colors text-left cursor-pointer',
    value ? 'text-gray-800 border-gray-300' : 'text-gray-400 border-gray-300',
    open ? 'border-indigo-500 ring-2 ring-indigo-200' : '',
    className,
  ].join(' ')

  const alignCls = popoverAlign === 'right' ? 'right-0' : 'left-0'

  return (
    <div ref={ref} className="relative inline-block">
      {/* Champ déclencheur */}
      <button type="button" onClick={() => setOpen(v => !v)} className={triggerCls}
        aria-haspopup="dialog" aria-expanded={open} {...(name ? { name } : {})} {...(required ? { required } : {})}>
        <span className="flex-1 whitespace-nowrap">{value ? toFr(parsed) : placeholder}</span>
        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
        </svg>
      </button>

      {/* Popover calendrier */}
      {open && (
        <div role="dialog"
          className={`absolute top-full mt-1.5 ${alignCls} z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-64 select-none`}>

          {/* Navigation mois / année */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {MONTHS_FR[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">
              ›
            </button>
          </div>

          {/* En-têtes jours */}
          <div className="grid grid-cols-7 mb-1">
            {DOW_FR.map((d, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Grille de jours */}
          <div className="grid grid-cols-7">
            {days.map(({ date, other }, i) => {
              const disabled   = isDayDisabled(date, minDate, maxDate)
              const isSelected = parsed && date.toDateString() === parsed.toDateString()
              const isToday    = date.toDateString() === today.toDateString()
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && select(date)}
                  className={[
                    'text-xs py-1.5 rounded-lg transition-colors',
                    disabled
                      ? 'text-gray-200 cursor-not-allowed'
                      : isSelected
                        ? 'bg-indigo-600 text-white font-semibold'
                        : isToday
                          ? 'text-indigo-600 font-semibold hover:bg-indigo-50'
                          : other
                            ? 'text-gray-300 hover:bg-gray-50'
                            : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700',
                  ].join(' ')}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={clear}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1 py-0.5">
              Effacer
            </button>
            <button type="button" onClick={() => select(today)}
              className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors px-1 py-0.5">
              Aujourd'hui
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
