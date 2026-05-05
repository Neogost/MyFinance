import { useState, useEffect, useRef } from 'react'

// ── Constantes ────────────────────────────────────────────────────────────────

const MONTHS_FR  = ['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.']
const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DOW_FR     = ['L','M','M','J','V','S','D']

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null
  const d = new Date(str + 'T12:00:00')
  return isNaN(d) ? null : d
}

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function toFr(d) {
  return d?.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) ?? ''
}

function sameDay(a, b) {
  return a && b && a.toDateString() === b.toDateString()
}

/** Retourne true si date est en dehors de [minDate, maxDate] (comparaison jour) */
function isDayDisabled(date, minDate, maxDate) {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  if (minDate) { const m = new Date(minDate); m.setHours(0, 0, 0, 0); if (d < m) return true }
  if (maxDate) { const m = new Date(maxDate); m.setHours(0, 0, 0, 0); if (d > m) return true }
  return false
}

/** Retourne true si tout le mois est hors plage */
function isMonthDisabled(year, month, minDate, maxDate) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  if (minDate) { const m = new Date(minDate); m.setHours(0,0,0,0); if (last < m) return true }
  if (maxDate) { const m = new Date(maxDate); m.setHours(0,0,0,0); if (first > m) return true }
  return false
}

/** Retourne true si toute l'année est hors plage */
function isYearDisabled(year, minDate, maxDate) {
  const first = new Date(year, 0, 1)
  const last  = new Date(year, 11, 31)
  if (minDate) { const m = new Date(minDate); m.setHours(0,0,0,0); if (last < m) return true }
  if (maxDate) { const m = new Date(maxDate); m.setHours(0,0,0,0); if (first > m) return true }
  return false
}

function buildDays(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  let dow = first.getDay() - 1; if (dow < 0) dow = 6
  const days = []
  for (let i = dow - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i),      other: true  })
  for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(year, month, i), other: false })
  let n = 1
  while (days.length < 42) days.push({ date: new Date(year, month + 1, n++), other: true })
  return days
}

// ── Sous-composant : un panneau calendrier ─────────────────────────────────────

