import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const MEMBER_COLORS = ['#6366f1', '#06b6d4', '#f97316', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{d.name}</p>
      <p className="text-gray-700 amount">{fmtEur.format(d.value)}</p>
      <p className="text-gray-400">{d.pct} %</p>
    </div>
  )
}

export default function PatrimoineByMemberChart({ data }) {
  if (!data?.length) return (
    <div className="text-center text-gray-400 py-12 text-sm">Aucune donnée à afficher.</div>
  )

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={MEMBER_COLORS[i % MEMBER_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
              />
              <span className="text-xs text-gray-700 truncate">{d.name}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400 tabular-nums">{d.pct} %</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums amount">{fmtEur.format(d.value)}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-900">Total foyer</span>
          <span className="text-xs font-bold text-gray-900 tabular-nums amount">{fmtEur.format(total)}</span>
        </div>
      </div>
    </div>
  )
}
