import SalaryEvolutionChart from './SalaryEvolutionChart'

export default function DashboardPage({ user }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-gray-500 text-sm mt-1">
          Bienvenue, <strong>{user.firstName}</strong> !
        </p>
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
