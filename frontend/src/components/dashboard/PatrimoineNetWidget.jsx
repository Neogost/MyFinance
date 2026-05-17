import { useEffect, useState } from 'react'
import { getPositions, getSnapshots } from '../../api/patrimoine'
import { getDebts } from '../../api/debts'

const fmtEur  = (n) => n == null ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtCompact = (n) => {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 10_000) return (n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' k€'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
}

const TYPE_META = {
  IMMOBILIER:   { label: 'Immobilier',   dot: 'bg-indigo-400', bar: 'bg-indigo-400' },
  ETUDIANT:     { label: 'Prêt étudiant', dot: 'bg-teal-400',   bar: 'bg-teal-400'   },
  VEHICULE:     { label: 'Véhicule',      dot: 'bg-cyan-400',   bar: 'bg-cyan-400'   },
  CONSOMMATION: { label: 'Consommation',  dot: 'bg-amber-400',  bar: 'bg-amber-400'  },
  AUTRE:        { label: 'Autre',         dot: 'bg-gray-400',   bar: 'bg-gray-400'   },
}

export default function PatrimoineNetWidget({ className = '', size = 'md' }) {
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
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
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

  // Barre d'endettement partagée entre les modes
  const DebtBar = () => (
    <>
      <div className="relative">
        <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
          <div className="bg-emerald-400 h-full transition-all" style={{ width: `${100 - debtPct}%` }} />
          <div className={`${barRed} h-full transition-all`} style={{ width: `${debtPct}%` }} />
        </div>
        {totalDettes > 0 && (
          <div className="absolute top-0 h-2.5 w-px bg-gray-400 opacity-60" style={{ left: '67%' }} />
        )}
      </div>
      <div className="flex justify-between mt-1 text-xs">
        <span className="text-gray-400">{100 - debtPct} % libre de dettes</span>
        {totalDettes > 0 && (
          <span className={`font-medium ${debtColor}`}>
            {debtPct} % endetté
            {debtPct > 33 && <span className="text-gray-400 font-normal"> · seuil 33 % dépassé</span>}
          </span>
        )}
      </div>
    </>
  )

  // ── xs : net en grand + KPIs compacts + barre ─────────────────────────────
  if (size === 'xs') return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col h-full justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Patrimoine net</p>
        {delta != null && (
          <span className={`text-[10px] font-semibold amount ${deltaPos ? 'text-emerald-700' : 'text-red-600'}`}>
            {deltaPos ? '+' : ''}{fmtEur(delta)}
            <span className="font-normal text-gray-400 ml-1">vs dernier relevé</span>
          </span>
        )}
      </div>
      {/* Chiffre principal */}
      <p className={`text-2xl font-bold amount text-center ${netIsNeg ? 'text-red-600' : 'text-gray-900'}`}>{fmtEur(net)}</p>
      {/* KPIs secondaires */}
      <div className="flex items-center justify-between text-xs text-gray-500 gap-2">
        <div>
          <span className="text-gray-400">Brut </span>
          <span className="font-semibold text-gray-700 amount">{fmtEur(patrimoineBrut)}</span>
        </div>
        <div className="text-gray-300">·</div>
        <div>
          <span className="text-gray-400">Dettes </span>
          <span className="font-semibold text-red-500 amount">{fmtEur(totalDettes)}</span>
        </div>
      </div>
      {/* Barre */}
      <DebtBar />
    </div>
  )

  // ── sm : 3 KPIs + barre + mensualités ─────────────────────────────────────
  if (size === 'sm') return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col h-full gap-3 ${className}`}>
      <div className="flex items-start justify-between shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">Patrimoine net</h3>
        {delta != null && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full amount ${deltaPos ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {deltaPos ? '+' : ''}{fmtEur(delta)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Brut</p>
          <p className="text-base font-bold text-gray-900 amount">{fmtCompact(patrimoineBrut)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Dettes</p>
          <p className="text-base font-bold text-red-500 amount">{totalDettes > 0 ? '−' : ''}{fmtCompact(totalDettes)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Net</p>
          <p className={`text-base font-bold amount ${netIsNeg ? 'text-red-600' : 'text-emerald-600'}`}>{fmtCompact(net)}</p>
        </div>
      </div>
      <div className="shrink-0"><DebtBar /></div>
      {debts.length > 0 && (
        <div className="flex-1 flex flex-col gap-1.5 pt-2 border-t border-gray-100 min-h-0 overflow-hidden">
          {debts.map(d => {
            const meta     = TYPE_META[d.type] ?? TYPE_META.AUTRE
            const progress = Math.min(100, Math.max(0, parseFloat(d.repaymentProgress ?? 0)))
            return (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                <span className="flex-1 text-gray-600 truncate">{d.label}</span>
                <span className="font-semibold text-gray-800 shrink-0 amount">{fmtEur(parseFloat(d.remainingCapital ?? 0))}</span>
                <div className="w-12 bg-gray-100 rounded-full h-1 overflow-hidden shrink-0">
                  <div className={`${meta.bar} h-full rounded-full`} style={{ width: `${progress}%` }} />
                </div>
              </div>
            )
          })}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs mt-auto">
            <span className="text-gray-500">Total mensualités</span>
            <span className="font-bold text-gray-800 amount">{fmtEur(totalMensualite)}/mois</span>
          </div>
        </div>
      )}
    </div>
  )

  // ── md / lg : complet ──────────────────────────────────────────────────────
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full ${className}`}>
      <div className="flex items-start justify-between mb-5 shrink-0">
        <h3 className="text-base font-semibold text-gray-800">Patrimoine net</h3>
        {delta != null && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full amount ${deltaPos ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {deltaPos ? '+' : ''}{fmtEur(delta)}
            <span className="font-normal text-gray-400 ml-1">vs {fmtDate(lastSnapshot.snapshotDate)}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-5 shrink-0">
        <div>
          <p className="text-xs text-gray-400 mb-1">Patrimoine brut</p>
          <p className="text-xl font-bold text-gray-900 amount">{fmtCompact(patrimoineBrut)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Dettes</p>
          <p className="text-xl font-bold text-red-500 amount">{totalDettes > 0 ? '−' : ''}{fmtCompact(totalDettes)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Patrimoine net</p>
          <p className={`text-xl font-bold amount ${netIsNeg ? 'text-red-600' : 'text-emerald-600'}`}>{fmtCompact(net)}</p>
        </div>
      </div>
      <div className="mb-4 shrink-0"><DebtBar /></div>
      {debts.length > 0 && (
        <div className="flex-1 border-t border-gray-100 pt-2 flex flex-col gap-1.5 min-h-0 overflow-hidden">
          {debts.map(d => {
            const meta     = TYPE_META[d.type] ?? TYPE_META.AUTRE
            const progress = Math.min(100, Math.max(0, parseFloat(d.repaymentProgress ?? 0)))
            const freeYear = d.endDate ? new Date(d.endDate).getFullYear() : null
            return (
              <div key={d.id}>
                {/* Ligne 1 : label + taux */}
                <div className="flex items-center gap-2 text-xs mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                  <span className="flex-1 font-medium text-gray-700 truncate">{d.label}</span>
                  {d.annualRate != null && (
                    <span className="text-gray-400 shrink-0">{(parseFloat(d.annualRate) * 100).toFixed(2)} %/an</span>
                  )}
                </div>
                {/* Ligne 2 : barre + capital + mensualité */}
                <div className="flex items-center gap-2 pl-3.5 text-xs">
                  <div className="flex-1 bg-gray-100 rounded-full h-1 overflow-hidden">
                    <div className={`${meta.bar} h-full rounded-full transition-all`} style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{Math.round(progress)} %{freeYear ? ` · ${freeYear}` : ''}</span>
                  <span className="font-semibold text-gray-800 shrink-0 amount">{fmtEur(parseFloat(d.remainingCapital ?? 0))}</span>
                  {d.monthlyTotalCost != null && (
                    <span className="text-gray-400 shrink-0 amount">{fmtEur(d.monthlyTotalCost)}/mois</span>
                  )}
                </div>
              </div>
            )
          })}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs mt-auto">
            <span className="text-gray-500">Total mensualités</span>
            <span className="font-bold text-gray-800 amount">{fmtEur(totalMensualite)}/mois</span>
          </div>
        </div>
      )}
    </div>
  )
}
