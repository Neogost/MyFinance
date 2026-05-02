import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const DEVIATION_FILL = (dev) => {
  if (dev === null) return '#d1d5db'
  const abs = Math.abs(dev)
  if (abs <= 2)  return '#10b981'   // emerald
  if (abs <= 5)  return '#6366f1'   // indigo
  if (abs <= 10) return '#f59e0b'   // amber
  return '#ef4444'                   // red
}

const DEVIATION_TEXT = (dev) => {
  if (dev === null) return 'text-gray-400'
  const abs = Math.abs(dev)
  if (abs <= 2)  return 'text-emerald-600'
  if (abs <= 5)  return 'text-indigo-600'
  if (abs <= 10) return 'text-amber-600'
  return 'text-red-600'
}

export default function DimensionDonut({
  dimension,
  title,
  targetBreakdowns,
  actual,
  showCoverage = true,
}) {
  const filteredTargets = (targetBreakdowns ?? []).filter(t => t.dimension === dimension)
  if (filteredTargets.length === 0) return null

  const actualByKey = new Map(
    (actual?.breakdown ?? []).map(b => [b.key.toLowerCase(), parseFloat(b.actualPercentage)])
  )

  const configured = filteredTargets.map(t => {
    const actualPct = actualByKey.get(t.key.toLowerCase()) ?? 0
    const targetPct = parseFloat(t.targetPercentage)
    const deviation = actualPct - targetPct
    return { name: t.key, value: actualPct, target: targetPct, deviation, fill: DEVIATION_FILL(deviation) }
  })

  const totalConfiguredActual = configured.reduce((s, d) => s + d.value, 0)
  const autresValue = Math.max(0, 100 - totalConfiguredActual)
  const slices = autresValue > 0.5
    ? [...configured, { name: 'Autres', value: autresValue, fill: '#e5e7eb', isOther: true }]
    : configured

  const goodCount  = configured.filter(d => Math.abs(d.deviation) <= 5).length
  const totalCount = configured.length
  const allGood    = goodCount === totalCount
  const coverage   = actual ? parseFloat(actual.coverageRatio ?? 100) : 100

  const centerColor = allGood ? 'text-emerald-600' : goodCount >= totalCount / 2 ? 'text-amber-600' : 'text-red-600'

  const tooltipFmt = (value, name, props) => {
    const entry = props?.payload
    if (entry?.isOther) return [`${value.toFixed(1)} % (non configuré)`, name]
    const dev = entry?.deviation
    const sign = dev >= 0 ? '+' : ''
    return [`${value.toFixed(1)} % · cible ${entry?.target?.toFixed(0)} % (${sign}${dev?.toFixed(1)} pt)`, name]
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">{title}</span>
        {showCoverage && coverage < 100 && (
          <span className={`text-[10px] ${coverage < 80 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
            Couv. {coverage.toFixed(0)} %
          </span>
        )}
      </div>

      {/* Donut + centre */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={slices}
              cx="50%" cy="50%"
              innerRadius={48} outerRadius={68}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {slices.map((s, i) => <Cell key={i} fill={s.fill} />)}
            </Pie>
            <Tooltip formatter={tooltipFmt} />
          </PieChart>
        </ResponsiveContainer>
        {/* Étiquette centrale */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className={`text-base font-bold leading-none ${centerColor}`}>
              {goodCount}/{totalCount}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">objectifs</div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="space-y-1.5 mt-1">
        {configured.map(s => (
          <div key={s.name} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.fill }} />
              <span className="text-gray-700 truncate">{s.name}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-right">
              <span className="text-gray-600">{s.value.toFixed(1)} %</span>
              <span className="text-gray-400 text-[10px]">/{s.target.toFixed(0)} %</span>
              <span className={`text-[10px] font-semibold ${DEVIATION_TEXT(s.deviation)}`}>
                {s.deviation >= 0 ? '+' : ''}{s.deviation.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
        {autresValue > 0.5 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full shrink-0 bg-gray-200" />
            <span>Autres — {autresValue.toFixed(1)} % non configuré</span>
          </div>
        )}
      </div>
    </div>
  )
}
