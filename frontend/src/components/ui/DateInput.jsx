import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

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

// Parse une saisie française jj/mm/aaaa (séparateurs / - ou .)
function parseFr(str) {
  if (!str) return null
  const parts = str.trim().split(/[\/\-\.]/)
  if (parts.length !== 3) return null
  const d = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  let   y = parseInt(parts[2], 10)
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null
  if (y >= 0 && y <= 99) y += 2000  // 26 → 2026
  const date = new Date(y, m - 1, d)
  // Vérifie que la date est cohérente (pas de 31/02 etc.)
  if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== y) return null
  return date
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
 * Composant DateInput — champ texte avec popover calendrier.
 * Supporte la saisie manuelle au format jj/mm/aaaa et la sélection par calendrier.
 *
 * Props :
 *   value        string YYYY-MM-DD (ou "")
 *   onChange     (value: string) => void — rappelé avec "" si effacé
 *   placeholder  string (défaut "jj/mm/aaaa")
 *   className    string — classes supplémentaires sur le conteneur
 *   required     bool
 *   name         string — attribut HTML name
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

  const [open,      setOpen]      = useState(false)
  const [viewYear,  setViewYear]  = useState((parsed ?? today).getFullYear())
  const [viewMonth, setViewMonth] = useState((parsed ?? today).getMonth())
  const [popPos,    setPopPos]    = useState({ top: 0, left: 0 })
  const [inputText, setInputText] = useState(parsed ? toFr(parsed) : '')

  const wrapperRef = useRef(null)
  const inputRef   = useRef(null)

  // Synchronise le texte si la valeur change de l'extérieur
  useEffect(() => {
    const p = parseDate(value)
    setInputText(p ? toFr(p) : '')
    if (p) { setViewYear(p.getFullYear()); setViewMonth(p.getMonth()) }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ferme le popover au clic extérieur ou au scroll
  useEffect(() => {
    if (!open) return
    function close(e) {
      if (wrapperRef.current && wrapperRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  function handleInputChange(e) {
    const raw = e.target.value
    const adding = raw.length > inputText.length

    if (!adding) {
      // Suppression — on laisse l'utilisateur effacer librement sans re-formater
      setInputText(raw)
      const p = parseFr(raw)
      if (p) onChange(toIso(p))
      else if (!raw) onChange('')
      return
    }

    // Saisie — extrait les chiffres et insère les / automatiquement
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let formatted
    if (digits.length <= 2)      formatted = digits
    else if (digits.length <= 4) formatted = `${digits.slice(0,2)}/${digits.slice(2)}`
    else                         formatted = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`

    setInputText(formatted)

    if (digits.length === 8) {
      const p = parseFr(formatted)
      if (p) onChange(toIso(p))
    } else if (!digits) {
      onChange('')
    }
  }

  function handleBlur() {
    // Sur perte de focus : si la date est incomplète/invalide, revient à la valeur courante
    const p = parseDate(value)
    if (!parseFr(inputText) && inputText !== '') {
      setInputText(p ? toFr(p) : '')
    }
  }

  function openPicker() {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setPopPos({
      top:  r.bottom + window.scrollY + 6,
      left: popoverAlign === 'right'
        ? r.right + window.scrollX - 256
        : r.left  + window.scrollX,
    })
    setOpen(v => !v)
  }

  function select(date) {
    onChange(toIso(date))
    setInputText(toFr(date))
    setOpen(false)
  }

  function clear() {
    onChange('')
    setInputText('')
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const days = buildDays(viewYear, viewMonth)

  const inputCls = [
    'flex-1 text-sm bg-transparent outline-none',
    value ? 'text-gray-800' : 'text-gray-400',
  ].join(' ')

  const wrapperCls = [
    'inline-flex items-center gap-1 text-sm border rounded-lg px-3 py-1.5 bg-white',
    'hover:border-indigo-400 transition-colors',
    open ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-300',
    className,
  ].join(' ')

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <div className={wrapperCls}>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={10}
          required={required}
          name={name}
          className={inputCls}
          style={{ minWidth: '90px' }}
        />
        <button type="button" onClick={openPicker} tabIndex={-1}
          className="shrink-0 text-indigo-500 hover:text-indigo-700 transition-colors"
          aria-label="Ouvrir le calendrier">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
          </svg>
        </button>
      </div>

      {/* Popover calendrier */}
      {open && createPortal(
        <div role="dialog" onMouseDown={e => e.stopPropagation()}
          style={{ position: 'absolute', top: popPos.top, left: popPos.left, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-64 select-none">

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

          <div className="grid grid-cols-7 mb-1">
            {DOW_FR.map((d, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

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
        </div>,
        document.body
      )}
    </div>
  )
}
