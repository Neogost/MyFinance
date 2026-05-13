import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const MONTHS_FR = [
  'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin',
  'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.',
]
const MONTHS_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function parseYearMonth(str) {
  if (!str) return null
  const m = str.match(/^(\d{4})-(0[1-9]|1[0-2])/)
  if (!m) return null
  return { year: parseInt(m[1]), month: parseInt(m[2]) - 1 }
}

function toIso(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

/**
 * MonthInput — remplace <input type="month"> par un popover stylé Tailwind.
 *
 * Props :
 *   value      string YYYY-MM-DD ou YYYY-MM (ou "")
 *   onChange   (value: string YYYY-MM-DD) => void
 *   placeholder string (défaut "mm/aaaa")
 *   className  string
 *   required   bool
 *   name       string
 */
export default function MonthInput({
  value = '',
  onChange,
  placeholder = 'mm/aaaa',
  className = '',
  required,
  name,
}) {
  const parsed = parseYearMonth(value)
  const now    = new Date()

  const [open,     setOpen]     = useState(false)
  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear())
  const [popPos,   setPopPos]   = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  useEffect(() => {
    if (parsed) setViewYear(parsed.year)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  function select(month) {
    onChange(toIso(viewYear, month))
    setOpen(false)
  }

  const triggerLabel = parsed
    ? `${MONTHS_LONG[parsed.month]} ${parsed.year}`
    : placeholder

  const triggerCls = [
    'flex items-center gap-2 text-sm border rounded-lg px-3 py-2.5 bg-white w-full',
    'hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300',
    'transition-colors text-left cursor-pointer',
    parsed ? 'text-gray-800 border-gray-300' : 'text-gray-400 border-gray-300',
    open ? 'border-indigo-500 ring-2 ring-indigo-200' : '',
    className,
  ].join(' ')

  function openPicker() {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPopPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX })
    setOpen(v => !v)
  }

  return (
    <div className="relative">
      <button ref={triggerRef} type="button" onClick={openPicker} className={triggerCls}
        aria-haspopup="dialog" aria-expanded={open}
        {...(name ? { name } : {})} {...(required ? { required } : {})}>
        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
        </svg>
        <span className="flex-1">{triggerLabel}</span>
      </button>

      {open && createPortal(
        <div role="dialog" onMouseDown={e => e.stopPropagation()}
          style={{ position: 'absolute', top: popPos.top, left: popPos.left, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-56 select-none">

          {/* Navigation année */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setViewYear(y => y - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-700">{viewYear}</span>
            <button type="button" onClick={() => setViewYear(y => y + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors text-base leading-none">
              ›
            </button>
          </div>

          {/* Grille des 12 mois */}
          <div className="grid grid-cols-3 gap-1">
            {MONTHS_FR.map((label, i) => {
              const isSelected = parsed && parsed.year === viewYear && parsed.month === i
              const isCurrent  = now.getFullYear() === viewYear && now.getMonth() === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(i)}
                  className={[
                    'text-xs py-2 rounded-lg transition-colors font-medium',
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : isCurrent
                        ? 'text-indigo-600 hover:bg-indigo-50'
                        : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
