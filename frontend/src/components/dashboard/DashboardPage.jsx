import { useState, useEffect } from 'react'
import FireProjectionWidget from './FireProjectionWidget'
import SalaryEvolutionChart from './SalaryEvolutionChart'
import CapitalGainsByCategoryChart from './CapitalGainsByCategoryChart'
import PatrimoineByCategoryChart from './PatrimoineByCategoryChart'
import PatrimoineByEnvelopeChart from './PatrimoineByEnvelopeChart'
import PatrimoineEvolutionChart from './PatrimoineEvolutionChart'
import ExpensesByCategoryChart from './ExpensesByCategoryChart'
import PassifsByCategoryChart from './PassifsByCategoryChart'
import SalaryAnnualBarChart from './SalaryAnnualBarChart'
import { getMyGroupMembers, getMemberPositions } from '../../api/familyGroup'
import { getPositions } from '../../api/patrimoine'

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-bold text-gray-700 uppercase tracking-wide text-xs">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export default function DashboardPage({ user, familyMode }) {
  const [familyPositions, setFamilyPositions] = useState(null)

  useEffect(() => {
    if (!familyMode) { setFamilyPositions(null); return }
    async function fetchAll() {
      try {
        const [ownPositions, members] = await Promise.all([getPositions(), getMyGroupMembers()])
        const memberPositions = await Promise.all(members.map(m => getMemberPositions(m.id)))
        setFamilyPositions([...ownPositions, ...memberPositions.flat()])
      } catch {
        setFamilyPositions(null)
      }
    }
    fetchAll()
  }, [familyMode])

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-gray-500 text-sm mt-1">
          Bonjour <strong>{user.firstName}</strong> — une vue d'ensemble de vos revenus, dépenses et patrimoine.
        </p>
      </div>

      {familyMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 font-medium">
          <span>🏠</span>
          <span>Mode Foyer activé — les graphiques patrimoniaux agrègent les données de tous les membres du groupe.</span>
        </div>
      )}

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
          subtitle="Évolution, répartition et plus-values des positions actives."
        />

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Évolution du patrimoine</h3>
            <p className="text-xs text-gray-400 mb-4">
              Valeur brute par catégorie au fil des relevés saisis.
            </p>
            <PatrimoineEvolutionChart />
          </div>
          <div className="bg-violet-50 rounded-xl shadow-sm border border-violet-200 p-6">
            <FireProjectionWidget />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-800">Patrimoine brut</h3>
              {familyMode && <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0">🏠 Foyer</span>}
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Répartition de la valeur actuelle par catégorie d'actif.
            </p>
            <PatrimoineByCategoryChart positions={familyPositions} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-800">Patrimoine financier</h3>
              {familyMode && <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0">🏠 Foyer</span>}
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Répartition hors immobilier physique et papier.
            </p>
            <PatrimoineByCategoryChart financierOnly positions={familyPositions} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-800">Répartition par enveloppe</h3>
              {familyMode && <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0">🏠 Foyer</span>}
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Répartition du patrimoine brut par type d'enveloppe fiscale (AV, PEA, CTO…).
            </p>
            <PatrimoineByEnvelopeChart positions={familyPositions} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-800">Plus-values par catégorie</h3>
              {familyMode && <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0">🏠 Foyer</span>}
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Répartition des plus-values latentes sur l'ensemble des positions actives.
            </p>
            <CapitalGainsByCategoryChart positions={familyPositions} />
          </div>
        </div>
      </div>
    </div>
  )
}
