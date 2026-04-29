import { fmt } from '../../utils/formatting.js'

export default function KpiCard({ label, value, unit = '€', color, sub, labelTooltip }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-1">
      <p className="text-xs text-gray-400 tracking-wide">
        {label}
        {labelTooltip && (
          <span className="ml-1 text-gray-300 text-xs cursor-default relative group">
            ⓘ
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-80 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed font-normal normal-case tracking-normal">
              {labelTooltip}
            </span>
          </span>
        )}
      </p>
      <p className={`text-xl md:text-2xl font-bold amount whitespace-nowrap ${color ?? 'text-gray-900'}`}>
        {value != null ? `${fmt(value)} ${unit}` : '—'}
      </p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
