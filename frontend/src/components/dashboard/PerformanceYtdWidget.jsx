import { useEffect, useState } from 'react'
import { getGlobalPerformance } from '../../api/performance'

function fmtPct(val) {
  if (val == null) return '—'
  return (val >= 0 ? '+' : '') + (val * 100).toFixed(2) + ' %/an'
}

function fmtEur(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

function fmtSignedEur(val) {
  if (val == null) return '—'
  const s = fmtEur(Math.abs(val))
  return val >= 0 ? `+${s}` : `−${s}`
}

export default function PerformanceYtdWidget({ onNavigate }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ytdFrom = `${new Date().getFullYear()}-01-01`
    getGlobalPerformance(ytdFrom, null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">Chargement…</div>
  )
  if (!data || data.twrAnnualized == null) return (
    <div className="flex flex-col h-full">
      <p className="text-xs text-teal-500 uppercase tracking-wide font-semibold mb-2">Performance YTD</p>
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm text-center px-2">
        Pas encore de performance calculable cette année.
      </div>
    </div>
  )

  const twr      = data.twrAnnualized
  const gain     = data.absoluteGainEur ?? 0
  const value    = data.currentValueEur ?? 0
  const positive = twr >= 0

  const valueColor = positive ? 'text-emerald-700' : 'text-red-600'
  const gainColor  = gain >= 0 ? 'text-emerald-700' : 'text-red-600'

  return (
    <div className="flex flex-col h-full space-y-4">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-teal-500 uppercase tracking-wide font-semibold">Performance YTD</p>
        <span className="text-xs font-medium text-gray-400">
          {new Date().getFullYear()}
        </span>
      </div>

      {/* TWR principal */}
      <div>
        <div className={`text-3xl font-bold ${valueColor}`}>{fmtPct(twr)}</div>
        <p className="text-xs text-gray-400 mt-1">TWR annualisé — performance pure des actifs</p>
      </div>

      {/* Bandeau secondaire : valeur + plus-value */}
      <div className="flex-1 grid grid-cols-2 gap-2 text-xs pt-2 border-t border-teal-100">
        <div>
          <div className="text-gray-500 mb-0.5">Valeur actuelle</div>
          <div className="font-semibold text-gray-700">{fmtEur(value)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5">Plus-value</div>
          <div className={`font-semibold ${gainColor}`}>{fmtSignedEur(gain)}</div>
        </div>
      </div>

      {/* Lien vers la page complète */}
      {onNavigate && (
        <button
          onClick={() => onNavigate('performance')}
          className="text-xs text-teal-700 hover:text-teal-900 font-medium text-left transition-colors"
        >
          Voir le détail →
        </button>
      )}
    </div>
  )
}
