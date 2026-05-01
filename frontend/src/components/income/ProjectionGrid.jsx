/**
 * Affiche les projections calculées d'un contrat salarial sous forme de grille.
 *
 * Quatre niveaux de rémunération :
 *   Super brut (coût employeur)  →  Brut  →  Net imposable (base fiscale)  →  Net d'impôt (après impôt estimé + avantages en nature)
 */
export default function ProjectionGrid({ contract, annualBonuses = [], benefits = [], onCalls = [] }) {

  const fmt = (val) =>
    val != null ? val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'

  const Tooltip = ({ content }) => (
    <span className="group relative cursor-help">
      <span className="text-gray-400 text-xs">ⓘ</span>
      <div className="absolute left-0 bottom-full mb-1 w-72 text-xs bg-gray-800 text-white rounded-md px-2 py-1.5 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
        {content}
      </div>
    </span>
  )

  const Cell = ({ label, gross, netImposable, netAfterTax, grossTooltip, netImposableTooltip, netAfterTaxTooltip }) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <div className="flex items-center gap-1 mb-0.5 h-4 leading-4">
            <p className="text-xs text-gray-400">Brut</p>
            {grossTooltip && <Tooltip content={grossTooltip} />}
          </div>
          <p className="text-base font-bold text-gray-800 amount">{fmt(gross)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5 h-4 leading-4">
            <p className="text-xs text-gray-400">Net imposable</p>
            {netImposableTooltip && <Tooltip content={netImposableTooltip} />}
          </div>
          <p className="text-base font-bold text-indigo-600 amount">{fmt(netImposable)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5 h-4 leading-4">
            <p className="text-xs text-gray-400">Net d'impôt</p>
            {netAfterTaxTooltip && <Tooltip content={netAfterTaxTooltip} />}
          </div>
          <p className={`text-base font-bold amount ${netAfterTax != null ? 'text-green-600' : 'text-gray-400'}`}>
            {netAfterTax != null ? fmt(netAfterTax) : 'Non calculé'}
          </p>
        </div>
      </div>
    </div>
  )

  const totalAnnualBonuses  = annualBonuses.reduce((s, b) => s + b.grossAmount, 0)
  const totalAnnualOnCalls  = onCalls.reduce((s, oc) => s + oc.annualOnCallIncome, 0)

  const paidMonths  = contract.paidMonthsPerYear ?? 12
  const workingDays = 228
  const hoursPerDay = (contract.weeklyHours ?? 35) / 5

  const bonusPerMonth  = totalAnnualBonuses / paidMonths
  const bonusPerDay    = totalAnnualBonuses / workingDays
  const bonusPerHour   = bonusPerDay / hoursPerDay

  const onCallPerMonth = totalAnnualOnCalls / paidMonths
  const onCallPerDay   = totalAnnualOnCalls / workingDays
  const onCallPerHour  = onCallPerDay / hoursPerDay

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

  // Taux moyen d'imposition du salaire — appliqué au net imposable des astreintes
  const avgTaxRate = estimatedTax != null && (contract.annualNetImposable ?? 0) > 0
    ? estimatedTax / contract.annualNetImposable
    : 0

  // Net imposable astreintes ≈ 75% du brut (charges salariales)
  // Net d'impôt astreintes = net imposable − impôt estimé au taux moyen du salaire
  const onCallAnnualNetImp     = totalAnnualOnCalls * 0.75
  const onCallAnnualNetAfterTax = onCallAnnualNetImp * (1 - avgTaxRate)
  const onCallAnnualTax         = onCallAnnualNetImp * avgTaxRate

  // Net d'impôt : valeurs calculées par le backend (null si profil fiscal incomplet)
  const netAfterTaxAnnual  = contract.annualNetAfterTax != null
    ? contract.annualNetAfterTax + totalAnnualBonuses * 0.75 + trAnnual + onCallAnnualNetAfterTax
    : null
  const netAfterTaxMonthly = contract.monthlyNetAfterTax != null
    ? contract.monthlyNetAfterTax + bonusPerMonth * 0.75 + trMonthly + onCallAnnualNetAfterTax / paidMonths
    : null
  const netAfterTaxDaily   = contract.dailyNetAfterTax != null
    ? contract.dailyNetAfterTax + bonusPerDay * 0.75 + trDaily + onCallAnnualNetAfterTax / workingDays
    : null
  const netAfterTaxHourly  = contract.hourlyNetAfterTax != null
    ? contract.hourlyNetAfterTax + bonusPerHour * 0.75 + trHourly + onCallAnnualNetAfterTax / (workingDays * hoursPerDay)
    : null

  const makeGrossTooltip = (baseLabel, baseValue, superGross, bonusDivisor) => {
    const hasBonuses = annualBonuses.length > 0
    const hasOnCalls = onCalls.length > 0
    if (!superGross && !hasBonuses && !hasOnCalls) return null
    return (
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">{baseLabel}</span>
          <span className="font-semibold amount">{fmt(baseValue)}</span>
        </div>
        {annualBonuses.map(b => (
          <div key={b.id} className="flex justify-between gap-4">
            <span className="text-gray-300">{b.label}</span>
            <span className="font-semibold text-blue-300 amount">+{fmt(b.grossAmount / bonusDivisor)}</span>
          </div>
        ))}
        {hasOnCalls && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-300">Astreintes</span>
            <span className="font-semibold text-violet-300 amount">+{fmt(totalAnnualOnCalls / bonusDivisor)}</span>
          </div>
        )}
        {superGross != null && (
          <>
            <div className="border-t border-gray-600 my-1" />
            <div className="flex justify-between gap-4">
              <span className="text-gray-300">Coût employeur estimé</span>
              <span className="font-semibold text-orange-300 amount">{fmt(superGross)}</span>
            </div>
            <div className="text-gray-500 text-xs">dont cotisations patronales ≈ 45 %</div>
          </>
        )}
      </div>
    )
  }

  const makeNetImposableTooltip = (baseNet, bonusNet, onCallNet) => (
    <div className="space-y-1">
      <div className="flex justify-between gap-4">
        <span className="text-gray-300">Net imposable estimé</span>
        <span className="font-semibold amount">{fmt(baseNet)}</span>
      </div>
      {bonusNet > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">Primes (≈75%)</span>
          <span className="font-semibold text-blue-300 amount">+{fmt(bonusNet)}</span>
        </div>
      )}
      {onCallNet > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">Astreintes (≈75%)</span>
          <span className="font-semibold text-violet-300 amount">+{fmt(onCallNet)}</span>
        </div>
      )}
    </div>
  )

  const makeNetAfterTaxTooltip = (netImposable, taxAmount, trAmount, benefitMultiplier, onCallNetAfterTax, onCallTax) => (
    <div className="space-y-1">
      <div className="flex justify-between gap-4">
        <span className="text-gray-300">Net imposable salaire</span>
        <span className="font-semibold amount">{fmt(netImposable)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-300">Impôt sur salaire</span>
        <span className="font-semibold text-red-300 amount">−{fmt(taxAmount)}</span>
      </div>
      {onCallNetAfterTax > 0 && (
        <>
          <div className="border-t border-gray-600 my-1" />
          <div className="flex justify-between gap-4">
            <span className="text-gray-300">Astreintes net imposable (≈75%)</span>
            <span className="font-semibold text-violet-300 amount">+{fmt(onCallNetAfterTax + onCallTax)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-300">Impôt astreintes (taux moyen {(avgTaxRate * 100).toFixed(0)}%)</span>
            <span className="font-semibold text-red-300 amount">−{fmt(onCallTax)}</span>
          </div>
          <div className="border-t border-gray-600 my-1" />
          <div className="flex justify-between gap-4">
            <span className="text-gray-300">Total impôt estimé</span>
            <span className="font-semibold text-red-300 amount">−{fmt(taxAmount + onCallTax)}</span>
          </div>
        </>
      )}
      {trAmount > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">TR part employeur</span>
          <span className="font-semibold text-green-300 amount">+{fmt(trAmount)}</span>
        </div>
      )}
      {benefits.map(b => (
        <div key={b.id} className="flex justify-between gap-4">
          <span className="text-gray-300">{b.label}</span>
          <span className="font-semibold text-green-300 amount">+{fmt(b.monthlyAmount * benefitMultiplier)}</span>
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
          gross={(contract.annualGrossSalary ?? 0) + totalAnnualBonuses + totalAnnualOnCalls}
          netImposable={(contract.annualNetImposable ?? 0) + totalAnnualBonuses * 0.75 + totalAnnualOnCalls * 0.75}
          netAfterTax={netAfterTaxAnnual}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.annualGrossSalary, contract.annualSuperGross, 1)}
          netImposableTooltip={makeNetImposableTooltip(contract.annualNetImposable, totalAnnualBonuses * 0.75, totalAnnualOnCalls * 0.75)}
          netAfterTaxTooltip={netAfterTaxAnnual != null ? makeNetAfterTaxTooltip(contract.annualNetImposable, estimatedTax, trAnnual, 12, onCallAnnualNetAfterTax, onCallAnnualTax) : null}
        />
        <Cell
          label="Mensuel"
          gross={(contract.monthlyGrossSalary ?? 0) + bonusPerMonth + onCallPerMonth}
          netImposable={(contract.monthlyNetImposable ?? 0) + bonusPerMonth * 0.75 + onCallPerMonth * 0.75}
          netAfterTax={netAfterTaxMonthly}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.monthlyGrossSalary, contract.monthlySuperGross, paidMonths)}
          netImposableTooltip={makeNetImposableTooltip(contract.monthlyNetImposable, bonusPerMonth * 0.75, onCallPerMonth * 0.75)}
          netAfterTaxTooltip={netAfterTaxMonthly != null ? makeNetAfterTaxTooltip(contract.monthlyNetImposable, estimatedTax / paidMonths, trMonthly, 1, onCallAnnualNetAfterTax / paidMonths, onCallAnnualTax / paidMonths) : null}
        />
        <Cell
          label="Journalier"
          gross={(contract.dailyGrossSalary ?? 0) + bonusPerDay + onCallPerDay}
          netImposable={(contract.dailyNetImposable ?? 0) + bonusPerDay * 0.75 + onCallPerDay * 0.75}
          netAfterTax={netAfterTaxDaily}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.dailyGrossSalary, contract.dailySuperGross, workingDays)}
          netImposableTooltip={makeNetImposableTooltip(contract.dailyNetImposable, bonusPerDay * 0.75, onCallPerDay * 0.75)}
          netAfterTaxTooltip={netAfterTaxDaily != null ? makeNetAfterTaxTooltip(contract.dailyNetImposable, estimatedTax / workingDays, trDaily, 12 / workingDays, onCallAnnualNetAfterTax / workingDays, onCallAnnualTax / workingDays) : null}
        />
        <Cell
          label="Horaire"
          gross={(contract.hourlyGrossSalary ?? 0) + bonusPerHour + onCallPerHour}
          netImposable={(contract.hourlyNetImposable ?? 0) + bonusPerHour * 0.75 + onCallPerHour * 0.75}
          netAfterTax={netAfterTaxHourly}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.hourlyGrossSalary, contract.hourlySuperGross, workingDays * hoursPerDay)}
          netImposableTooltip={makeNetImposableTooltip(contract.hourlyNetImposable, bonusPerHour * 0.75, onCallPerHour * 0.75)}
          netAfterTaxTooltip={netAfterTaxHourly != null ? makeNetAfterTaxTooltip(contract.hourlyNetImposable, estimatedTax / (workingDays * hoursPerDay), trHourly, 12 / workingDays / hoursPerDay, onCallAnnualNetAfterTax / (workingDays * hoursPerDay), onCallAnnualTax / (workingDays * hoursPerDay)) : null}
        />
      </div>

      {contract.annualNetAfterTax == null && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
          Le net d'impôt n'est pas calculé car votre profil fiscal (quotient familial) n'est pas renseigné.
          Complétez-le dans <span className="font-semibold">Profil &gt; Profil fiscal</span>.
        </div>
      )}

      {contract.mealVoucherAmount > 0 && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-2">
            Tickets restaurant <span className="font-normal normal-case">(base 19 j/mois)</span>
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500">Valeur faciale : </span>
              <span className="font-semibold text-gray-800 amount">{contract.mealVoucherAmount?.toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-gray-500">Votre part ({contract.mealVoucherEmployeeRate}%) : </span>
              <span className="font-semibold text-red-600 dark:text-red-400 amount">−{fmt(contract.employeeMonthlyMealVoucherCost)}</span>
            </div>
            <div>
              <span className="text-gray-500">Part employeur : </span>
              <span className="font-semibold text-green-600 dark:text-green-400 amount">+{fmt(contract.employerMonthlyMealVoucherCost)}</span>
            </div>
          </div>
        </div>
      )}

      {onCalls.length > 0 && (
        <div className="mt-3 bg-violet-50 border border-violet-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide mb-2">
            Astreintes <span className="font-normal normal-case">(revenu brut annuel estimé)</span>
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {onCalls.map(oc => (
              <div key={oc.id}>
                <span className="text-gray-500">{oc.estimatedWeeksPerYear} sem. × {fmt(oc.weeklyFlatRate)} : </span>
                <span className="font-semibold text-violet-700 dark:text-violet-300 amount">+{fmt(oc.annualOnCallIncome)} / an</span>
              </div>
            ))}
            {onCalls.length > 1 && (
              <div>
                <span className="text-gray-500">Total : </span>
                <span className="font-semibold text-violet-700 dark:text-violet-300 amount">+{fmt(totalAnnualOnCalls)} / an</span>
              </div>
            )}
          </div>
        </div>
      )}

      {benefits.length > 0 && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-2">
            Avantages en nature <span className="font-normal normal-case">(inclus dans le net d'impôt)</span>
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {benefits.map(b => (
              <div key={b.id}>
                <span className="text-gray-500">{b.label} : </span>
                <span className="font-semibold text-green-700 dark:text-green-300 amount">+{fmt(b.monthlyAmount)} / mois</span>
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
