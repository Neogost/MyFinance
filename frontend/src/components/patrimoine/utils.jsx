export function fmt(value, currency = 'EUR') {
  if (value == null) return '—'
  const symbol = currency === 'EUR' ? ' €' : ` ${currency}`
  return parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + symbol
}

export function fmtUnits(value) {
  if (value == null) return null
  const n = parseFloat(value)
  return n % 1 === 0 ? n.toLocaleString('fr-FR') : n.toLocaleString('fr-FR', { maximumFractionDigits: 6 })
}

export function Tooltip({ children }) {
  return (
    <span className="relative group inline-flex items-center ml-1 cursor-default">
      <span className="text-gray-300 text-xs leading-none">ⓘ</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed normal-case tracking-normal font-normal">
        {children}
      </span>
    </span>
  )
}
