import { useState } from 'react'

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtQty(n) {
  if (n == null) return '—'
  const v = parseFloat(n)
  return v === 0 ? '0' : v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 6 })
}

function SortIcon({ active, dir }) {
  return (
    <span className="inline-flex flex-col ml-1 gap-px align-middle">
      <svg className={`w-2 h-2 ${active && dir === 'asc' ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 6 4" fill="currentColor">
        <path d="M3 0L6 4H0L3 0Z" />
      </svg>
      <svg className={`w-2 h-2 ${active && dir === 'desc' ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 6 4" fill="currentColor">
        <path d="M3 4L0 0H6L3 4Z" />
      </svg>
    </span>
  )
}

const COLS = [
  { key: 'label',                   label: 'Position',    align: 'left'  },
  { key: 'currentQuantity',         label: 'Détenu',      align: 'right' },
  { key: 'unrealizedLossEur',       label: 'MV latente',  align: 'right' },
  { key: 'recommendedSellQuantity', label: 'Vendre',      align: 'right' },
  { key: 'estimatedTaxSavingEur',   label: 'Économie',    align: 'right' },
]

export default function TaxLossCandidatesTable({ candidates, title, onSelectCandidate }) {
  const [sortCol, setSortCol] = useState('unrealizedLossEur')
  const [sortDir, setSortDir] = useState('asc')

  if (!candidates?.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">
        Aucune position en moins-value dans ce basket.
      </div>
    )
  }

  function toggleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'label' ? 'asc' : 'asc')
    }
  }

  const sorted = [...candidates].sort((a, b) => {
    const av = sortCol === 'label' ? a.label : parseFloat(a[sortCol] ?? 0)
    const bv = sortCol === 'label' ? b.label : parseFloat(b[sortCol] ?? 0)
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-4 py-3 text-${col.align} text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-indigo-600 transition`}
                >
                  {col.label}
                  <SortIcon active={sortCol === col.key} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const noSell = parseFloat(c.recommendedSellQuantity ?? 0) === 0
              return (
                <tr
                  key={c.positionId}
                  onClick={() => onSelectCandidate?.(c)}
                  className={`border-t border-gray-100 transition ${onSelectCandidate ? 'cursor-pointer hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{c.label}</p>
                    {c.partner && <p className="text-xs text-gray-400">{c.partner}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {fmtQty(c.currentQuantity)} parts
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-red-500 dark:text-red-400">
                    {fmt(c.unrealizedLossEur)} €
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">
                    {noSell ? (
                      <span className="text-gray-400">0 ⚠</span>
                    ) : (
                      <span className="text-indigo-700 dark:text-indigo-300">{fmtQty(c.recommendedSellQuantity)} parts</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold">
                    {noSell ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">{fmt(c.estimatedTaxSavingEur)} €</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {candidates.some(c => parseFloat(c.recommendedSellQuantity ?? 0) === 0) && (
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-amber-700 dark:text-amber-300 bg-amber-50">
          ⚠ Pour les positions marquées 0 part, la PV à compenser est déjà épuisée. Vendre malgré tout reportera la MV sur 10 ans.
        </div>
      )}
    </div>
  )
}
