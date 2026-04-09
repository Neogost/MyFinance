/**
 * Affiche les projections calculées d'un contrat salarial sous forme de grille.
 */
export default function ProjectionGrid({ contract, annualBonuses = [], benefits = [] }) {

  const fmt = (val) =>
    val != null ? val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'


  const Tooltip = ({ content }) => (
    <span className="group relative cursor-help">
      <span className="text-gray-400 text-xs">ⓘ</span>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-60 text-xs bg-gray-800 text-white rounded-md px-2 py-1.5 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
        {content}
      </div>
    </span>
  )

  const Cell = ({ label, gross, net, grossTooltip, netTooltip }) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {grossTooltip && <Tooltip content={grossTooltip} />}
      </div>
      <div className="flex gap-4 items-end">
        <div>
          <p className="text-xs text-gray-400 mb-0.5 h-4 leading-4">Brut</p>
          <p className="text-base font-bold text-gray-800">{fmt(gross)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5 h-4 leading-4">
            <p className="text-xs text-gray-400">Net estimé</p>
            {netTooltip && <Tooltip content={netTooltip} />}
          </div>
          <p className="text-base font-bold text-indigo-600">{fmt(net)}</p>
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

  // Avantages en nature : montants mensuels, ramenés aux autres périodes
  const totalBenefitsMonthly = benefits.reduce((s, b) => s + b.monthlyAmount, 0)
  const totalBenefitsAnnual  = totalBenefitsMonthly * 12
  const totalBenefitsDaily   = totalBenefitsAnnual / workingDays
  const totalBenefitsHourly  = totalBenefitsDaily / hoursPerDay

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

  // benefitMultiplier : facteur pour ramener le montant mensuel à la période affichée
  const makeNetTooltip = (baseNet, trAmount, benefitMultiplier, extraLabel) => (
    <div className="space-y-1">
      <div className="flex justify-between gap-4">
        <span className="text-gray-300">Net estimé (75% brut)</span>
        <span className="font-semibold">{fmt(baseNet)}</span>
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
      {extraLabel && (
        <p className="text-gray-400 mt-1 pt-1 border-t border-gray-600">{extraLabel}</p>
      )}
    </div>
  )

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Projections calculées</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell
          label="Annuel"
          gross={(contract.annualGrossSalary ?? 0) + totalAnnualBonuses}
          net={(contract.annualNetSalary ?? 0) + totalAnnualBonuses * 0.75 + trAnnual + totalBenefitsAnnual}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.annualGrossSalary, 1)}
          netTooltip={makeNetTooltip((contract.annualNetSalary ?? 0) + totalAnnualBonuses * 0.75, trAnnual, 12)}
        />
        <Cell
          label="Mensuel"
          gross={(contract.monthlyGrossSalary ?? 0) + bonusPerMonth}
          net={(contract.monthlyNetSalary ?? 0) + bonusPerMonth * 0.75 + trMonthly + totalBenefitsMonthly}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.monthlyGrossSalary, paidMonths)}
          netTooltip={makeNetTooltip((contract.monthlyNetSalary ?? 0) + bonusPerMonth * 0.75, trMonthly, 1)}
        />
        <Cell
          label="Journalier"
          gross={(contract.dailyGrossSalary ?? 0) + bonusPerDay}
          net={(contract.dailyNetSalary ?? 0) + bonusPerDay * 0.75 + trDaily + totalBenefitsDaily}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.dailyGrossSalary, workingDays) ?? undefined}
          netTooltip={makeNetTooltip((contract.dailyNetSalary ?? 0) + bonusPerDay * 0.75, trDaily, 12 / workingDays, 'Base : 228 jours travaillés / an')}
        />
        <Cell
          label="Horaire"
          gross={(contract.hourlyGrossSalary ?? 0) + bonusPerHour}
          net={(contract.hourlyNetSalary ?? 0) + bonusPerHour * 0.75 + trHourly + totalBenefitsHourly}
          grossTooltip={makeGrossTooltip('Salaire brut', contract.hourlyGrossSalary, workingDays * hoursPerDay)}
          netTooltip={makeNetTooltip((contract.hourlyNetSalary ?? 0) + bonusPerHour * 0.75, trHourly, 12 / workingDays / hoursPerDay)}
        />
      </div>

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
            Avantages en nature
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
        * Le salaire net est estimé à 75 % du brut (estimation forfaitaire des cotisations salariales françaises).
      </p>
    </div>
  )
}
