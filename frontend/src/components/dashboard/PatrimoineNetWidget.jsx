import { useEffect, useState } from 'react'
import { getPositions, getSnapshots } from '../../api/patrimoine'
import { getDebts } from '../../api/debts'

const fmtEur  = (n) => n == null ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

const TYPE_META = {
  IMMOBILIER:   { label: 'Immobilier',   dot: 'bg-indigo-400', bar: 'bg-indigo-400' },
  ETUDIANT:     { label: 'Prêt étudiant', dot: 'bg-teal-400',   bar: 'bg-teal-400'   },
  VEHICULE:     { label: 'Véhicule',      dot: 'bg-cyan-400',   bar: 'bg-cyan-400'   },
  CONSOMMATION: { label: 'Consommation',  dot: 'bg-amber-400',  bar: 'bg-amber-400'  },
  AUTRE:        { label: 'Autre',         dot: 'bg-gray-400',   bar: 'bg-gray-400'   },
}

export default function PatrimoineNetWidget() {
  const [loading,        setLoading]        = useState(true)
  const [patrimoineBrut, setPatrimoineBrut] = useState(null)
  const [debts,          setDebts]          = useState([])
  const [lastSnapshot,   setLastSnapshot]   = useState(null)

  useEffect(() => {
    Promise.all([
      getPositions({ status: 'ACTIVE' }),
      getDebts().catch(() => []),
      getSnapshots().catch(() => []),
    ]).then(([positions, dettesData, snapshots]) => {
      setPatrimoineBrut(positions.reduce(
        (s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0
      ))
      setDebts(dettesData)
      const sorted = [...snapshots].sort((a, b) =>
        String(b.snapshotDate).localeCompare(String(a.snapshotDate))
      )
      setLastSnapshot(sorted[0] ?? null)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="text-sm text-gray-400">Chargement…</div>
    </div>
  )

  const totalDettes     = debts.reduce((s, d) => s + parseFloat(d.remainingCapital ?? 0), 0)
  const totalMensualite = debts.reduce((s, d) => s + parseFloat(d.monthlyTotalCost ?? 0), 0)
  const net             = patrimoineBrut - totalDettes
  const debtRatio       = patrimoineBrut > 0 ? Math.min(1, totalDettes / patrimoineBrut) : 0
  const debtPct         = Math.round(debtRatio * 100)
  const netIsNeg        = net < 0

  const snapValue = lastSnapshot?.totalCurrentValueEur != null
    ? parseFloat(lastSnapshot.totalCurrentValueEur) : null
  const delta     = snapValue != null ? patrimoineBrut - snapValue : null
  const deltaPos  = delta != null && delta >= 0

  const debtColor = debtPct > 33 ? 'text-red-500' : debtPct > 20 ? 'text-amber-500' : 'text-emerald-600'
  const barRed    = debtPct > 33 ? 'bg-red-400'   : debtPct > 20 ? 'bg-amber-400'   : 'bg-emerald-300'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-800">Patrimoine net</h3>
        {delta != null && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full amount ${deltaPos ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {deltaPos ? '+' : ''}{fmtEur(delta)}
            <span className="font-normal text-gray-400 ml-1">vs {fmtDate(lastSnapshot.snapshotDate)}</span>
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs text-gray-400 mb-1">Patrimoine brut</p>
          <p className="text-xl font-bold text-gray-900 amount">{fmtEur(patrimoineBrut)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Dettes</p>
          <p className="text-xl font-bold text-red-500 amount">
            {totalDettes > 0 ? '−' : ''}{fmtEur(totalDettes)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Patrimoine net</p>
          <p className={`text-xl font-bold amount ${netIsNeg ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmtEur(net)}
          </p>
        </div>
      </div>

      {/* Barre taux d'endettement */}
      <div className="relative">
        <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
          <div className="bg-emerald-400 h-full transition-all" style={{ width: `${100 - debtPct}%` }} />
          <div className={`${barRed} h-full transition-all`}   style={{ width: `${debtPct}%` }} />
        </div>
        {totalDettes > 0 && (
          <div className="absolute top-0 h-2.5 w-px bg-gray-400 opacity-60" style={{ left: '67%' }} />
        )}
      </div>
      <div className="flex justify-between mt-1.5 mb-4 text-xs">
        <span className="text-gray-400">{100 - debtPct} % libre de dettes</span>
        {totalDettes > 0 && (
          <span className={`font-medium ${debtColor}`}>
            {debtPct} % endetté
            {debtPct > 33 && <span className="text-gray-400 font-normal"> · seuil 33 % dépassé</span>}
          </span>
        )}
      </div>

      {/* Détail des dettes */}
      {debts.length > 0 && (
        <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
          {debts.map(d => {
            const meta     = TYPE_META[d.type] ?? TYPE_META.AUTRE
            const progress = Math.min(100, Math.max(0, parseFloat(d.repaymentProgress ?? 0)))
            const freeYear = d.endDate ? new Date(d.endDate).getFullYear() : null

            return (
              <div key={d.id}>
                {/* Ligne principale */}
                <div className="flex items-center gap-3 text-sm mb-1.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                  <span className="flex-1 font-medium text-gray-700 truncate">{d.label}</span>
                  <span className="text-xs text-gray-400 shrink-0">{meta.label}</span>
                  <span className="font-semibold text-gray-800 shrink-0 amount">{fmtEur(parseFloat(d.remainingCapital ?? 0))}</span>
                  {d.monthlyTotalCost != null && (
                    <span className="text-xs text-gray-400 shrink-0 amount">{fmtEur(d.monthlyTotalCost)}/mois</span>
                  )}
                </div>
                {/* Barre de progression + Libre en */}
                <div className="flex items-center gap-2 pl-5">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${meta.bar} h-full rounded-full transition-all`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{Math.round(progress)} % remb.</span>
                  {freeYear && (
                    <span className="text-xs text-emerald-600 font-medium shrink-0">· Libre en {freeYear}</span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Total mensualités */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">Total mensualités</span>
            <span className="font-bold text-gray-800 amount">{fmtEur(totalMensualite)}/mois</span>
          </div>
        </div>
      )}

    </div>
  )
}
