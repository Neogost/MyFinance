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
import PatrimoineNetWidget from './PatrimoineNetWidget'
import GeographicExposureWidget from './GeographicExposureWidget'
import SectorExposureWidget from './SectorExposureWidget'
import { getMyGroupMembers, getMemberPositions } from '../../api/familyGroup'
import { getPositions } from '../../api/patrimoine'
import DashboardCustomizePanel, { DEFAULT_WIDGET_CONFIG } from './DashboardCustomizePanel'
import { useAnalytics } from '../../hooks/useAnalytics'

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
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('dashboard.main') }, [])
  const [familyPositions,  setFamilyPositions]  = useState(null)
  const [memberBreakdown,  setMemberBreakdown]  = useState(null)
  const [hasSalaryData,    setHasSalaryData]    = useState(null)
  const [hasExpenseData,   setHasExpenseData]   = useState(null)
  const [hasPassifData,    setHasPassifData]    = useState(null)
  const [customizing,      setCustomizing]      = useState(false)
  const [wc, setWc] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboardWidgets')
      return saved ? { ...DEFAULT_WIDGET_CONFIG, ...JSON.parse(saved) } : DEFAULT_WIDGET_CONFIG
    } catch { return DEFAULT_WIDGET_CONFIG }
  })

  function updateWc(next) {
    setWc(next)
    localStorage.setItem('dashboardWidgets', JSON.stringify(next))
  }

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-gray-500 text-sm mt-1">
            Bonjour <strong>{user.firstName}</strong> — une vue d'ensemble de vos revenus, dépenses et patrimoine.
          </p>
        </div>
        <button
          onClick={() => setCustomizing(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Personnaliser
        </button>
      </div>

      {customizing && (
        <DashboardCustomizePanel
          config={wc}
          onChange={updateWc}
          onClose={() => setCustomizing(false)}
        />
      )}

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {wc.salaryAnnual && (
            <div className={`col-span-1 ${wc.expensesBreakdown && hasExpenseData !== false ? 'md:col-span-2' : 'md:col-span-3'} bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
              <h3 className="text-base font-semibold text-gray-800 mb-1">Évolution salariale annuelle</h3>
              <p className="text-xs text-gray-400 mb-6">
                Brut, net imposable et net d'impôt par année — d'après les contrats et révisions salariales.
              </p>
              <SalaryAnnualBarChart />
            </div>
          )}

          {wc.expensesBreakdown && hasExpenseData !== false && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des dépenses</h3>
              <p className="text-xs text-gray-400 mb-6">
                Part de chaque poste dans les dépenses mensuelles récurrentes, et capacité d'épargne résiduelle.
              </p>
              <ExpensesByCategoryChart onHasData={setHasExpenseData} />
            </div>
          )}
        </div>

        {wc.salaryMonthly && hasSalaryData !== false && (
          <div className="hidden md:block mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Détail mensuel par bulletins</h3>
            <p className="text-xs text-gray-400 mb-6">
              Brut, net fiscal, net versé et prélèvement à la source — données issues des bulletins de paie saisis.
            </p>
            <SalaryEvolutionChart onHasData={setHasSalaryData} />
          </div>
        )}

        {user.safetyNetMode && wc.safetyNet && (
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
        {(wc.patrimoineEvolution || wc.fireProjection) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
            {wc.patrimoineEvolution && (
              <div className={`col-span-1 ${wc.fireProjection ? 'md:col-span-2' : 'md:col-span-3'} bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
                <h3 className="text-base font-semibold text-gray-800 mb-1">Évolution du patrimoine</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Valeur brute par catégorie au fil des relevés saisis.
                </p>
                <PatrimoineEvolutionChart />
              </div>
            )}
            {wc.fireProjection && (
              <div className="bg-violet-50 rounded-xl shadow-sm border border-violet-200 p-6">
                <FireProjectionWidget />
              </div>
            )}
          </div>
        )}

        {/* Répartition — 3 × 2 donuts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
          {wc.patrimoineBrut && (
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
          )}

          {wc.patrimoineNet && <PatrimoineNetWidget />}

          {wc.patrimoineFinancier && (
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
          )}

          {wc.enveloppe && (
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
          )}

          {wc.capitalGains && (
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
          )}

          {wc.devise && (
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
          )}

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
          ) : wc.passifs && hasPassifData !== false ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des passifs</h3>
              <p className="text-xs text-gray-400 mb-6">
                Valeur actuelle estimée par catégorie de possession, avec décote cumulée depuis l'achat.
              </p>
              <PassifsByCategoryChart onHasData={setHasPassifData} />
            </div>
          ) : null}
        </div>

        {/* Stratégie & passifs (mode Foyer : passifs prend sa propre ligne) */}
        {familyMode && memberBreakdown && wc.passifs && hasPassifData !== false && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des passifs</h3>
            <p className="text-xs text-gray-400 mb-6">
              Valeur actuelle estimée par catégorie de possession, avec décote cumulée depuis l'achat.
            </p>
            <PassifsByCategoryChart onHasData={setHasPassifData} />
          </div>
        )}

        {/* Exposition géographique & sectorielle */}
        {(wc.geoExposure || wc.sectorExposure) && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {wc.geoExposure && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-base font-semibold text-gray-800">Exposition géographique</h3>
                  {familyMode && <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0">🏠 Foyer</span>}
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Positions BOURSE pondérées par l'allocation géographique de chaque ETF.
                </p>
                <GeographicExposureWidget positions={familyPositions} />
              </div>
            )}
            {wc.sectorExposure && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-base font-semibold text-gray-800">Exposition sectorielle</h3>
                  {familyMode && <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 shrink-0">🏠 Foyer</span>}
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Positions BOURSE pondérées par la répartition sectorielle de chaque ETF.
                </p>
                <SectorExposureWidget positions={familyPositions} />
              </div>
            )}
          </div>
        )}

        {/* Score patrimonial + Radar objectifs + Endettement */}
        {(wc.scorePatrimonial || wc.objectives || wc.dette) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {wc.scorePatrimonial && (
              <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-200 p-6">
                <PatrimoineScoreWidget />
              </div>
            )}
            {wc.objectives && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-1">Avancement vers les objectifs</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Superposition du patrimoine actuel et des objectifs cibles par catégorie — en pourcentage de l'objectif.
                </p>
                <PatrimoineStrategyRadarChart />
              </div>
            )}
            {wc.dette && (
              <div className={`col-span-1 ${wc.scorePatrimonial && wc.objectives ? 'md:col-span-2' : wc.scorePatrimonial || wc.objectives ? 'md:col-span-3' : 'md:col-span-4'}`}>
                <DetteWidget onNavigate={onNavigate} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
