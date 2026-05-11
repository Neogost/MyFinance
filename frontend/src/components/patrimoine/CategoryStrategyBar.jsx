import { fmt } from './utils'

export default function CategoryStrategyBar({ currentValue, target }) {
  if (!target || target <= 0) return null

  const pct      = Math.min((currentValue / target) * 100, 100)
  const exceeded = currentValue > target

  let barColor, label
  if (exceeded) {
    barColor = 'bg-red-500'
    label    = `Dépassé de ${fmt(currentValue - target)}`
  } else if (pct >= 100) {
    barColor = 'bg-emerald-500'
    label    = `Objectif atteint · ${fmt(target)}`
  } else {
    barColor = 'bg-indigo-500'
    label    = `${pct.toFixed(0)} % · objectif ${fmt(target)}`
  }

  return (
    <div className="mt-2">
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          data-testid="category-progress-bar"
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs mt-0.5 ${exceeded ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
        {label}
      </p>
    </div>
  )
}