function CalendarPanel({ year, month, onYearChange, onMonthChange,
  parsedFrom, parsedTo, hover, onHover, onDayClick, side, minDate, maxDate }) {

  const [view, setView] = useState('days')          // 'days' | 'months' | 'years'
  const [yearPage, setYearPage] = useState(() => Math.floor(year / 12) * 12)
  const today = new Date()

  // Synchronise la page d'années si l'année change depuis l'extérieur
  useEffect(() => {
    setYearPage(Math.floor(year / 12) * 12)
  }, [year])

  const effectiveTo = parsedTo ?? hover

  // ── Navigation jours ──────────────────────────────────────────────────────
  const prevM = () => {
    if (month === 0) { onYearChange(year - 1); onMonthChange(11) }
    else onMonthChange(month - 1)
  }
  const nextM = () => {
    if (month === 11) { onYearChange(year + 1); onMonthChange(0) }
    else onMonthChange(month + 1)
  }

  // ── Vue ANNÉES ────────────────────────────────────────────────────────────
  if (view === 'years') {
    const years = Array.from({ length: 12 }, (_, i) => yearPage + i)
    return (
      <div className="w-44">
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setYearPage(y => y - 12)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">‹</button>
          <span className="text-xs font-semibold text-gray-500">{yearPage} – {yearPage + 11}</span>
          <button type="button" onClick={() => setYearPage(y => y + 12)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">›</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {years.map(y => {
            const disabled = isYearDisabled(y, minDate, maxDate)
            return (
              <button key={y} type="button"
                onClick={() => !disabled && (onYearChange(y), setView('months'))}
                disabled={disabled}
                className={`text-xs py-1.5 rounded-lg transition-colors font-medium ${
                  disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : y === year
                      ? 'bg-indigo-600 text-white'
                      : y === today.getFullYear()
                        ? 'text-indigo-600 hover:bg-indigo-50'
                        : 'text-gray-700 hover:bg-gray-100'
                }`}>
                {y}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Vue MOIS ─────────────────────────────────────────────────────────────
  if (view === 'months') {
    return (
      <div className="w-44">
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => { onYearChange(year - 1) }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">‹</button>
          <button type="button" onClick={() => setView('years')}
            className="text-xs font-semibold text-gray-700 hover:text-indigo-600 transition-colors px-1">{year}</button>
          <button type="button" onClick={() => { onYearChange(year + 1) }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">›</button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS_FR.map((label, m) => {
            const disabled = isMonthDisabled(year, m, minDate, maxDate)
            return (
              <button key={m} type="button"
                onClick={() => !disabled && (onMonthChange(m), setView('days'))}
                disabled={disabled}
                className={`text-xs py-1.5 rounded-lg transition-colors font-medium ${
                  disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : m === month
                      ? 'bg-indigo-600 text-white'
                      : m === today.getMonth() && year === today.getFullYear()
                        ? 'text-indigo-600 hover:bg-indigo-50'
                        : 'text-gray-700 hover:bg-gray-100'
                }`}>
                {label}
              </button>
            )
          })}
        </div>
        <button type="button" onClick={() => setView('days')}
          className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors text-center py-1">
          ← Retour
        </button>
      </div>
    )
  }

  // ── Vue JOURS ─────────────────────────────────────────────────────────────
  const days = buildDays(year, month)

  return (
    <div className="w-44">
      {/* En-tête navigation */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevM}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">‹</button>
        <button type="button"
          onClick={() => setView('months')}
          className="text-xs font-semibold text-gray-700 hover:text-indigo-600 transition-colors px-1 flex items-center gap-1">
          {MONTHS_FULL[month]}
          <span className="text-gray-400 text-xs font-normal">{year}</span>
        </button>
        <button type="button" onClick={nextM}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">›</button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_FR.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-400 py-0.5">{d}</div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7">
        {days.map(({ date, other }, i) => {
          const disabled  = isDayDisabled(date, minDate, maxDate)
          const isFrom    = sameDay(date, parsedFrom)
          const isTo      = sameDay(date, parsedTo)
          const isHover   = sameDay(date, hover)
          const isEndpoint = isFrom || isTo || (isHover && !parsedTo)
          const inRange = parsedFrom && effectiveTo && date > parsedFrom && date < effectiveTo

          let cls = 'text-xs py-1 transition-colors '

          if (disabled) {
            cls += 'rounded-full text-gray-200 cursor-not-allowed '
          } else if (isEndpoint) {
            cls += 'bg-indigo-600 text-white font-semibold z-10 '
            const hasRange = parsedFrom && (parsedTo || hover)
            if (isFrom && hasRange && !sameDay(parsedFrom, effectiveTo)) cls += 'rounded-l-full '
            else if ((isTo || isHover) && hasRange && !sameDay(parsedFrom, effectiveTo)) cls += 'rounded-r-full '
            else cls += 'rounded-full '
          } else if (inRange) {
            cls += 'bg-indigo-100 text-indigo-700 rounded-none '
          } else if (sameDay(date, today)) {
            cls += 'rounded-full text-indigo-600 font-semibold hover:bg-indigo-50 '
          } else if (other) {
            cls += 'rounded-full text-gray-300 hover:bg-gray-50 '
          } else {
            cls += 'rounded-full text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 '
          }

          return (
            <button key={i} type="button"
              disabled={disabled}
              onClick={() => !disabled && onDayClick(date)}
              onMouseEnter={() => !disabled && onHover(date)}
              onMouseLeave={() => onHover(null)}
              className={cls}>
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

/**
 * DateRangeInput — sélecteur de plage de dates avec double calendrier Tailwind.
 *
 * - Double calendrier côte à côte avec navigation indépendante
 * - Sélecteur rapide : clic sur le mois → grille 12 mois,
 *   clic sur l'année → grille 12 ans (navigation par décennie)
 * - Mise en évidence de la plage au survol (hover preview)
 *
 * Props :
 *   from, to        string YYYY-MM-DD (ou "")
 *   onFromChange    (value: string) => void
 *   onToChange      (value: string) => void
 *   placeholder     string
 *   className       classes supplémentaires sur le déclencheur
 */
export default function DateRangeInput({
  from = '', to = '',
  onFromChange, onToChange,
  placeholder = 'Sélectionner une période',
  className = '',
  minDate = null,   // Date object ou null — jours antérieurs grisés/désactivés
  maxDate = null,   // Date object ou null — jours postérieurs grisés/désactivés
}) {
  const parsedFrom = parseDate(from)
  const parsedTo   = parseDate(to)
  const today      = new Date()

  const [open, setOpen]           = useState(false)
  const [selecting, setSelecting] = useState('from')
  const [hover, setHover]         = useState(null)

  // Calendrier gauche (début)
  const [leftYear,  setLeftYear]  = useState(() => (parsedFrom ?? today).getFullYear())
  const [leftMonth, setLeftMonth] = useState(() => (parsedFrom ?? today).getMonth())

  // Calendrier droit (fin) — décalé d'un mois par défaut
  const [rightYear,  setRightYear]  = useState(() => {
    const d = parsedTo ?? new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return d.getFullYear()
  })
  const [rightMonth, setRightMonth] = useState(() => {
    const d = parsedTo ?? new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return d.getMonth()
  })

  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const openCalendar = () => {
    setSelecting('from')
    setHover(null)
    if (parsedFrom) { setLeftYear(parsedFrom.getFullYear()); setLeftMonth(parsedFrom.getMonth()) }
    if (parsedTo)   { setRightYear(parsedTo.getFullYear());  setRightMonth(parsedTo.getMonth())  }
    setOpen(true)
  }

  const handleDayClick = (date) => {
    if (selecting === 'from') {
      onFromChange(toIso(date))
      onToChange('')
      setSelecting('to')
    } else {
      if (parsedFrom && date < parsedFrom) {
        // Swap : nouvelle date < début → inverser
        onToChange(from)
        onFromChange(toIso(date))
      } else {
        onToChange(toIso(date))
      }
      setHover(null)
      setOpen(false)
    }
  }

  const clear = () => {
    onFromChange(''); onToChange('')
    setSelecting('from'); setHover(null); setOpen(false)
  }

  // ── Libellé déclencheur ───────────────────────────────────────────────────
  let label
  if (parsedFrom && parsedTo)  label = `${toFr(parsedFrom)} → ${toFr(parsedTo)}`
  else if (parsedFrom)         label = `Du ${toFr(parsedFrom)} …`

  const triggerCls = [
    'flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 bg-white cursor-pointer',
    'hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors text-left w-full',
    label ? 'text-gray-800 border-gray-300' : 'text-gray-400 border-gray-300',
    open  ? 'border-indigo-500 ring-2 ring-indigo-200' : '',
    className,
  ].join(' ')

  return (
    <div ref={ref} className="relative inline-block w-full">
      {/* Déclencheur */}
      <button type="button" onClick={openCalendar} className={triggerCls}>
        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
        </svg>
        <span className="flex-1 whitespace-nowrap">{label ?? placeholder}</span>
        {(parsedFrom || parsedTo) && (
          <button type="button"
            onClick={e => { e.stopPropagation(); clear() }}
            className="text-gray-300 hover:text-red-400 shrink-0 transition-colors leading-none">
            ✕
          </button>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-4 select-none">

          {/* Indicateur de phase */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`flex-1 text-center text-xs font-medium py-1 rounded-lg transition-colors ${
              selecting === 'from' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              ① Date de début{parsedFrom ? ` — ${toFr(parsedFrom)}` : ''}
            </span>
            <span className="text-gray-300">→</span>
            <span className={`flex-1 text-center text-xs font-medium py-1 rounded-lg transition-colors ${
              selecting === 'to' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              ② Date de fin{parsedTo ? ` — ${toFr(parsedTo)}` : ''}
            </span>
          </div>

          {/* Double calendrier */}
          <div className="flex gap-6">
            {/* Calendrier gauche — début */}
            <div>
              <p className="text-xs text-gray-400 text-center mb-2">Début</p>
              <CalendarPanel
                year={leftYear}  month={leftMonth}
                onYearChange={setLeftYear} onMonthChange={setLeftMonth}
                parsedFrom={parsedFrom} parsedTo={parsedTo}
                hover={selecting === 'to' ? hover : null}
                onHover={selecting === 'to' ? setHover : () => {}}
                onDayClick={handleDayClick}
                side="left"
                minDate={minDate} maxDate={maxDate}
              />
            </div>

            {/* Séparateur vertical */}
            <div className="w-px bg-gray-100 self-stretch" />

            {/* Calendrier droit — fin */}
            <div>
              <p className="text-xs text-gray-400 text-center mb-2">Fin</p>
              <CalendarPanel
                year={rightYear}  month={rightMonth}
                onYearChange={setRightYear} onMonthChange={setRightMonth}
                parsedFrom={parsedFrom} parsedTo={parsedTo}
                hover={selecting === 'to' ? hover : null}
                onHover={selecting === 'to' ? setHover : () => {}}
                onDayClick={handleDayClick}
                side="right"
                minDate={minDate} maxDate={maxDate}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
            <button type="button" onClick={clear}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1">
              Effacer
            </button>
            <div className="flex gap-3">
              {selecting === 'to' && (
                <button type="button"
                  onClick={() => { onToChange(toIso(today)); setHover(null); setOpen(false) }}
                  className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors px-2 py-1">
                  Fin = aujourd'hui
                </button>
              )}
              {selecting === 'from' && (
                <button type="button"
                  onClick={() => { onFromChange(toIso(today)); onToChange(''); setSelecting('to') }}
                  className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors px-2 py-1">
                  Début = aujourd'hui
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
