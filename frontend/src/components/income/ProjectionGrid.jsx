/**
 * Affiche les projections calculées d'un contrat salarial sous forme de grille.
 *
 * Trois niveaux de rémunération :
 *   Brut  →  Net imposable (base fiscale)  →  Net d'impôt (après impôt estimé + avantages en nature)
 */
export default function ProjectionGrid({ contract, annualBonuses = [], benefits = [] }) {

  const fmt = (val) =>
    val != null ? val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'

  const Tooltip = ({ content }) => (
    <span className="group relative cursor-help">
      <span className="text-gray-400 text-xs">ⓘ</span>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-72 text-xs bg-gray-800 text-white rounded-md px-2 py-1.5 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
        {content}
      </div>
    </span>
  )

  const Cell = ({ label, gross, netImposable, netAfterTax, grossTooltip, netImposableTooltip, netAfterTaxTooltip }) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {grossTooltip && <Tooltip content={grossTooltip} />}
      </div>
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <p className="text-xs text-gray-400 mb-0.5 h-4 leading-4">Brut</p>
          <p className="text-base font-bold text-gray-800">{fmt(gross)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5 h-4 leading-4">
            <p className="text-xs text-gray-400">Net imposable</p>
            {netImposableTooltip && <Tooltip content={netImposableTooltip} />}
          </div>
          <p className="text-base font-bold text-indigo-600">{fmt(netImposable)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5 h-4 leading-4">
            <p className="text-xs text-gray-400">Net d'impôt</p>
            {netAfterTaxTooltip && <Tooltip content={netAfterTaxTooltip} />}
          </div>
          <p className={`text-base font-bold ${netAfterTax != null ? 'text-green-600' : 'text-gray-400'}`}>
            {netAfterTax != null ? fmt(netAfterTax) : 'Non calculé'}
          </p>
        </div>
      </div>
    </div>
  )

  const totalAnnualBonuses = annualBonuses.reduce((s, b) => s + b.grossAmount, 0)

  const paidMonths  = contract.paidMonthsPerYear ?? 12
  const workingDays = 228
  const hoursPerDay = (contract.weeklyHours ?? 35) / 5

  const bonusPerMonth  = totalAnnualBonuses / paidMonths
  const bonusPerDay    = totalAnnualBonuses / workingDays
  const bonusPerHour   = bonusPerDay / hoursPerDay

  // Tickets restaurant : la part employeur s'ajoute au net
  const trMonthly = contract.employerMonthlyMealVoucherCost ?? 0
  const trAnnual  = trMonthly * 12
  const trDaily   = trAnnual / workingDays
  const trHourly  = trDaily / hoursPerDay

  // Impôt estimé annuel (dérivé des valeurs backend)
  const totalBenefitsAnnual = benefits.reduce((s, b) => s + b.monthlyAmount, 0) * 12
  const estimatedTax = contract.annualNetAfterTax != null
    ? (contract.annualNetImposable ?? 0) - contract.annualNetAfterTax + totalBenefitsAnnual
    : null

  // Net d'impôt : valeurs calculées par le backend (null si profil fiscal incomplet)
  const netAfterTaxAnnual  = contract.annualNetAfterTax != null
    ? contract.annualNetAfterTax + totalAnnualBonuses * 0.75 + trAnnual
    : null
  const netAfterTaxMonthly = contract.monthlyNetAfterTax != null
    ? contract.monthlyNetAfterTax + bonusPerMonth * 0.75 + trMonthly
    : null
  const netAfterTaxDaily   = contract.dailyNetAfterTax != null
    ? contract.dailyNetAfterTax + bonusPerDay * 0.75 + trDaily
    : null
  const netAfterTaxHourly  = contract.hourlyNetAfterTax != null
    ? contract.hourlyNetAfterTax + bonusPerHour * 0.75 + trHourly
    : null

  const makeGrossTooltip = (baseLabel, baseValue, bonusDivisor) => {
    if (annualBonuses.length === 0) return null
    return (
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">{baseLabel}</span>
          <span className="font-semibold">{fmt(baseValue)}</span>
        </div>
        {annualBonuses.map(b => (
          <div key={b.id} className="flex justify-between gap-4">
            <span className="text-gray-300">{b.label}</span>
            <span className="font-semibold text-blue-300">+{fmt(b.grossAmount / bonusDivisor)}</span>
          </div>
        ))}
      </div>
    )
  }

  const makeNetImposableTooltip = (baseNet, bonusNet) => (
    <div className="space-y-1">
      <div className="flex justify-between gap-4">
        <span className="text-gray-300">Net imposable estimé</span>
        <span className="font-semibold">{fmt(baseNet)}</span>
      </div>
      {bonusNet > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">Primes (≈75%)</span>
          <span className="font-semibold text-blue-300">+{fmt(bonusNet)}</span>
        </div>
      )}
    </div>
  )

  const makeNetAfterTaxTooltip = (netImposable, taxAmount, trAmount, benefitMultiplier) => (
    <div className="space-y-1">
      <div className="flex justify-between gap-4">
        <span className="text-gray-300">Net imposable</span>
        <span className="font-semibold">{fmt(netImposable)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-300">Impôt estimé</span>
        <span className="font-semibold text-red-300">−{fmt(taxAmount)}</span>
      </div>
      {trAmount > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">TR part employeur</span>
          <span className="font-semibold text-green-300">+{fmt(trAmount)}</span>
        </div>
      )}
      {benefits.map(b => (
        <div key={b.id} className="flex justify-between gap-4">
          <span className="text-gray-300">{b.label}</span>
          <span className="font-semibold text-green-300">+{fmt(b.monthlyAmount * benefitMultiplier)}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Projections calculées</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cell
          label="Annuel"
          gross={(contract.annualGrossSalary ?? 0) + totalAnnualBonuses}
          netImposable={(contract.annualNetImposable ?? 0) + totalAnnualBonuses * 0.75}
          netAfterTax={netAfterTaxAnnual}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.annualGrossSalary, 1)}
          netImposableTooltip={makeNetImposableTooltip(contract.annualNetImposable, totalAnnualBonuses * 0.75)}
          netAfterTaxTooltip={netAfterTaxAnnual != null ? makeNetAfterTaxTooltip(contract.annualNetImposable, estimatedTax, trAnnual, 12) : null}
        />
        <Cell
          label="Mensuel"
          gross={(contract.monthlyGrossSalary ?? 0) + bonusPerMonth}
          netImposable={(contract.monthlyNetImposable ?? 0) + bonusPerMonth * 0.75}
          netAfterTax={netAfterTaxMonthly}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.monthlyGrossSalary, paidMonths)}
          netImposableTooltip={makeNetImposableTooltip(contract.monthlyNetImposable, bonusPerMonth * 0.75)}
          netAfterTaxTooltip={netAfterTaxMonthly != null ? makeNetAfterTaxTooltip(contract.monthlyNetImposable, estimatedTax / paidMonths, trMonthly, 1) : null}
        />
        <Cell
          label="Journalier"
          gross={(contract.dailyGrossSalary ?? 0) + bonusPerDay}
          netImposable={(contract.dailyNetImposable ?? 0) + bonusPerDay * 0.75}
          netAfterTax={netAfterTaxDaily}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.dailyGrossSalary, workingDays) ?? undefined}
          netImposableTooltip={makeNetImposableTooltip(contract.dailyNetImposable, bonusPerDay * 0.75)}
          netAfterTaxTooltip={netAfterTaxDaily != null ? makeNetAfterTaxTooltip(contract.dailyNetImposable, estimatedTax / workingDays, trDaily, 12 / workingDays) : null}
        />
        <Cell
          label="Horaire"
          gross={(contract.hourlyGrossSalary ?? 0) + bonusPerHour}
          netImposable={(contract.hourlyNetImposable ?? 0) + bonusPerHour * 0.75}
          netAfterTax={netAfterTaxHourly}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.hourlyGrossSalary, workingDays * hoursPerDay)}
          netImposableTooltip={makeNetImposableTooltip(contract.hourlyNetImposable, bonusPerHour * 0.75)}
          netAfterTaxTooltip={netAfterTaxHourly != null ? makeNetAfterTaxTooltip(contract.hourlyNetImposable, estimatedTax / (workingDays * hoursPerDay), trHourly, 12 / workingDays / hoursPerDay) : null}
        />
      </div>

      {contract.annualNetAfterTax == null && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
          Le net d'impôt n'est pas calculé car votre profil fiscal (quotient familial) n'est pas renseigné.
          Complétez-le dans <span className="font-semibold">Profil &gt; Profil fiscal</span>.
        </div>
      )}

      {contract.mealVoucherAmount > 0 && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Tickets restaurant <span className="font-normal normal-case">(base 19 j/mois)</span>
          </p>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">Valeur faciale : </span>
              <span className="font-semibold text-gray-800">{contract.mealVoucherAmount?.toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-gray-500">Votre part ({contract.mealVoucherEmployeeRate}%) : </span>
              <span className="font-semibold text-red-600">−{fmt(contract.employeeMonthlyMealVoucherCost)}</span>
            </div>
            <div>
              <span className="text-gray-500">Part employeur : </span>
              <span className="font-semibold text-green-600">+{fmt(contract.employerMonthlyMealVoucherCost)}</span>
            </div>
          </div>
        </div>
      )}

      {benefits.length > 0 && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
            Avantages en nature <span className="font-normal normal-case">(inclus dans le net d'impôt)</span>
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {benefits.map(b => (
              <div key={b.id}>
                <span className="text-gray-500">{b.label} : </span>
                <span className="font-semibold text-green-700">+{fmt(b.monthlyAmount)} / mois</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        * Le net imposable est calculé à partir des taux de cotisations salariales légaux 2025 (vieillesse, CSG déductible, AGIRC-ARRCO, CEG, APEC). Le net d'impôt est estimé à partir de votre profil fiscal. Le net des primes est estimé à 75 % du brut (approximation).
      </p>
    </div>
  )
}
