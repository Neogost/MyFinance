import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const DEVIATION_FILL = (dev) => {
  if (dev === null) return '#d1d5db'
  const abs = Math.abs(dev)
  if (abs <= 2)  return '#10b981'
  if (abs <= 5)  return '#6366f1'
  if (abs <= 10) return '#f59e0b'
  return '#ef4444'
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
  className = '',
  size = 'md',
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

  function DonutTooltip({ active, payload }) {
    if (!active || !payload?.[0]) return null
    const e = payload[0].payload
    const style = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', fontSize: 12 }
    if (e.isOther) return (
      <div style={style}>
        <span className="text-gray-400">{e.value.toFixed(1)} % non configuré</span>
      </div>
    )
    const sign = e.deviation >= 0 ? '+' : ''
    return (
      <div style={style} className="min-w-[130px]">
        <p className="font-semibold text-gray-800 mb-1">{e.name}</p>
        <p className="text-gray-500">réel <span className="font-medium text-gray-800">{e.value.toFixed(1)} %</span></p>
        <p className="text-gray-500">cible <span className="text-gray-700">{e.target.toFixed(0)} %</span></p>
        <p className={`font-semibold mt-0.5 ${DEVIATION_TEXT(e.deviation)}`}>écart {sign}{e.deviation.toFixed(1)} pt</p>
      </div>
    )
  }

  const CoverageTag = () => showCoverage && coverage < 100 ? (
    <span className={`text-[10px] ${coverage < 80 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
      Couv. {coverage.toFixed(0)} %
    </span>
  ) : null

  // ── xs : titre + donut + indicateur central ──────────────────────────────
  if (size === 'xs') return (
    <div className={`bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col gap-1 h-full ${className}`}>
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">{title}</span>
        <CoverageTag />
      </div>
      <div className="flex-1 relative min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} cx="50%" cy="50%"
              innerRadius={30} outerRadius={46}
              paddingAngle={2} dataKey="value" strokeWidth={0}
            >
              {slices.map((s, i) => <Cell key={i} fill={s.fill} />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 50 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className={`text-sm font-bold leading-none ${centerColor}`}>{goodCount}/{totalCount}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">obj.</div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── sm : donut + légende 2 colonnes (réel% coloré) ───────────────────────
  if (size === 'sm') return (
    <div className={`bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">{title}</span>
        <CoverageTag />
      </div>
      <div className="relative shrink-0" style={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} cx="50%" cy="50%"
              innerRadius={32} outerRadius={48}
              paddingAngle={2} dataKey="value" strokeWidth={0}
            >
              {slices.map((s, i) => <Cell key={i} fill={s.fill} />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 50 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className={`text-sm font-bold leading-none ${centerColor}`}>{goodCount}/{totalCount}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">obj.</div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto mt-1.5">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {configured.map(s => (
            <div key={s.name} className="flex items-center gap-1 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.fill }} />
              <span className="text-[10px] text-gray-700 truncate">{s.name}</span>
              <span className={`text-[10px] shrink-0 ml-auto font-medium ${DEVIATION_TEXT(s.deviation)}`}>
                {s.value.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── md / lg : complet (réel / cible / écart) ──────────────────────────────
  return (
    <div className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between mb-2 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">{title}</span>
        <CoverageTag />
      </div>

      <div className="relative shrink-0">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={slices} cx="50%" cy="50%"
              innerRadius={48} outerRadius={68}
              paddingAngle={2} dataKey="value" strokeWidth={0}
            >
              {slices.map((s, i) => <Cell key={i} fill={s.fill} />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 50 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className={`text-base font-bold leading-none ${centerColor}`}>{goodCount}/{totalCount}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">objectifs</div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 mt-1">
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
