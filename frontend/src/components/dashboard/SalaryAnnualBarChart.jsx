import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getSalaryContracts, getRevisions, getBonuses, getBenefits, getOtherIncomes } from '../../api/income'

const fmtEur = v =>
  v != null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
    : '—'

// Le tooltip affiche les valeurs reconstituées (totaux cumulés), pas les deltas
function CustomTooltip({ active, payload, label, showOtherIncomes }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const hasExtras = (d.bonusAmount > 0) || (d.benefitAmount > 0) || (showOtherIncomes && d.otherIncomeAmount > 0)
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {d.companyName && <p className="text-gray-400 mb-2 amount">{d.companyName}</p>}
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Brut</span>
        <span className="font-medium text-gray-700 amount">{fmtEur(d.brut)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span style={{ color: '#7c3aed' }}>Net imposable</span>
        <span className="font-medium text-gray-700 amount">{fmtEur(d.netImposable)}</span>
      </div>
      {d.netAfterTax != null && (
        <div className="flex justify-between gap-4">
          <span style={{ color: '#059669' }}>Net d'impôt</span>
          <span className="font-medium text-gray-700 amount">{fmtEur(d.netAfterTax)}</span>
        </div>
      )}
      {d.bonusAmount > 0 && (
        <div className="flex justify-between gap-4">
          <span style={{ color: '#ec4899' }}>Primes brutes</span>
          <span className="font-medium text-gray-700 amount">{fmtEur(d.bonusAmount)}</span>
        </div>
      )}
      {d.benefitAmount > 0 && (
        <div className="flex justify-between gap-4">
          <span style={{ color: '#8b5cf6' }}>Avantages en nature</span>
          <span className="font-medium text-gray-700 amount">{fmtEur(d.benefitAmount)}</span>
        </div>
      )}
      {hasExtras && (
        <>
          {showOtherIncomes && d.otherIncomeAmount > 0 && (
            <div className="border-t border-gray-100 mt-1 pt-1 space-y-0.5">
              {d.otherIncomeDetails?.map((item, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span style={{ color: '#0ea5e9' }} className="truncate max-w-[140px]">{item.label}</span>
                  <span className="font-medium text-gray-700 amount shrink-0">{fmtEur(item.amount)}</span>
                </div>
              ))}
              {d.otherIncomeDetails?.length > 1 && (
                <div className="flex justify-between gap-4 text-gray-400 text-[10px]">
                  <span>Sous-total complémentaires</span>
                  <span className="amount">{fmtEur(d.otherIncomeAmount)}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-gray-200 mt-1 pt-1 font-semibold">
            <span className="text-gray-700">Total</span>
            <span className="text-gray-900 amount">
              {fmtEur(d.brut
                + (d.bonusAmount       ?? 0)
                + (d.benefitAmount     ?? 0)
                + (showOtherIncomes ? (d.otherIncomeAmount ?? 0) : 0)
              )}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/** Calcule le montant brut total des primes applicables à une année donnée. */
function bonusForYear(bonuses, contractStartDate, contractEndDate, year) {
  let total = 0
  for (const b of bonuses) {
    if (b.type === 'EXCEPTIONNELLE') {
      if (b.paymentDate && new Date(b.paymentDate).getFullYear() === year) {
        total += b.grossAmount ?? 0
      }
    } else if (b.type === 'ANNUELLE') {
      // Versée chaque année au mois paymentMonth tant que le contrat est actif
      const cStart = contractStartDate ? new Date(contractStartDate).getFullYear() : 0
      const cEnd   = contractEndDate   ? new Date(contractEndDate).getFullYear()   : 9999
      if (cStart <= year && year <= cEnd) {
        total += b.grossAmount ?? 0
      }
    } else if (b.type === 'MENSUELLE') {
      // Active entre startDate et endDate (null = indéfinie) — somme des mois dans l'année
      const bStart = b.startDate ? new Date(b.startDate) : null
      const bEnd   = b.endDate   ? new Date(b.endDate)   : null
      let months = 0
      for (let m = 0; m < 12; m++) {
        const monthDate = new Date(year, m, 1)
        const monthEnd  = new Date(year, m + 1, 0)
        const afterStart  = !bStart || bStart <= monthEnd
        const beforeEnd   = !bEnd   || bEnd   >= monthDate
        if (afterStart && beforeEnd) months++
      }
      total += (b.grossAmount ?? 0) * months
    }
  }
  return Math.round(total)
}

/** Calcule le montant annuel des avantages en nature pour une année (monthlyAmount × mois actifs). */
function benefitForYear(benefits, contractStartDate, contractEndDate, year) {
  const monthlyTotal = (benefits ?? []).reduce((s, b) => s + (b.monthlyAmount ?? 0), 0)
  if (monthlyTotal === 0) return 0

  let months = 0
  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(year, m, 1)
    const monthEnd  = new Date(year, m + 1, 0)
    const cStart = contractStartDate ? new Date(contractStartDate) : null
    const cEnd   = contractEndDate   ? new Date(contractEndDate)   : null
    const afterStart = !cStart || cStart <= monthEnd
    const beforeEnd  = !cEnd   || cEnd   >= monthDate
    if (afterStart && beforeEnd) months++
  }
  return Math.round(monthlyTotal * months)
}

/** Calcule le détail des revenus complémentaires pour une année donnée. */
function otherIncomeForYear(incomes, year) {
  const details = []
  for (const inc of incomes) {
    let amount = 0
    if (inc.periodStart) {
      const pStart = new Date(inc.periodStart)
      const pEnd   = inc.periodEnd ? new Date(inc.periodEnd) : null
      let months = 0
      for (let m = 0; m < 12; m++) {
        const monthDate = new Date(year, m, 1)
        const monthEnd  = new Date(year, m + 1, 0)
        if (pStart <= monthEnd && (!pEnd || pEnd >= monthDate)) months++
      }
      amount = Math.round((inc.amount ?? 0) * months)
    } else if (inc.date && new Date(inc.date).getFullYear() === year) {
      amount = Math.round(inc.amount ?? 0)
    }
    if (amount > 0) details.push({ label: inc.label, amount })
  }
  return {
    total: details.reduce((s, d) => s + d.amount, 0),
    details,
  }
}

function buildYearlyData(contracts, revisionsMap, bonusesMap = {}, benefitsMap = {}, otherIncomes = []) {
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

    // Quotité de travail (1.0 = temps plein)
    const partTimeRatio = (activeContract.partTimePercentage ?? 100) / 100

    // Brut ETP (révision ou base du contrat), puis application de la quotité
    const etpBrut = activeRevision?.annualGrossSalary
      ?? activeContract.baseGrossSalary
      ?? null
    const brut = etpBrut != null
      ? etpBrut * partTimeRatio
      : activeContract.annualGrossSalary  // déjà réduit par quotité dans le DTO

    // annualNetImposable et annualNetAfterTax sont calculés sur le brut effectif courant
    // → utiliser annualGrossSalary (brut effectif) comme dénominateur du ratio, pas le brut ETP
    const effectiveBrut = activeContract.annualGrossSalary
    const netImposable = effectiveBrut > 0 && activeContract.annualNetImposable != null
      ? brut * (activeContract.annualNetImposable / effectiveBrut)
      : null
    const netAfterTax = effectiveBrut > 0 && activeContract.annualNetAfterTax != null
      ? brut * (activeContract.annualNetAfterTax / effectiveBrut)
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

    const bonuses = bonusesMap[activeContract.id] ?? []
    const bonusAmount        = bonusForYear(bonuses, activeContract.startDate, activeContract.endDate, year)
    const benefits           = benefitsMap[activeContract.id] ?? []
    const benefitAmount      = benefitForYear(benefits, activeContract.startDate, activeContract.endDate, year)
    const otherIncome        = otherIncomeForYear(otherIncomes, year)

    return {
      year:        String(year),
      brut:        brutRounded,
      netImposable: netImposableRounded,
      netAfterTax:  netAfterTaxRounded,
      segBase,
      segImpot,
      segCharges,
      bonusAmount,
      benefitAmount,
      otherIncomeAmount:   otherIncome.total,
      otherIncomeDetails:  otherIncome.details,
      companyName: activeContract.companyName ?? null,
    }
  }).filter(Boolean)
}

export default function SalaryAnnualBarChart() {
  const [data, setData]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [showOtherIncomes, setShowOtherIncomes] = useState(false)

  const hasBonuses       = data.some(d => (d.bonusAmount       ?? 0) > 0)
  const hasBenefits      = data.some(d => (d.benefitAmount     ?? 0) > 0)
  const hasOtherIncomes  = data.some(d => (d.otherIncomeAmount ?? 0) > 0)

  useEffect(() => {
    getSalaryContracts()
      .then(async contracts => {
        if (!contracts.length) { setData([]); return }
        const [revArrays, bonusArrays, benefitArrays, otherIncomes] = await Promise.all([
          Promise.all(contracts.map(c => getRevisions(c.id))),
          Promise.all(contracts.map(c => getBonuses(c.id).catch(() => []))),
          Promise.all(contracts.map(c => getBenefits(c.id).catch(() => []))),
          getOtherIncomes().catch(() => []),
        ])
        const revisionsMap = Object.fromEntries(contracts.map((c, i) => [c.id, revArrays[i]]))
        const bonusesMap   = Object.fromEntries(contracts.map((c, i) => [c.id, bonusArrays[i]]))
        const benefitsMap  = Object.fromEntries(contracts.map((c, i) => [c.id, benefitArrays[i]]))
        setData(buildYearlyData(contracts, revisionsMap, bonusesMap, benefitsMap, otherIncomes))
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
    <div>
      {hasOtherIncomes && (
        <div className="flex flex-wrap gap-4 mb-3">
          {hasOtherIncomes && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showOtherIncomes} onChange={e => setShowOtherIncomes(e.target.checked)} className="accent-sky-500 w-4 h-4" />
              <span className="text-sm text-gray-600">Revenus complémentaires</span>
            </label>
          )}
        </div>
      )}
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis
          tick={({ x, y, payload }) => (
            <text x={x} y={y} dy={4} textAnchor="end" fill="#6b7280" fontSize={11} className="amount">
              {`${(payload.value / 1000).toFixed(0)}k`}
            </text>
          )}
          width={45}
        />
        <Tooltip content={<CustomTooltip showOtherIncomes={showOtherIncomes} />} cursor={{ fill: '#f9fafb' }} />
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
          radius={hasBonuses ? [0, 0, 0, 0] : [3, 3, 0, 0]}
        />
        {/* Sans profil fiscal : net imposable en base */}
        {!hasNetAfterTax && (
          <Bar dataKey="netImposable" name="Net imposable" stackId="s" fill="#7c3aed" radius={[0, 0, 0, 0]} />
        )}
        {/* Primes brutes — dans la même pile, au-dessus du brut */}
        {hasBonuses && (
          <Bar dataKey="bonusAmount" name="Primes brutes" stackId="s" fill="#ec4899" radius={hasBenefits ? [0,0,0,0] : [3,3,0,0]} opacity={0.9} />
        )}
        {/* Avantages en nature — dans la même pile, au-dessus des primes */}
        {hasBenefits && (
          <Bar dataKey="benefitAmount" name="Avantages en nature" stackId="s" fill="#8b5cf6" radius={[3,3,0,0]} opacity={0.9} />
        )}
        {/* Revenus complémentaires — barre séparée */}
        {showOtherIncomes && (
          <Bar dataKey="otherIncomeAmount" name="Revenus complémentaires" stackId="b" fill="#0ea5e9" radius={[3,3,3,3]} opacity={0.85} />
        )}
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
