import { useState, useEffect } from 'react'
import FireProjectionWidget from './FireProjectionWidget'
import PerformanceYtdWidget from './PerformanceYtdWidget'
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
import DiversificationSection from './DiversificationSection'
import PatrimoineKpiWidget from './PatrimoineKpiWidget'
import SafetyNetWidget from './SafetyNetWidget'
import DetteWidget from './DetteWidget'
import PatrimoineNetWidget from './PatrimoineNetWidget'
import CashFlowSankeyWidget from './CashFlowSankeyWidget'
import UpcomingExpensesWidget from './UpcomingExpensesWidget'
import GeographicExposureWidget from './GeographicExposureWidget'
import SectorExposureWidget from './SectorExposureWidget'
import { getMyGroupMembers, getMemberPositions } from '../../api/familyGroup'
import { getPositions } from '../../api/patrimoine'
import DashboardCustomizePanel from './DashboardCustomizePanel'
import { DEFAULT_WIDGET_CONFIG, SECTION_META, migrateConfig } from './widgets-registry'
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

// ── Section Revenus & Dépenses ────────────────────────────────────────────────
function RevenuesSection({ v, user, onNavigate, hideValues }) {
  const [hasSalaryData,  setHasSalaryData]  = useState(null)
  const [hasExpenseData, setHasExpenseData] = useState(null)

  return (
    <div>
      <SectionTitle title={SECTION_META.revenues.title} subtitle={SECTION_META.revenues.subtitle} />

      {(v.cashFlow || v.upcomingExpenses) && (
        <div className={`mb-6 grid gap-4 md:gap-6
          ${v.cashFlow && v.upcomingExpenses ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>

          {v.cashFlow && (
            <div className={`${v.upcomingExpenses ? 'md:col-span-2' : ''} bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
              <h3 className="text-base font-semibold text-gray-800 mb-1">Flux des revenus</h3>
              <p className="text-xs text-gray-400 mb-6">
                De vos sources de revenus jusqu'à chaque dépense individuelle, par catégorie.
              </p>
              <CashFlowSankeyWidget hideValues={hideValues} />
            </div>
          )}

          {v.upcomingExpenses && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <UpcomingExpensesWidget onNavigate={onNavigate} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {v.salaryAnnual && (
          <div className={`col-span-1 ${v.expensesBreakdown && hasExpenseData !== false ? 'md:col-span-2' : 'md:col-span-3'} bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Évolution salariale annuelle</h3>
            <p className="text-xs text-gray-400 mb-6">
              Brut, net imposable et net d'impôt par année — d'après les contrats et révisions salariales.
            </p>
            <SalaryAnnualBarChart />
          </div>
        )}

        {v.expensesBreakdown && hasExpenseData !== false && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des dépenses</h3>
            <p className="text-xs text-gray-400 mb-6">
              Part de chaque poste dans les dépenses mensuelles récurrentes, et capacité d'épargne résiduelle.
            </p>
            <ExpensesByCategoryChart onHasData={setHasExpenseData} />
          </div>
        )}
      </div>

      {v.salaryMonthly && hasSalaryData !== false && (
        <div className="hidden md:block mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-1">Détail mensuel par bulletins</h3>
          <p className="text-xs text-gray-400 mb-6">
            Brut, net fiscal, net versé et prélèvement à la source — données issues des bulletins de paie saisis.
          </p>
          <SalaryEvolutionChart onHasData={setHasSalaryData} />
        </div>
      )}

      {user.safetyNetMode && v.safetyNet && (
        <div className="mt-6">
          <SafetyNetWidget user={user} />
        </div>
      )}
    </div>
  )
}

// ── Section Patrimoine ────────────────────────────────────────────────────────
function PatrimoineSection({ v, familyMode, familyPositions, memberBreakdown, onNavigate }) {
  const [hasPassifData, setHasPassifData] = useState(null)

  return (
    <div>
      <SectionTitle title={SECTION_META.patrimoine.title} subtitle={SECTION_META.patrimoine.subtitle} />

      {(v.patrimoineEvolution || v.fireProjection || v.performanceYtd) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
          {v.patrimoineEvolution && (
            <div className={`col-span-1 ${(v.fireProjection || v.performanceYtd) ? 'md:col-span-2' : 'md:col-span-3'} flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
              <h3 className="text-base font-semibold text-gray-800 mb-1 shrink-0">Évolution du patrimoine</h3>
              <p className="text-xs text-gray-400 mb-4 shrink-0">
                Valeur brute par catégorie au fil des relevés saisis.
              </p>
              <div className="flex-1 min-h-0">
                <PatrimoineEvolutionChart />
              </div>
            </div>
          )}

          {(v.fireProjection || v.performanceYtd) && (
            <div className={`flex flex-col gap-4 md:gap-6 ${v.patrimoineEvolution ? '' : 'md:col-span-3 md:grid md:grid-cols-3'}`}>
              {v.fireProjection && (
                <div className={`bg-violet-50 rounded-xl shadow-sm border border-violet-200 p-6 ${!v.patrimoineEvolution ? 'md:col-span-1' : ''}`}>
                  <FireProjectionWidget />
                </div>
              )}
              {v.performanceYtd && (
                <div className={`bg-teal-50 rounded-xl shadow-sm border border-teal-200 p-6 ${!v.patrimoineEvolution ? 'md:col-span-1' : ''}`}>
                  <PerformanceYtdWidget onNavigate={onNavigate} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        {v.patrimoineBrut && (
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

        {v.patrimoineNet && <PatrimoineNetWidget />}

        {v.patrimoineFinancier && (
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

        {v.enveloppe && (
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

        {v.capitalGains && (
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

        {v.devise && (
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
        ) : v.passifs && hasPassifData !== false ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des passifs</h3>
            <p className="text-xs text-gray-400 mb-6">
              Valeur actuelle estimée par catégorie de possession, avec décote cumulée depuis l'achat.
            </p>
            <PassifsByCategoryChart onHasData={setHasPassifData} />
          </div>
        ) : null}
      </div>

      {familyMode && memberBreakdown && v.passifs && hasPassifData !== false && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-1">Répartition des passifs</h3>
          <p className="text-xs text-gray-400 mb-6">
            Valeur actuelle estimée par catégorie de possession, avec décote cumulée depuis l'achat.
          </p>
          <PassifsByCategoryChart onHasData={setHasPassifData} />
        </div>
      )}

      {(v.geoExposure || v.sectorExposure) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {v.geoExposure && (
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
          {v.sectorExposure && (
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

      {v.dette && (
        <div>
          <DetteWidget onNavigate={onNavigate} />
        </div>
      )}
    </div>
  )
}

// ── Section Objectifs & Stratégie ─────────────────────────────────────────────
function ObjectifsSection({ v }) {
  const hasAny = v.scorePatrimonial || v.objectives || v.kpiImmo || v.diversificationBourse || v.diversificationCrypto || v.diversificationImmo
  if (!hasAny) return null

  return (
    <div>
      <SectionTitle title={SECTION_META.objectifs.title} subtitle={SECTION_META.objectifs.subtitle} />

      {(v.scorePatrimonial || v.objectives) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6">
          {v.scorePatrimonial && (
            <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-200 p-6">
              <PatrimoineScoreWidget />
            </div>
          )}
          {v.objectives && (
            <div className={`col-span-1 ${v.scorePatrimonial ? 'md:col-span-3' : 'md:col-span-4'} bg-white rounded-xl shadow-sm border border-gray-200 p-6`}>
              <h3 className="text-base font-semibold text-gray-800 mb-1">Avancement vers les objectifs</h3>
              <p className="text-xs text-gray-400 mb-4">
                Superposition du patrimoine actuel et des objectifs cibles par catégorie — en pourcentage de l'objectif.
              </p>
              <PatrimoineStrategyRadarChart />
            </div>
          )}
        </div>
      )}

      {v.kpiImmo && <PatrimoineKpiWidget />}

      {(v.diversificationBourse || v.diversificationCrypto || v.diversificationImmo) && (
        <DiversificationSection
          showBourse={!!v.diversificationBourse}
          showCrypto={!!v.diversificationCrypto}
          showImmo={!!v.diversificationImmo}
        />
      )}
    </div>
  )
}

const SECTION_COMPONENTS = {
  revenues:   RevenuesSection,
  patrimoine: PatrimoineSection,
  objectifs:  ObjectifsSection,
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function DashboardPage({ user, familyMode, onNavigate, hideValues = false }) {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('dashboard.main') }, [])
  const [familyPositions, setFamilyPositions] = useState(null)
  const [memberBreakdown, setMemberBreakdown] = useState(null)
  const [customizing,     setCustomizing]     = useState(false)
  const [wc, setWc] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboardWidgets')
      return migrateConfig(saved ? JSON.parse(saved) : null)
    } catch { return DEFAULT_WIDGET_CONFIG }
  })

  function updateWc(next) {
    setWc(next)
    localStorage.setItem('dashboardWidgets', JSON.stringify(next))
  }

  useEffect(() => {
    async function run() {
      if (!familyMode) { setFamilyPositions(null); setMemberBreakdown(null); return }
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
      } catch { setFamilyPositions(null); setMemberBreakdown(null) }
    }
    run()
  }, [familyMode, user.firstName])

  const sectionProps = {
    revenues:   { v: wc.visibility, user, onNavigate, hideValues },
    patrimoine: { v: wc.visibility, familyMode, familyPositions, memberBreakdown, onNavigate },
    objectifs:  { v: wc.visibility },
  }

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
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 dark:text-indigo-300 font-medium">
          <span>🏠</span>
          <span>Mode Foyer activé — les graphiques patrimoniaux agrègent les données de tous les membres du groupe.</span>
        </div>
      )}

      {wc.sectionOrder.map(sectionKey => {
        const Section = SECTION_COMPONENTS[sectionKey]
        return Section ? <Section key={sectionKey} {...sectionProps[sectionKey]} /> : null
      })}
    </div>
  )
}
