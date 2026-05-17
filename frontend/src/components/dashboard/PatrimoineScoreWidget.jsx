import { useEffect, useState } from 'react'
import { getPatrimoineScore } from '../../api/patrimoine'

const PROFILE_CONFIG = {
  OPTIMISE:  { emoji: '🚀', label: 'Optimisé',  colorClass: 'text-emerald-700', bgClass: 'bg-emerald-50',  borderClass: 'border-emerald-200' },
  DYNAMIQUE: { emoji: '📈', label: 'Dynamique', colorClass: 'text-blue-700',    bgClass: 'bg-blue-50',     borderClass: 'border-blue-200' },
  EQUILIBRE: { emoji: '⚖️', label: 'Équilibré', colorClass: 'text-indigo-700',  bgClass: 'bg-indigo-50',   borderClass: 'border-indigo-200' },
  PRUDENT:   { emoji: '🛡️', label: 'Prudent',   colorClass: 'text-amber-700',   bgClass: 'bg-amber-50',    borderClass: 'border-amber-200' },
  FRAGILE:   { emoji: '⚠️', label: 'Fragile',   colorClass: 'text-red-700',     bgClass: 'bg-red-50',      borderClass: 'border-red-200' },
}

function globalBarColor(pct) {
  return pct > 75 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-400'
}

function ScoreBar({ score, maxScore, missingData, h = 'h-1.5' }) {
  const pct   = maxScore > 0 ? (score / maxScore) * 100 : 0
  const color = missingData ? 'bg-gray-300' : pct > 75 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className={`flex-1 bg-gray-100 rounded-full ${h}`}>
        <div className={`${color} ${h} rounded-full transition-all`} style={{ width: missingData ? '100%' : `${pct}%` }} />
      </div>
      {missingData
        ? <span className="text-xs font-bold text-gray-400 w-9 text-right shrink-0">—</span>
        : <span className="text-xs font-semibold text-gray-400 w-9 text-right shrink-0">{score}/{maxScore}</span>
      }
    </div>
  )
}

function AxeRow({ axe, compact = false }) {
  const [visible, setVisible] = useState(false)
  return (
    <div
      className="relative flex items-center gap-2 text-xs cursor-default"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className={`shrink-0 truncate underline decoration-dotted decoration-gray-300 ${compact ? 'w-28' : 'w-36'} ${axe.missingData ? 'text-gray-300' : 'text-gray-500'}`}>
        {axe.label}
      </span>
      <ScoreBar score={axe.score} maxScore={axe.maxScore} missingData={axe.missingData} />
      {axe.missingData && <span className="text-gray-300 shrink-0" title="Données manquantes">?</span>}
      {visible && axe.detail && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-20 pointer-events-none shadow-lg">
          {axe.detail}
          <div className="absolute top-full left-6 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}

export default function PatrimoineScoreWidget({ size = 'md' }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPatrimoineScore()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">Chargement…</div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center px-4">
      Score indisponible.
    </div>
  )

  const profile    = PROFILE_CONFIG[data.profile] ?? PROFILE_CONFIG.PRUDENT
  const globalPct  = data.maxScore > 0 ? (data.totalScore / data.maxScore) * 100 : 0
  const barColor   = globalBarColor(globalPct)

  const ProfileBadge = () => (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${profile.bgClass} ${profile.colorClass} ${profile.borderClass}`}>
      {profile.emoji} {profile.label}
    </span>
  )

  // ── xs : score centré + badge + barre globale ─────────────────────────────
  if (size === 'xs') return (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <span className={`text-4xl font-bold ${profile.colorClass}`}>{data.totalScore}</span>
      <ProfileBadge />
      <div className="w-full">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-gray-400">Score</span>
          <span className="text-[10px] text-gray-400">/ {data.maxScore} pts</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${globalPct}%` }} />
        </div>
      </div>
    </div>
  )

  // ── sm : badge + score + barre + 3 axes les plus faibles ─────────────────
  if (size === 'sm') {
    const weakAxes = [...data.axes]
      .filter(a => !a.missingData)
      .sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore))
      .slice(0, 3)

    return (
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <span className={`text-2xl font-bold ${profile.colorClass}`}>{data.totalScore}</span>
            <span className="text-xs text-gray-400 ml-1">/ {data.maxScore}</span>
          </div>
          <ProfileBadge />
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 shrink-0">
          <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${globalPct}%` }} />
        </div>
        {weakAxes.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Points faibles</p>
            {weakAxes.map(axe => <AxeRow key={axe.id} axe={axe} compact />)}
          </div>
        )}
      </div>
    )
  }

  // ── lg : tous axes plus aérés + conseil bien visible ─────────────────────
  if (size === 'lg') return (
    <div className="flex flex-col h-full gap-5">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs text-indigo-500 uppercase tracking-wide font-semibold">Score Patrimonial</p>
        <ProfileBadge />
      </div>
      <div className="shrink-0">
        <div className="flex justify-between items-baseline mb-2">
          <span className={`text-4xl font-bold ${profile.colorClass}`}>{data.totalScore}</span>
          <span className="text-sm text-gray-400">/ {data.maxScore} pts</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className={`${barColor} h-2.5 rounded-full transition-all`} style={{ width: `${globalPct}%` }} />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {data.axes.map(axe => <AxeRow key={axe.id} axe={axe} />)}
      </div>
      {data.weakestAxisAdvice && (
        <div className="shrink-0 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="font-semibold text-amber-600">💡 </span>
            {data.weakestAxisAdvice}
          </p>
        </div>
      )}
    </div>
  )

  // ── md : layout complet ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs text-indigo-500 uppercase tracking-wide font-semibold">Score Patrimonial</p>
        <ProfileBadge />
      </div>
      <div className="shrink-0">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className={`text-3xl font-bold ${profile.colorClass}`}>{data.totalScore}</span>
          <span className="text-sm text-gray-400">/ {data.maxScore} pts</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${globalPct}%` }} />
        </div>
      </div>
      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
        {data.axes.map(axe => <AxeRow key={axe.id} axe={axe} />)}
      </div>
      {data.weakestAxisAdvice && (
        <div className="shrink-0 pt-3 border-t border-indigo-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-amber-600">💡 </span>
            {data.weakestAxisAdvice}
          </p>
        </div>
      )}
    </div>
  )
}
