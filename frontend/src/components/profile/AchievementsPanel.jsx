import { useState, useEffect } from 'react'
import { getMyAchievements, markAchievementsSeen } from '../../api/achievements'

const PALIER_COLORS = {
  Bronze:  'bg-amber-100  text-amber-700',
  Argent:  'bg-gray-100   text-gray-600',
  Or:      'bg-yellow-100 text-yellow-700',
  Platine: 'bg-cyan-100   text-cyan-700',
  Diamant: 'bg-indigo-100 text-indigo-700',
  Unique:  'bg-indigo-100 text-indigo-600',
}

function PalierBadge({ level, earned }) {
  const color = PALIER_COLORS[level.palierName] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${
      earned ? color : 'bg-gray-50 text-gray-300'
    }`}>
      {level.palierEmoji} {level.palierName}
      {level.threshold != null && (
        <span className="font-normal ml-0.5">
          {parseFloat(level.threshold).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
        </span>
      )}
    </span>
  )
}

function AchievementCard({ achievement }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const locked = achievement.confirmedLevel === 0

  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition cursor-default ${
        locked
          ? 'border-gray-100 bg-gray-50 opacity-60'
          : achievement.isNew
          ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
          : 'border-gray-200 bg-white hover:border-indigo-200'
      }`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {achievement.isNew && (
        <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
          NEW
        </span>
      )}

      <span className="text-2xl leading-none">{achievement.emoji}</span>
      <span className={`text-xs font-semibold text-center leading-tight ${locked ? 'text-gray-400' : 'text-gray-800'}`}>
        {achievement.name}
      </span>

      {achievement.confirmedLevel > 0 && (
        <div className="flex flex-wrap justify-center gap-0.5">
          {achievement.levels.map(lvl => (
            <PalierBadge key={lvl.level} level={lvl} earned={achievement.confirmedLevel >= lvl.level} />
          ))}
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-52 bg-gray-800 text-white text-xs rounded-xl p-3 shadow-xl pointer-events-none">
          <p className="font-semibold mb-1">{achievement.name}</p>
          <p className="text-gray-300 leading-snug">{achievement.description}</p>
          {achievement.confirmedLevel > 0 && achievement.lastUnlockedAt && (
            <p className="mt-1.5 text-indigo-300 text-[10px]">
              Débloqué le {new Date(achievement.lastUnlockedAt).toLocaleDateString('fr-FR')}
            </p>
          )}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  )
}

export default function AchievementsPanel() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    getMyAchievements()
      .then(d => {
        setData(d)
        if (d.unseenCount > 0) markAchievementsSeen().catch(() => {})
      })
      .catch(() => setError('Impossible de charger les hauts faits.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-gray-400">Chargement…</p>
    </div>
  )

  if (error) return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-red-500">{error}</p>
    </div>
  )

  const unlocked = data.achievements.filter(a => a.confirmedLevel > 0)
  const locked   = data.achievements.filter(a => a.confirmedLevel === 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">🏆 Hauts faits</h2>
        <span className="text-xs text-gray-400">
          {data.totalUnlockedLevels} / {data.totalCatalogLevels} paliers
        </span>
      </div>

      {unlocked.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Aucun haut fait débloqué pour l'instant — créez votre première position !
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4">
            {unlocked.map(a => <AchievementCard key={a.code} achievement={a} />)}
          </div>
          {locked.length > 0 && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
                À débloquer ({locked.length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {locked.map(a => <AchievementCard key={a.code} achievement={a} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
