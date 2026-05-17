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

export default function PerformanceYtdWidget({ onNavigate, size = 'md' }) {
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

  const twr        = data.twrAnnualized
  const mwr        = data.mwrAnnualized
  const gain       = data.absoluteGainEur ?? 0
  const value      = data.currentValueEur ?? 0
  const volatility = data.volatilityAnnualized
  const sharpe     = data.sharpeRatio
  const drawdown   = data.maxDrawdown
  const positive   = twr >= 0

  const valueColor = positive ? 'text-emerald-700' : 'text-red-600'
  const gainColor  = gain >= 0 ? 'text-emerald-700' : 'text-red-600'

  // ── xs : TWR centré + métriques secondaires ────────────────────────────────
  if (size === 'xs') return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-teal-500 uppercase tracking-wide font-semibold">Performance YTD</p>
        <span className="text-[10px] text-gray-400">{new Date().getFullYear()}</span>
      </div>
      {/* TWR centré */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        <div className={`text-3xl font-bold amount ${valueColor}`}>{fmtPct(twr)}</div>
        <p className="text-[10px] text-gray-400">TWR annualisé</p>
      </div>
      {/* Métriques bas */}
      <div className="flex items-center justify-between pt-2 border-t border-teal-100 text-xs">
        <div>
          <div className="text-gray-400 text-[10px]">Valeur actuelle</div>
          <div className="font-semibold text-gray-700 amount">{fmtEur(value)}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-[10px]">Plus-value</div>
          <div className={`font-semibold amount ${gainColor}`}>{fmtSignedEur(gain)}</div>
        </div>
      </div>
    </div>
  )

  // ── sm : TWR + MWR + barre + métriques + bouton ────────────────────────────
  if (size === 'sm') return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs text-teal-500 uppercase tracking-wide font-semibold">Performance YTD</p>
        <span className="text-xs text-gray-400">{new Date().getFullYear()}</span>
      </div>

      {/* TWR principal */}
      <div className="shrink-0">
        <div className={`text-3xl font-bold amount ${valueColor}`}>{fmtPct(twr)}</div>
        <p className="text-xs text-gray-400 mt-0.5">TWR annualisé — performance pure des actifs</p>
      </div>

      {/* Barre visuelle */}
      <div className="shrink-0">
        <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`absolute top-0 h-2 rounded-full transition-all ${positive ? 'bg-emerald-400 left-1/2' : 'bg-red-400 right-1/2'}`}
            style={{ width: `${Math.min(Math.abs(twr) * 100 * 2, 50)}%` }}
          />
          <div className="absolute left-1/2 top-0 h-2 w-px bg-gray-300" />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>−50 %</span><span>0</span><span>+50 %</span>
        </div>
      </div>

      {/* TWR vs MWR */}
      {mwr != null && (
        <div className="shrink-0 flex items-center gap-3 text-xs">
          <div>
            <span className="text-gray-400">TWR </span>
            <span className={`font-semibold amount ${valueColor}`}>{fmtPct(twr)}</span>
          </div>
          <div className="text-gray-300">·</div>
          <div>
            <span className="text-gray-400">MWR </span>
            <span className={`font-semibold amount ${mwr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtPct(mwr)}</span>
          </div>
        </div>
      )}

      {/* Valeur + plus-value */}
      <div className="shrink-0 grid grid-cols-2 gap-2 text-xs pt-2 border-t border-teal-100">
        <div>
          <div className="text-gray-500 mb-0.5">Valeur actuelle</div>
          <div className="font-semibold text-gray-700 amount">{fmtEur(value)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5">Plus-value</div>
          <div className={`font-semibold amount ${gainColor}`}>{fmtSignedEur(gain)}</div>
        </div>
      </div>

      {/* Indicateurs de risque */}
      {(sharpe != null || volatility != null) && (
        <div className="flex-1 grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 min-h-0">
          {sharpe != null && (
            <div>
              <div className="text-gray-400 mb-0.5">Sharpe</div>
              <div className={`font-semibold ${sharpe >= 1 ? 'text-emerald-700' : sharpe >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                {sharpe.toFixed(2)}
              </div>
            </div>
          )}
          {volatility != null && (
            <div>
              <div className="text-gray-400 mb-0.5">Volatilité</div>
              <div className="font-semibold text-gray-700">{(volatility * 100).toFixed(1)} %</div>
            </div>
          )}
        </div>
      )}

      {onNavigate && (
        <button
          onClick={() => onNavigate('performance')}
          className="shrink-0 text-xs text-teal-700 hover:text-teal-900 font-medium text-left transition-colors"
        >
          Voir le détail →
        </button>
      )}
    </div>
  )

  // ── md / lg : complet ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs text-teal-500 uppercase tracking-wide font-semibold">Performance YTD</p>
        <span className="text-xs font-medium text-gray-400">{new Date().getFullYear()}</span>
      </div>

      {/* TWR principal */}
      <div className="shrink-0">
        <div className={`text-3xl font-bold amount ${valueColor}`}>{fmtPct(twr)}</div>
        <p className="text-xs text-gray-400 mt-1">TWR annualisé — performance pure des actifs</p>
      </div>

      {/* Barre visuelle */}
      <div className="shrink-0">
        <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`absolute top-0 h-2 rounded-full transition-all ${positive ? 'bg-emerald-400 left-1/2' : 'bg-red-400 right-1/2'}`}
            style={{ width: `${Math.min(Math.abs(twr) * 100 * 2, 50)}%` }}
          />
          <div className="absolute left-1/2 top-0 h-2 w-px bg-gray-300" />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>−50 %</span><span>0</span><span>+50 %</span>
        </div>
      </div>

      {/* TWR vs MWR */}
      {mwr != null && (
        <div className="shrink-0 flex items-center gap-4 text-xs">
          <div>
            <div className="text-gray-400 mb-0.5">TWR annualisé</div>
            <div className={`font-semibold amount ${valueColor}`}>{fmtPct(twr)}</div>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <div className="text-gray-400 mb-0.5">MWR annualisé</div>
            <div className={`font-semibold amount ${mwr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtPct(mwr)}</div>
          </div>
        </div>
      )}

      {/* Valeur + plus-value */}
      <div className="shrink-0 grid grid-cols-2 gap-3 text-xs pt-3 border-t border-teal-100">
        <div>
          <div className="text-gray-500 mb-0.5">Valeur actuelle</div>
          <div className="font-semibold text-gray-700 amount text-sm">{fmtEur(value)}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-0.5">Plus-value YTD</div>
          <div className={`font-semibold amount text-sm ${gainColor}`}>{fmtSignedEur(gain)}</div>
        </div>
      </div>

      {/* Indicateurs de risque */}
      {(volatility != null || sharpe != null || drawdown != null) && (
        <div className="flex-1 grid grid-cols-3 gap-2 text-xs pt-3 border-t border-gray-100 min-h-0">
          {volatility != null && (
            <div>
              <div className="text-gray-400 mb-0.5">Volatilité</div>
              <div className="font-semibold text-gray-700">{(volatility * 100).toFixed(1)} %</div>
            </div>
          )}
          {sharpe != null && (
            <div>
              <div className="text-gray-400 mb-0.5">Sharpe</div>
              <div className={`font-semibold ${sharpe >= 1 ? 'text-emerald-700' : sharpe >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                {sharpe.toFixed(2)}
              </div>
            </div>
          )}
          {drawdown != null && (
            <div>
              <div className="text-gray-400 mb-0.5">Max drawdown</div>
              <div className="font-semibold text-red-600">{(drawdown * 100).toFixed(1)} %</div>
            </div>
          )}
        </div>
      )}

      {onNavigate && (
        <button
          onClick={() => onNavigate('performance')}
          className="shrink-0 text-xs text-teal-700 hover:text-teal-900 font-medium text-left transition-colors"
        >
          Voir l'analyse complète →
        </button>
      )}
    </div>
  )
}
