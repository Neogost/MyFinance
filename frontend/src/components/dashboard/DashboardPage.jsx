import SalaryEvolutionChart from './SalaryEvolutionChart'
import CapitalGainsByCategoryChart from './CapitalGainsByCategoryChart'
import PatrimoineByCategoryChart from './PatrimoineByCategoryChart'
import PatrimoineByEnvelopeChart from './PatrimoineByEnvelopeChart'

export default function DashboardPage({ user }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-gray-500 text-sm mt-1">
          Bienvenue, <strong>{user.firstName}</strong> !
        </p>
      </div>

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-1">Évolution salariale</h3>
        <p className="text-xs text-gray-400 mb-6">
          Brut, net fiscal, net versé et prélèvement à la source — données issues des bulletins de paie saisis.
        </p>
        <SalaryEvolutionChart />
      </div>
    </div>
  )
}
