import SalaryEvolutionChart from './SalaryEvolutionChart'
import CapitalGainsByCategoryChart from './CapitalGainsByCategoryChart'
import PatrimoineByCategoryChart from './PatrimoineByCategoryChart'
import PatrimoineByEnvelopeChart from './PatrimoineByEnvelopeChart'
import ExpensesByCategoryChart from './ExpensesByCategoryChart'
import PassifsByCategoryChart from './PassifsByCategoryChart'
import SalaryAnnualBarChart from './SalaryAnnualBarChart'

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-bold text-gray-700 uppercase tracking-wide text-xs">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export default function DashboardPage({ user }) {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-gray-500 text-sm mt-1">
          Bonjour <strong>{user.firstName}</strong> — une vue d'ensemble de vos revenus, dépenses et patrimoine.
        </p>
      </div>

      {/* ── Revenus & Dépenses ───────────────────────────────────── */}
      <div>
        <SectionTitle
          title="Revenus & Dépenses"
          subtitle="Évolution du salaire et répartition des charges mensuelles."
        />

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Évolution salariale annuelle</h3>
            <p className="text-xs text-gray-400 mb-6">
              Brut, net imposable et net d'impôt par année — d'après les contrats et révisions salariales.
            </p>
            <SalaryAnnualBarChart />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des dépenses</h3>
            <p className="text-xs text-gray-400 mb-6">
              Part de chaque poste dans les dépenses mensuelles récurrentes, et capacité d'épargne résiduelle.
            </p>
            <ExpensesByCategoryChart />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Détail mensuel par bulletins</h3>
            <p className="text-xs text-gray-400 mb-6">
              Brut, net fiscal, net versé et prélèvement à la source — données issues des bulletins de paie saisis.
            </p>
            <SalaryEvolutionChart />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des passifs</h3>
            <p className="text-xs text-gray-400 mb-6">
              Valeur actuelle estimée par catégorie de possession, avec décote cumulée depuis l'achat.
            </p>
            <PassifsByCategoryChart />
          </div>
        </div>
      </div>

      {/* ── Patrimoine ───────────────────────────────────────────── */}
      <div>
        <SectionTitle
          title="Patrimoine"
          subtitle="Répartition et plus-values des positions actives."
        />

        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Patrimoine brut</h3>
            <p className="text-xs text-gray-400 mb-6">
              Répartition de la valeur actuelle par catégorie d'actif.
            </p>
            <PatrimoineByCategoryChart />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Patrimoine financier</h3>
            <p className="text-xs text-gray-400 mb-6">
              Répartition hors immobilier physique et papier.
            </p>
            <PatrimoineByCategoryChart financierOnly />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition par enveloppe</h3>
            <p className="text-xs text-gray-400 mb-6">
              Répartition du patrimoine brut par type d'enveloppe fiscale (AV, PEA, CTO…).
            </p>
            <PatrimoineByEnvelopeChart />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Plus-values par catégorie</h3>
            <p className="text-xs text-gray-400 mb-6">
              Répartition des plus-values latentes sur l'ensemble des positions actives.
            </p>
            <CapitalGainsByCategoryChart />
          </div>
        </div>
      </div>
    </div>
  )
}
