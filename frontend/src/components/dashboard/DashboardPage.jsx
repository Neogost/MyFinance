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
import PatrimoineByMemberChart from './PatrimoineByMemberChart'
import PatrimoineByCurrencyChart from './PatrimoineByCurrencyChart'
import PatrimoineStrategyRadarChart from './PatrimoineStrategyRadarChart'
import PatrimoineScoreWidget from './PatrimoineScoreWidget'
import SafetyNetWidget from './SafetyNetWidget'
import DetteWidget from './DetteWidget'
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

function sumActive(positions) {
  return positions
    .filter(p => p.status === 'ACTIVE')
    .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
}

export default function DashboardPage({ user, familyMode, onNavigate }) {
  const [familyPositions,  setFamilyPositions]  = useState(null)
  const [memberBreakdown,  setMemberBreakdown]  = useState(null)

  useEffect(() => {
    async function run() {
      if (!familyMode) {
        setFamilyPositions(null)
        setMemberBreakdown(null)
        return
      }
      try {
        const [ownPositions, members] = await Promise.all([getPositions(), getMyGroupMembers()])
        const memberPositions = await Promise.all(members.map(m => getMemberPositions(m.id)))

        setFamilyPositions([...ownPositions, ...memberPositions.flat()])

        const total = sumActive(ownPositions) + memberPositions.reduce((s, mp) => s + sumActive(mp), 0)
        const breakdown = [
          { name: user.firstName, value: Math.round(sumActive(ownPositions)) },
          ...members.map((m, i) => ({ name: m.firstName, value: Math.round(sumActive(memberPositions[i])) })),
        ]
          .filter(d => d.value > 0)
          .map(d => ({ ...d, pct: total > 0 ? (d.value / total * 100).toFixed(1) : '0.0' }))
        setMemberBreakdown(breakdown)
      } catch {
        setFamilyPositions(null)
        setMemberBreakdown(null)
      }
    }
    run()
  }, [familyMode, user.firstName])

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

        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-1">Détail mensuel par bulletins</h3>
          <p className="text-xs text-gray-400 mb-6">
            Brut, net fiscal, net versé et prélèvement à la source — données issues des bulletins de paie saisis.
          </p>
          <SalaryEvolutionChart />
        </div>

        {user.safetyNetMode && (
          <div className="mt-6">
            <SafetyNetWidget user={user} />
          </div>
        )}
      </div>

      {/* ── Patrimoine ───────────────────────────────────────────── */}
      <div>
        <SectionTitle
          title="Patrimoine"
          subtitle="Évolution, répartition, plus-values et avancement vers les objectifs."
        />

        {/* Évolution historique + Projection FIRE */}
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

        {/* Répartition — 3 × 2 donuts */}
        <div className="grid grid-cols-3 gap-6 mb-6">
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-800">Répartition par devise</h3>
              {familyMode && <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0">🏠 Foyer</span>}
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Exposition aux devises étrangères — valeurs converties en EUR au taux courant.
            </p>
            <PatrimoineByCurrencyChart positions={familyPositions} />
          </div>

          {familyMode && memberBreakdown ? (
            <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-gray-800">Patrimoine par membre</h3>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0">🏠 Foyer</span>
              </div>
              <p className="text-xs text-gray-400 mb-6">
                Part du patrimoine brut actif détenue par chaque membre du groupe.
              </p>
              <PatrimoineByMemberChart data={memberBreakdown} />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des passifs</h3>
              <p className="text-xs text-gray-400 mb-6">
                Valeur actuelle estimée par catégorie de possession, avec décote cumulée depuis l'achat.
              </p>
              <PassifsByCategoryChart />
            </div>
          )}
        </div>

        {/* Stratégie & passifs (mode Foyer : passifs prend sa propre ligne) */}
        {familyMode && memberBreakdown && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des passifs</h3>
            <p className="text-xs text-gray-400 mb-6">
              Valeur actuelle estimée par catégorie de possession, avec décote cumulée depuis l'achat.
            </p>
            <PassifsByCategoryChart />
          </div>
        )}

        {/* Score patrimonial + Radar objectifs + Endettement */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-200 p-6">
            <PatrimoineScoreWidget />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Avancement vers les objectifs</h3>
            <p className="text-xs text-gray-400 mb-4">
              Superposition du patrimoine actuel et des objectifs cibles par catégorie — en pourcentage de l'objectif.
            </p>
            <PatrimoineStrategyRadarChart />
          </div>
          <div className="col-span-2">
            <DetteWidget onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </div>
  )
}
