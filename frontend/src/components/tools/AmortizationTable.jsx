import { fmt } from './loanSimulatorUtils'

export default function AmortizationTable({
  amortization, showTable, setShowTable, showMonthly, setShowMonthly,
  tableMaxHeight, tableBodyRef,
  ptzEnabled, hasRepayments, loanAmount, totalInterest, totalInsurance,
  ptzAmount, totalPrepayments, currentYear,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <button onClick={() => setShowTable(v => !v)}
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 flex items-center gap-2">
          Tableau d'amortissement
          <span className="text-gray-400">{showTable ? '▲' : '▼'}</span>
        </button>
        {showTable && (
          <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs">
            <button onClick={() => setShowMonthly(false)}
              className={`px-3 py-1.5 transition ${!showMonthly ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Annuel</button>
            <button onClick={() => setShowMonthly(true)}
              className={`px-3 py-1.5 border-l border-gray-200 transition ${showMonthly ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Mensuel</button>
          </div>
        )}
      </div>

      {showTable && (
        <div ref={tableBodyRef} className="overflow-x-auto"
          style={showMonthly && tableMaxHeight ? { maxHeight: tableMaxHeight, overflowY: 'auto' } : {}}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{showMonthly ? 'Mois' : 'Année'}</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700">Mensualité</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: '#f97316' }}>Intérêts</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-indigo-600">Amortissement</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-amber-600">Assurance</th>
                {ptzEnabled && <th className="px-4 py-2.5 text-right text-xs font-semibold text-violet-600">PTZ</th>}
                {hasRepayments && <th className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">Remb. anticipé</th>}
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Capital restant</th>
              </tr>
            </thead>
            <tbody>
              {!showMonthly
                ? amortization.annualSummary.map((row, i) => {
                    const hasPrepay = row.prepayment > 0
                    return (
                      <tr key={row.year} className={hasPrepay ? 'bg-emerald-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium text-gray-700">
                          {currentYear + row.year}
                          <span className="text-xs text-gray-400 ml-1">(an {row.year})</span>
                          {hasPrepay && <span className="ml-1.5 text-xs text-emerald-600 font-semibold">↓</span>}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">{fmt(row.interets + row.amortissement + row.assurance)}</td>
                        <td className="px-4 py-2 text-right" style={{ color: '#f97316' }}>{fmt(row.interets)}</td>
                        <td className="px-4 py-2 text-right text-indigo-600">{fmt(row.amortissement)}</td>
                        <td className="px-4 py-2 text-right text-amber-600">{fmt(row.assurance)}</td>
                        {ptzEnabled && <td className="px-4 py-2 text-right text-violet-600">{fmt(row.ptzPayment)}</td>}
                        {hasRepayments && <td className="px-4 py-2 text-right text-emerald-600 font-semibold">{row.prepayment > 0 ? fmt(row.prepayment) : '—'}</td>}
                        <td className="px-4 py-2 text-right text-gray-500 font-medium">{fmt(row.capitalTotal)}</td>
                      </tr>
                    )
                  })
                : amortization.rows.map((row, i) => {
                    const hasPrepay = row.prepayment > 0
                    return (
                      <tr key={row.month} className={hasPrepay ? 'bg-emerald-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium text-gray-700 tabular-nums">
                          {String(row.month).padStart(3, '0')}
                          <span className="text-xs text-gray-400 ml-1">
                            ({currentYear + Math.floor((row.month - 1) / 12)}-{String(((row.month - 1) % 12) + 1).padStart(2, '0')})
                          </span>
                          {hasPrepay && <span className="ml-1.5 text-xs text-emerald-600 font-semibold">↓ Remb. anticipé</span>}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">{fmt(row.mensualite)}</td>
                        <td className="px-4 py-2 text-right" style={{ color: '#f97316' }}>{fmt(row.interets)}</td>
                        <td className="px-4 py-2 text-right text-indigo-600">{fmt(row.amortissement)}</td>
                        <td className="px-4 py-2 text-right text-amber-600">{fmt(row.assurance)}</td>
                        {ptzEnabled && <td className="px-4 py-2 text-right text-violet-600">{fmt(row.ptzPayment)}</td>}
                        {hasRepayments && <td className="px-4 py-2 text-right text-emerald-600 font-semibold">{row.prepayment > 0 ? fmt(row.prepayment) : '—'}</td>}
                        <td className="px-4 py-2 text-right text-gray-500 font-medium">{fmt(row.capitalTotal)}</td>
                      </tr>
                    )
                  })
              }
              <tr className="bg-indigo-50 font-semibold border-t-2 border-indigo-100">
                <td className="px-4 py-3 text-indigo-800">Total</td>
                <td className="px-4 py-3 text-right text-indigo-800">{fmt(totalInterest + loanAmount + totalInsurance)}</td>
                <td className="px-4 py-3 text-right" style={{ color: '#f97316' }}>{fmt(totalInterest)}</td>
                <td className="px-4 py-3 text-right text-indigo-600">{fmt(loanAmount)}</td>
                <td className="px-4 py-3 text-right text-amber-600">{fmt(totalInsurance)}</td>
                {ptzEnabled && <td className="px-4 py-3 text-right text-violet-600">{fmt(ptzEnabled ? ptzAmount : 0)}</td>}
                {hasRepayments && <td className="px-4 py-3 text-right text-emerald-600">{fmt(totalPrepayments)}</td>}
                <td className="px-4 py-3 text-right text-gray-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
