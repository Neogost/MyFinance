import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getSalaryContracts } from '../../api/income'
import { getRevisions } from '../../api/income'

const fmtEur = v =>
  v != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
    : '—'

// Le tooltip affiche les valeurs reconstituées (totaux cumulés), pas les deltas
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {d.companyName && <p className="text-gray-400 mb-2">{d.companyName}</p>}
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Brut</span>
        <span className="font-medium text-gray-700">{fmtEur(d.brut)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: '#7c3aed' }}>Net imposable</span>
        <span className="font-medium text-gray-700">{fmtEur(d.netImposable)}</span>
      </div>
      {d.netAfterTax != null && (
        <div className="flex justify-between gap-4">
          <span style={{ color: '#059669' }}>Net d'impôt</span>
          <span className="font-medium text-gray-700">{fmtEur(d.netAfterTax)}</span>
        </div>
      )}
    </div>
  )
}

function buildYearlyData(contracts, revisionsMap) {
  const currentYear = new Date().getFullYear()

  const years = new Set()
  contracts.forEach(c => {
    const start = c.startDate ? new Date(c.startDate).getFullYear() : currentYear
    const end   = c.endDate   ? new Date(c.endDate).getFullYear()   : currentYear
    for (let y = start; y <= end; y++) years.add(y)
  })
  if (!years.size) return []

  return [...years].sort().map(year => {
    const dec31 = new Date(year, 11, 31)

    // Contrat le plus récent actif durant cette année
    const activeContract = contracts
      .filter(c => {
        const sy = c.startDate ? new Date(c.startDate).getFullYear() : 0
        const ey = c.endDate   ? new Date(c.endDate).getFullYear()   : 9999
        return sy <= year && year <= ey
      })
      .sort((a, b) => new Date(b.startDate ?? 0) - new Date(a.startDate ?? 0))[0]

    if (!activeContract) return null

    // Révision active au 31 décembre de l'année
    const revisions = revisionsMap[activeContract.id] ?? []
    const activeRevision = revisions
      .filter(r => new Date(r.effectiveDate) <= dec31)
      .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))[0]

    const brut = activeRevision?.annualGrossSalary ?? activeContract.annualGrossSalary

    // Les ratios sont constants pour un contrat donné (isCadre + prevoyance ne changent pas)
    const baseBrut = activeContract.annualGrossSalary
    const netImposable = baseBrut > 0 && activeContract.annualNetImposable != null
      ? brut * (activeContract.annualNetImposable / baseBrut)
      : null
    const netAfterTax = baseBrut > 0 && activeContract.annualNetAfterTax != null
      ? brut * (activeContract.annualNetAfterTax / baseBrut)
      : null

    // Valeurs brutes conservées pour le tooltip
    const brutRounded         = Math.round(brut)
    const netImposableRounded = netImposable != null ? Math.round(netImposable) : null
    const netAfterTaxRounded  = netAfterTax  != null ? Math.round(netAfterTax)  : null

    // Segments cumulés (du bas vers le haut)
    // segBase    = net d'impôt  (ce que l'utilisateur touche réellement)
    // segImpot   = impôt estimé (netImposable - netAfterTax)
    // segCharges = charges sociales (brut - netImposable)
    const segBase    = netAfterTaxRounded
    const segImpot   = netImposableRounded != null && netAfterTaxRounded != null
      ? netImposableRounded - netAfterTaxRounded
      : null
    const segCharges = netImposableRounded != null
      ? brutRounded - netImposableRounded
      : brutRounded

    return {
      year:        String(year),
      brut:        brutRounded,
      netImposable: netImposableRounded,
      netAfterTax:  netAfterTaxRounded,
      segBase,
      segImpot,
      segCharges,
      companyName: activeContract.companyName ?? null,
    }
  }).filter(Boolean)
}

export default function SalaryAnnualBarChart() {
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    getSalaryContracts()
      .then(async contracts => {
        if (!contracts.length) { setData([]); return }
        const revArrays = await Promise.all(contracts.map(c => getRevisions(c.id)))
        const revisionsMap = Object.fromEntries(
          contracts.map((c, i) => [c.id, revArrays[i]])
        )
        setData(buildYearlyData(contracts, revisionsMap))
      })
      .catch(() => setError('Impossible de charger les données salariales.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Chargement…</div>
  if (error)   return <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm gap-2">
      <p>Aucun contrat salarial saisi.</p>
      <p className="text-xs">Rendez-vous dans <span className="font-medium">Revenus → Salariat</span> pour ajouter un contrat.</p>
    </div>
  )

  const hasNetAfterTax = data.some(d => d.netAfterTax != null)

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />

        {/* Segment bas : net d'impôt (affiché uniquement si profil fiscal renseigné) */}
        {hasNetAfterTax && (
          <Bar dataKey="segBase" name="Net d'impôt" stackId="s" fill="#059669" />
        )}
        {/* Segment milieu : impôt estimé */}
        {hasNetAfterTax && (
          <Bar dataKey="segImpot" name="Impôt estimé" stackId="s" fill="#f97316" />
        )}
        {/* Segment haut : charges sociales (brut - net imposable) */}
        <Bar
          dataKey="segCharges"
          name="Brut"
          stackId="s"
          fill="#d1d5db"
          radius={[3, 3, 0, 0]}
        />
        {/* Sans profil fiscal : net imposable en base */}
        {!hasNetAfterTax && (
          <Bar dataKey="netImposable" name="Net imposable" stackId="s" fill="#7c3aed" radius={[0, 0, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
