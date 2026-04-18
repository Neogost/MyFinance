import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { getSalaryEvolution } from '../../api/dashboard'

// Formate une date ISO (2024-01-01) en libellé court (Jan 2024)
function formatPeriod(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

// Formate un montant en € pour le tooltip
function formatEuros(value) {
  return `${value?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const companyName = payload[0]?.payload?.companyName

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {companyName && (
        <p className="text-gray-500 text-xs mb-2 amount">{companyName}</p>
      )}
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium text-gray-700 amount">{formatEuros(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function SalaryEvolutionChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getSalaryEvolution()
      .then(points => {
        setData(points.map(p => ({
          ...p,
          periodLabel: formatPeriod(p.period),
        })))
      })
      .catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Chargement…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        {error}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm gap-2">
        <p>Aucun bulletin de paie saisi.</p>
        <p className="text-xs">Rendez-vous dans <span className="font-medium">Revenus → Salariat</span> pour saisir vos bulletins mensuels.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="periodLabel"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={v => `${(v / 1000).toFixed(0)}k `}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
        />
        <Line
          type="monotone"
          dataKey="grossSalary"
          name="Brut"
          stroke="#111827"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="taxableNetSalary"
          name="Net fiscal"
          stroke="#7c3aed"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="netSalary"
          name="Net versé"
          stroke="#059669"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="incomeTaxWithholding"
          name="Prélèvement à la source"
          stroke="#d97706"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
