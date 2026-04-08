/**
 * Affiche les projections calculées d'un contrat salarial sous forme de grille.
 */
export default function ProjectionGrid({ contract }) {
  const fmt = (val) =>
    val != null ? val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—'

  const fmtH = (val) =>
    val != null ? val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' h' : '—'

  const Cell = ({ label, gross, net, tooltip }) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {tooltip && (
          <span className="group relative cursor-help">
            <span className="text-gray-400 text-xs">ⓘ</span>
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-56 text-xs bg-gray-800 text-white rounded-md px-2 py-1.5 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 text-center">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <div className="flex gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Brut</p>
          <p className="text-base font-bold text-gray-800">{fmt(gross)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Net estimé</p>
          <p className="text-base font-bold text-indigo-600">{fmt(net)}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Projections calculées</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell
          label="Annuel"
          gross={contract.annualGrossSalary}
          net={contract.annualNetSalary}
        />
        <Cell
          label="Mensuel"
          gross={contract.monthlyGrossSalary}
          net={contract.monthlyNetSalary}
        />
        <Cell
          label="Journalier"
          gross={contract.dailyGrossSalary}
          net={contract.dailyNetSalary}
          tooltip="Base : 228 jours travaillés / an (convention standard)"
        />
        <Cell
          label="Horaire"
          gross={contract.hourlyGrossSalary}
          net={contract.hourlyNetSalary}
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

      <p className="text-xs text-gray-400 mt-3">
        * Le salaire net est estimé à 75 % du brut (estimation forfaitaire des cotisations salariales françaises).
      </p>
    </div>
  )
}
