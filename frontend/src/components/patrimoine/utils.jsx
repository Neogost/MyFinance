import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function fmt(value, currency = 'EUR') {
  if (value == null) return '—'
  const symbol = currency === 'EUR' ? ' €' : ` ${currency}`
  return parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + symbol
}

export function fmtCompact(value, currency = 'EUR') {
  if (value == null) return '—'
  const n   = parseFloat(value)
  const abs = Math.abs(n)
  const sym = currency === 'EUR' ? '€' : currency
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M${sym}`
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} K${sym}`
  return `${sign}${abs.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${sym}`
}

export function Amount({ value, currency = 'EUR', prefix = '' }) {
  return (
    <>
      <span className="hidden md:inline">{prefix}{fmt(value, currency)}</span>
      <span className="md:hidden">{prefix}{fmtCompact(value, currency)}</span>
    </>
  )
}

export function fmtUnits(value) {
  if (value == null) return null
  const n = parseFloat(value)
  return n % 1 === 0 ? n.toLocaleString('fr-FR') : n.toLocaleString('fr-FR', { maximumFractionDigits: 6 })
}

export function Tooltip({ children }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos]         = useState({ top: 0, left: 0 })
  const iconRef               = useRef(null)

  function show() {
    if (!iconRef.current) return
    const r = iconRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 6, left: r.left + r.width / 2 + window.scrollX })
    setVisible(true)
  }

  useEffect(() => {
    if (!visible) return
    const hide = () => setVisible(false)
    window.addEventListener('scroll', hide, { passive: true })
    return () => window.removeEventListener('scroll', hide)
  }, [visible])

  return (
    <span className="hidden md:inline-flex items-center ml-1 cursor-default"
      onMouseEnter={show} onMouseLeave={() => setVisible(false)}>
      <span ref={iconRef} className="text-gray-300 text-xs leading-none">ⓘ</span>
      {visible && createPortal(
        <span
          style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 9999 }}
          className="w-72 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 leading-relaxed shadow-xl pointer-events-none">
          {children}
        </span>,
        document.body
      )}
    </span>
  )
}
