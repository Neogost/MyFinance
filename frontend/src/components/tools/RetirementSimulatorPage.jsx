import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { getRetirementParameters } from '../../api/retirement'
import { getMe } from '../../api/auth'
import { getSalaryContracts } from '../../api/income'
import { simulateTax } from '../../api/tools'
import { inferTMI } from '../../data/fiscal-envelopes'
import { useAnalytics } from '../../hooks/useAnalytics'
import {
  projectCareer,
  computeRegimeGeneral,
  computeAgircArrco,
  computeRegimePublic,
  computeRAFP,
  applySocialCharges,
  simulateAtAge,
  computeRequiredPERCapital,
  computeRequiredPERContribution,
  getAgeMinimal,
  getTrimestreRequis,
} from '../../utils/retirement'

const CURRENT_YEAR = new Date().getFullYear()
const VALEUR_POINT_INDICE_DEFAULT = 59.0734  // €/an — en attendant le pré-remplissage

// ── Formatage ─────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}
function fmtPct(n, dec = 0) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' %'
}
function fmtK(n) {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1000000) return (n / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€'
  if (Math.abs(n) >= 1000) return (n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' K€'
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

// ── InfoTooltip (portal) ──────────────────────────────────────────────────────
// Rendu dans document.body via createPortal → jamais coupé par overflow parent

function InfoTooltip({ text, width = 'w-64' }) {
  const [coords, setCoords] = useState(null)
  const ref = useRef(null)

  function show() {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const above = r.top > 140  // assez d'espace au-dessus
    setCoords({ x: r.left + r.width / 2, y: above ? r.top - 8 : r.bottom + 8, above })
  }

  return (
    <span ref={ref} onMouseEnter={show} onMouseLeave={() => setCoords(null)}
      className="ml-1.5 cursor-help inline-flex items-center align-middle">
      <svg className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      {coords && createPortal(
        <div style={{
          position: 'fixed',
          left: coords.x,
          top: coords.y,
          transform: coords.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          zIndex: 9999,
        }} className={`${width} text-xs text-white bg-gray-800 rounded-lg px-3 py-2 shadow-lg leading-relaxed pointer-events-none text-left`}>
          <span className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
            coords.above ? 'top-full border-t-gray-800' : 'bottom-full border-b-gray-800'
          }`} />
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, min, max, step = 1, unit = '', hint, disabled, tooltip }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
        {tooltip && <InfoTooltip text={tooltip} width="w-72" />}
      </label>
      <div className="relative">
        <input
          type="number" value={value} min={min} max={max} step={step} disabled={disabled}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 ${unit ? 'pr-8' : ''} ${disabled ? 'bg-gray-50 dark:bg-gray-800 text-gray-400' : ''}`}
        />
        {unit && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Section({ title, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      {collapsible ? (
        <button onClick={() => setOpen(v => !v)}
          className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
          <span className="text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
      ) : (
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h2>
      )}
      {(!collapsible || open) && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}

function KPICard({ label, value, sub, color = 'text-indigo-600', big }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`${big ? 'text-2xl' : 'text-lg'} font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

const CustomTooltipChart = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{fmt(p.value)}/an</span>
        </div>
      ))}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function RetirementSimulatorPage() {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('tools.retirement') }, [])
  // Référentiel
  const [params,        setParams]        = useState(null)
  const [loadingParams, setLoadingParams] = useState(true)

  // Profil utilisateur (pré-rempli)
  const [birthDate,          setBirthDate]          = useState('')
  const [contractType,       setContractType]       = useState('PRIVATE')
  const [currentSalaryGross, setCurrentSalaryGross] = useState(45000)
  const [currentIndiceMajore,setCurrentIndiceMajore]= useState(500)
  const [careerStartYear,    setCareerStartYear]    = useState(CURRENT_YEAR - 10)

  // Carrière
  const [salaryGrowthRate, setSalaryGrowthRate] = useState(2)
  const [retirementAge,    setRetirementAge]    = useState(64)
  const [trimestresAcquis, setTrimestresAcquis] = useState(0)
  const [trimestresAdditionnels, setTrimestresAdditionnels] = useState(0)

  // Agirc-Arrco
  const [agircPoints,                  setAgircPoints]                  = useState(0)
  const [appliquerCoefficientSolidarite,setAppliquerCoefficientSolidarite] = useState(true)

  // Public
  const [valeurPointIndice, setValeurPointIndice] = useState(VALEUR_POINT_INDICE_DEFAULT)
  const [rafpRate,          setRafpRate]          = useState(5)

  // Objectif
  const [targetMode,           setTargetMode]           = useState('replacementRate')
  const [targetReplacementRate,setTargetReplacementRate] = useState(75)
  const [targetMonthlyIncome,  setTargetMonthlyIncome]  = useState(2500)

  // Stratégie PER
  const [perAnnualReturn,  setPerAnnualReturn]  = useState(5)
  const [perWithdrawalRate,setPerWithdrawalRate] = useState(4)
  const [perCurrentCapital,setPerCurrentCapital] = useState(0)
  const [retirementTMI,    setRetirementTMI]    = useState(19)

  // ── Effects de pré-remplissage ────────────────────────────────────────────
  useEffect(() => {
    getRetirementParameters()
      .then(setParams)
      .catch(() => {})
      .finally(() => setLoadingParams(false))

    getMe()
      .then(user => {
        if (user?.birthDate) {
          setBirthDate(user.birthDate)
          const yearOfBirth   = new Date(user.birthDate).getFullYear()
          const careerStart   = yearOfBirth + 22
          setCareerStartYear(careerStart)
          const yearsWorked   = CURRENT_YEAR - careerStart
          setTrimestresAcquis(Math.max(0, yearsWorked * 4))
        }
      })
      .catch(() => {})

    getSalaryContracts()
      .then(contracts => {
        const active = contracts?.find(c => c.isActive)
        if (!active) return
        setContractType(active.contractType || 'PRIVATE')
        if (active.contractType === 'PUBLIC') {
          setCurrentIndiceMajore(active.indiceMajore || 500)
        } else {
          setCurrentSalaryGross(active.annualGrossSalary || 45000)
        }
        if (active.startDate) {
          const startY = new Date(active.startDate).getFullYear()
          setCareerStartYear(startY)
        }
      })
      .catch(() => {})

    simulateTax()
      .then(res => {
        const revenuParPart = res.totalTaxableIncome && res.fiscalParts
          ? res.totalTaxableIncome / res.fiscalParts : null
        if (revenuParPart != null) {
          const tmi = inferTMI(revenuParPart)
          setRetirementTMI(Math.max(0, tmi - 11))
        }
      })
      .catch(() => {})
  }, [])

  // ── Salaire effectif (privé vs public) ───────────────────────────────────
  const effectiveSalaryGross = contractType === 'PUBLIC'
    ? currentIndiceMajore * valeurPointIndice
    : currentSalaryGross

  const indiceMajoreFinCarriere = contractType === 'PUBLIC'
    ? currentIndiceMajore * Math.pow(1 + salaryGrowthRate / 100, Math.max(0, (new Date(birthDate || '1980-01-01').getFullYear() + retirementAge) - CURRENT_YEAR))
    : 0

  // ── Calculs principaux ────────────────────────────────────────────────────
  const career = useMemo(() => {
    if (!birthDate) return null
    return projectCareer({
      currentSalaryGross: effectiveSalaryGross,
      salaryGrowthRate,
      retirementAge,
      birthDate,
      careerStartYear,
    })
  }, [birthDate, effectiveSalaryGross, salaryGrowthRate, retirementAge, careerStartYear])

  const simParams = useMemo(() => ({
    career,
    contractType,
    trimestresAcquis,
    trimestresAdditionnels,
    agircArrcoPointsActuels: agircPoints,
    appliquerCoefficientSolidarite,
    indiceMajoreFinCarriere,
    valeurPointIndice,
    rafpRate,
    params,
  }), [career, contractType, trimestresAcquis, trimestresAdditionnels, agircPoints,
      appliquerCoefficientSolidarite, indiceMajoreFinCarriere, valeurPointIndice, rafpRate, params])

  const result = useMemo(() => {
    if (!career || !params) return null

    let baseScheme, complementary

    if (contractType === 'PUBLIC') {
      baseScheme   = computeRegimePublic(career, { retirementAge, trimestresAcquis, trimestresAdditionnels, indiceMajoreFinCarriere, valeurPointIndice, params })
      complementary = computeRAFP(baseScheme.annual, rafpRate)
    } else {
      baseScheme   = computeRegimeGeneral(career, { retirementAge, trimestresAcquis, trimestresAdditionnels, params })
      complementary = computeAgircArrco(career, { retirementAge, trimestresAcquis, agircArrcoPointsActuels: agircPoints, appliquerCoefficientSolidarite, params })
    }

    const totalGrossAnnual = baseScheme.annual + complementary.annual
    const totalNetAnnual   = applySocialCharges(totalGrossAnnual, complementary.annual > 0, params)
    const monthlyNet       = totalNetAnnual / 12
    const replacementRate  = career.lastNetAnnual > 0 ? totalNetAnnual / career.lastNetAnnual * 100 : 0

    const ageComparison = [60, 62, 64, 67]
      .map(age => simulateAtAge(age, simParams))
      .filter(Boolean)

    // Bloc PER
    const targetMonthlyNet = targetMode === 'replacementRate'
      ? (career.lastNetMonthly * targetReplacementRate / 100)
      : targetMonthlyIncome

    const deltaMonthly = Math.max(0, targetMonthlyNet - monthlyNet)
    const perCapital   = computeRequiredPERCapital(deltaMonthly * 12, { retirementTMI, perWithdrawalRate })
    const perContrib   = computeRequiredPERContribution(perCapital, {
      yearsRemaining: career.yearsRemaining,
      perAnnualReturn,
      perCurrentCapital,
    })

    return {
      baseScheme, complementary,
      totalGrossAnnual, totalNetAnnual, monthlyNet,
      replacementRate, ageComparison,
      targetMonthlyNet, deltaMonthly,
      perCapital, perContrib,
    }
  }, [career, params, contractType, retirementAge, trimestresAcquis, trimestresAdditionnels,
      agircPoints, appliquerCoefficientSolidarite, indiceMajoreFinCarriere, valeurPointIndice,
      rafpRate, targetMode, targetReplacementRate, targetMonthlyIncome,
      retirementTMI, perWithdrawalRate, perAnnualReturn, perCurrentCapital, simParams])

  // ── Données graphique ─────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!career || !params || !result) return []
    const points = []
    const yearOfRetirement = career.yearOfRetirement
    const endYear = Math.max(yearOfRetirement + 25, CURRENT_YEAR + 30)

    for (let y = Math.max(CURRENT_YEAR - 5, career.startYear); y <= endYear; y++) {
      if (y < yearOfRetirement) {
        points.push({ year: y, salaire: Math.round((career.salaries[y] || 0) * 0.77), pension: 0 })
      } else {
        points.push({ year: y, salaire: 0, pension: Math.round(result.totalNetAnnual) })
      }
    }
    return points
  }, [career, params, result])

  // ── Gardes d'affichage ────────────────────────────────────────────────────
  if (loadingParams) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Simulateur Retraite</h1>
        <p className="text-gray-400 text-sm">Chargement des barèmes…</p>
      </div>
    )
  }

  const missingBirthDate = !birthDate
  const yearOfBirth      = birthDate ? new Date(birthDate).getFullYear() : 1980
  const trimestresRequis = params ? getTrimestreRequis(yearOfBirth, params) : 172
  const ageMinimal       = params ? getAgeMinimal(yearOfBirth, params) : 64
  const projectedTrimestres = career ? Math.max(0, career.yearsRemaining * 4) : 0
  const trimestresTotal    = trimestresAcquis + trimestresAdditionnels + projectedTrimestres
  const hasDecote          = trimestresTotal < trimestresRequis

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Simulateur Retraite
        <span className="text-sm font-normal text-gray-400 ml-2">Régime Général · Agirc-Arrco · CNRACL</span>
      </h1>

      {missingBirthDate && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          ⚠ Votre date de naissance n'est pas renseignée dans votre profil. Saisissez-la ci-dessous pour activer les calculs.
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:items-start">

        {/* ══ PANNEAU GAUCHE ══════════════════════════════════════════════ */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-3">

          <Section title="Mon profil">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Date de naissance
                <InfoTooltip text="Détermine votre génération, donc le nombre de trimestres requis pour le taux plein et votre âge légal minimum de départ. La réforme 2023 a porté l'âge légal à 64 ans pour les générations 1968+ et la durée à 172 trimestres (43 ans) pour 1965+." />
              </label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
              {birthDate && <p className="text-xs text-gray-400 mt-0.5">Âge actuel : {CURRENT_YEAR - yearOfBirth} ans · Retraite en {yearOfBirth + retirementAge}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Type de contrat
                <InfoTooltip width="w-80" text="Détermine le régime de retraite applicable. Privé → Régime Général (CNAV) + Agirc-Arrco : pension calculée sur les 25 meilleures années de salaire. Public (fonction publique, CNRACL) → pension calculée sur le traitement indiciaire des 6 derniers mois × 75 % au taux plein. Les règles de décote et de surcote sont identiques (1,25 %/trimestre)." />
              </label>
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden text-xs">
                {['PRIVATE', 'PUBLIC'].map(t => (
                  <button key={t} onClick={() => setContractType(t)}
                    className={`flex-1 py-1.5 transition ${contractType === t ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    {t === 'PRIVATE' ? '🏢 Privé' : '🏛️ Public'}
                  </button>
                ))}
              </div>
            </div>

            {contractType === 'PUBLIC' ? (
              <>
                <NumInput label="Indice majoré actuel" value={currentIndiceMajore}
                  onChange={setCurrentIndiceMajore} min={200} max={1500}
                  hint={`Traitement brut : ${fmt(currentIndiceMajore * valeurPointIndice)}/an`}
                  tooltip="L'indice majoré (IM) est l'unité de référence de la rémunération dans la fonction publique. Votre traitement brut = IM × valeur du point d'indice. Il évolue avec vos avancements de grade et d'échelon. Consultez votre bulletin de paie ou la fiche de poste." />
                <NumInput label="Valeur du point d'indice (€/an)" value={valeurPointIndice}
                  onChange={setValeurPointIndice} min={50} max={100} step={0.0001}
                  hint="59,0734 €/an en 2024"
                  tooltip="La valeur annuelle du point d'indice est fixée par décret et s'applique à tous les fonctionnaires. Elle est revalorisée périodiquement. Depuis juillet 2023 : 59,0734 €/an. Votre traitement brut mensuel = IM × valeur annuelle / 12." />
              </>
            ) : (
              <NumInput label="Salaire brut annuel actuel (€)" value={currentSalaryGross}
                onChange={setCurrentSalaryGross} min={0} step={1000}
                tooltip="Votre salaire brut annuel actuel (avant cotisations salariales). C'est la base de projection des salaires futurs et de la rétro-projection des années passées. Il est utilisé pour calculer le Salaire Annuel Moyen (SAM) sur les 25 meilleures années." />
            )}

            <NumInput label="Début de carrière (année)" value={careerStartYear}
              onChange={v => setCareerStartYear(Math.floor(v))}
              min={1970} max={CURRENT_YEAR}
              hint={careerStartYear ? `${CURRENT_YEAR - careerStartYear} ans de carrière à ce jour` : ''}
              tooltip="Année de votre première entrée dans la vie active (premier emploi cotisant). Détermine la durée totale de carrière et la rétro-projection des salaires passés. Si non connu, la simulation suppose un début à 22 ans." />
          </Section>

          <Section title="Carrière prévisionnelle">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Âge de départ souhaité — {retirementAge} ans
                <InfoTooltip width="w-80" text={`Âge auquel vous souhaitez liquider votre retraite. Âge légal minimum pour votre génération (${yearOfBirth}) : ${ageMinimal} ans. Taux plein automatique (sans condition de durée) : 67 ans. Partir avant le taux plein avec moins de ${trimestresRequis} trimestres entraîne une décote de 1,25 %/trimestre manquant (max 25 %).`} />
                {ageMinimal && retirementAge < ageMinimal && (
                  <span className="ml-1 text-red-500">(min. légal {ageMinimal} ans)</span>
                )}
              </label>
              <input type="range" min={60} max={70} value={retirementAge}
                onChange={e => setRetirementAge(Number(e.target.value))}
                className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>60 ans</span><span>70 ans</span>
              </div>
            </div>
            <NumInput label="Hausse annuelle du salaire (%)" value={salaryGrowthRate}
              onChange={setSalaryGrowthRate} min={0} max={10} step={0.5} unit="%"
              tooltip="Taux d'évolution annuel moyen de votre salaire brut jusqu'à la retraite. Utilisé à la fois pour projeter vos salaires futurs ET rétro-projeter les années passées non connues (pour estimer le SAM). En France, la progression moyenne est de 1,5–3 %/an selon le secteur." />
            <NumInput label="Trimestres déjà validés" value={trimestresAcquis}
              onChange={setTrimestresAcquis} min={0} max={200}
              hint={`Requis pour taux plein : ${trimestresRequis} trimestres`}
              tooltip={`Un trimestre est validé si vous avez perçu au moins 150 fois le SMIC horaire sur la période (soit environ 1 622 €/trimestre en 2024). Vous pouvez consulter votre nombre exact de trimestres sur info-retraite.fr (relevé de carrière gratuit). Par défaut, la simulation estime ${CURRENT_YEAR - careerStartYear} trimestres depuis le début de carrière.`} />
            <NumInput label="Trimestres bonifiés (enfants, militaire…)" value={trimestresAdditionnels}
              onChange={setTrimestresAdditionnels} min={0} max={32}
              tooltip="Trimestres supplémentaires accordés hors activité professionnelle. Exemples : 8 trimestres par enfant élevé (majoration maternité), service militaire (1 trimestre/90 jours), périodes de chômage indemnisé, congé maladie longue durée, congé maternité/paternité. Ces trimestres s'ajoutent aux trimestres cotisés pour atteindre le taux plein." />

            {hasDecote && (
              <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1.5">
                ⚠ Décote attendue — {Math.max(0, trimestresRequis - trimestresTotal)} trimestres manquants à {retirementAge} ans
              </div>
            )}
          </Section>

          {contractType === 'PRIVATE' && (
            <Section title="Hypothèses Agirc-Arrco" collapsible defaultOpen={false}>
              <p className="text-xs text-gray-400 -mt-1">
                Régime complémentaire obligatoire du secteur privé — système à points.
                <InfoTooltip width="w-80" text="L'Agirc-Arrco est le régime complémentaire de tous les salariés du privé (cadres et non-cadres fusionnés depuis 2019). Chaque année, vos cotisations achètent des points au prix d'achat du point (18,77 € en 2024). À la retraite, votre nombre total de points est multiplié par la valeur du point (1,4159 € en 2024) pour donner votre pension complémentaire annuelle." />
              </p>
              <NumInput label="Points Agirc-Arrco déjà accumulés" value={agircPoints}
                onChange={setAgircPoints} min={0} max={50000}
                hint="Consultez votre relevé info-retraite (info-retraite.fr)"
                tooltip="Votre nombre de points Agirc-Arrco est disponible sur info-retraite.fr (espace personnel gratuit). Si vous ne connaissez pas ce chiffre, laissez à 0 : le simulateur estimera vos points par projection à partir de votre salaire actuel et de votre début de carrière." />
              <div className="flex items-start gap-2">
                <input type="checkbox" id="solidarite" checked={appliquerCoefficientSolidarite}
                  onChange={e => setAppliquerCoefficientSolidarite(e.target.checked)}
                  className="rounded border-gray-300 accent-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <label htmlFor="solidarite" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    Coefficient de solidarité Agirc-Arrco
                    <InfoTooltip text="Malus temporaire de −10 % pendant 3 ans sur la pension Agirc-Arrco si vous partez dès l'âge légal (sans attendre un trimestre de plus). Pour l'éviter, il faut soit attendre 67 ans (taux plein automatique), soit partir avec au moins un trimestre de plus que l'âge légal. Ce coefficient s'applique à la majorité des départs à 64 ans." />
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">−10 % pendant 3 ans si départ sans surcote</p>
                </div>
              </div>
            </Section>
          )}

          {contractType === 'PUBLIC' && (
            <Section title="Hypothèses CNRACL / RAFP" collapsible defaultOpen={false}>
              <NumInput label="RAFP forfaitaire (%)" value={rafpRate}
                onChange={setRafpRate} min={0} max={15} step={0.5} unit="%"
                hint="Retraite Additionnelle Fonction Publique — modèle simplifié V1"
                tooltip="La RAFP est le régime complémentaire obligatoire de la fonction publique, créé en 2005. Elle fonctionne par points sur les primes (plafonnées à 20 % du traitement). Ce simulateur utilise un modèle simplifié : un pourcentage forfaitaire du traitement de base, en l'absence d'historique précis des primes. Valeur réaliste : 3–6 % selon votre niveau de primes." />
            </Section>
          )}

          <Section title="Objectif retraite">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Mode
                <InfoTooltip text="Taux de remplacement : votre pension nette représente X % de votre dernier salaire net — c'est la mesure standard de confort à la retraite (objectif classique : 70–80 %). Montant fixe : vous ciblez directement un revenu mensuel net précis, indépendamment de votre salaire actuel." />
              </label>
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden text-xs">
                <button onClick={() => setTargetMode('replacementRate')}
                  className={`flex-1 py-1.5 transition ${targetMode === 'replacementRate' ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  Taux de remplacement
                </button>
                <button onClick={() => setTargetMode('fixedAmount')}
                  className={`flex-1 py-1.5 transition ${targetMode === 'fixedAmount' ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  Montant fixe
                </button>
              </div>
            </div>
            {targetMode === 'replacementRate' ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Taux cible — {targetReplacementRate} %
                  <InfoTooltip text="Taux de remplacement = pension nette / dernier salaire net. En France, le taux de remplacement moyen du régime obligatoire seul est d'environ 50–65 % pour le privé et 70–75 % pour le public. La règle des 80 % est souvent citée comme nécessaire pour maintenir son niveau de vie (certaines charges disparaissent à la retraite : crédits remboursés, enfants indépendants…)." />
                </label>
                <input type="range" min={30} max={100} value={targetReplacementRate}
                  onChange={e => setTargetReplacementRate(Number(e.target.value))}
                  className="w-full accent-indigo-600" />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>30 %</span><span>100 %</span>
                </div>
              </div>
            ) : (
              <NumInput label="Revenu mensuel net cible (€)" value={targetMonthlyIncome}
                onChange={setTargetMonthlyIncome} min={500} max={20000} step={100} />
            )}
          </Section>

          <Section title="Stratégie PER" collapsible defaultOpen={false}>
            <p className="text-xs text-gray-400 -mt-1">
              Capital nécessaire pour combler le manque entre la pension et votre objectif.
              <InfoTooltip width="w-80" text="Le PER (Plan Épargne Retraite) permet de déduire vos versements de votre revenu imposable (avantage fiscal à l'entrée), mais la sortie est taxée au barème IR + PFU 30 % sur les gains. L'idée : déduire à votre TMI active (haute) et payer à votre TMI retraite (basse). Le capital PER calculé ici est le complément nécessaire au-delà de votre pension pour atteindre votre objectif." />
            </p>
            <NumInput label="Rendement annuel PER (%)" value={perAnnualReturn}
              onChange={setPerAnnualReturn} min={0} max={15} step={0.5} unit="%"
              tooltip="Rendement annuel attendu de votre PER jusqu'à la retraite. En gestion pilotée « horizon retraite » : 4–6 %/an sur un horizon long. Ce taux sert à capitaliser vos versements futurs et à valoriser votre capital PER déjà accumulé." />
            <NumInput label="Taux de retrait à la retraite (%)" value={perWithdrawalRate}
              onChange={setPerWithdrawalRate} min={2} max={8} step={0.5} unit="%"
              hint="Règle des 4 % recommandée"
              tooltip="Pourcentage du capital PER retiré chaque année à la retraite pour couvrir le manque. La règle des 4 % (taux de retrait soutenable sur 30 ans avec un portefeuille diversifié) est la référence. À 4 %, un capital de 100 000 € génère 4 000 €/an = 333 €/mois. Un taux plus bas = capital nécessaire plus élevé mais durabilité meilleure." />
            <NumInput label="Capital PER déjà accumulé (€)" value={perCurrentCapital}
              onChange={setPerCurrentCapital} min={0} step={1000}
              tooltip="Valeur actuelle de votre PER si vous en avez déjà un. Ce capital capitalisera au rendement paramétré jusqu'à la retraite, réduisant d'autant le versement mensuel nécessaire." />
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                TMI à la retraite
                <InfoTooltip text="Tranche Marginale d'Imposition que vous paierez à la retraite sur vos revenus de pension. Les retraités ont souvent une TMI plus basse que pendant leur vie active (revenus réduits). C'est ce différentiel qui rend le PER avantageux : déduction à votre TMI active (30 % ou plus), imposition à la retraite à une TMI inférieure (souvent 0 ou 11 %)." />
              </label>
              <select value={retirementTMI} onChange={e => setRetirementTMI(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100">
                {[0, 11, 30, 41, 45].map(t => <option key={t} value={t}>{t} %</option>)}
              </select>
            </div>
          </Section>
        </div>

        {/* ══ PANNEAU DROIT ════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Bannière */}
          <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 md:p-5">
            {missingBirthDate || !result ? (
              <p className="text-sm opacity-80">Saisissez votre date de naissance pour lancer la simulation.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-xs font-semibold opacity-80 uppercase tracking-wide mb-1">🏖️ Pension nette mensuelle estimée</p>
                  <p className="text-3xl font-bold">{fmt(result.monthlyNet)}</p>
                  <p className="text-sm opacity-90 mt-0.5">
                    Taux de remplacement : {fmtPct(result.replacementRate)}
                    {result.replacementRate < 50 && <span className="ml-2 text-red-200">⚠ Faible</span>}
                  </p>
                </div>
                {result.deltaMonthly > 0 && (
                  <div className="text-sm opacity-80">
                    <p>Manque pour {targetMode === 'replacementRate' ? `${targetReplacementRate} %` : fmt(targetMonthlyIncome)} : {fmt(result.deltaMonthly)}/mois</p>
                    <p>→ capital PER cible : {fmtK(result.perCapital)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {result && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                  label={contractType === 'PUBLIC' ? 'CNRACL (base)' : 'Régime Général'}
                  value={fmt(result.baseScheme.annual / 12)}
                  sub={contractType === 'PUBLIC'
                    ? 'Indice maj. × 75 % au taux plein'
                    : `SAM × ${fmtPct((result.baseScheme.tauxLiquidation || 0) * 100, 1)}`} />
                <KPICard
                  label={contractType === 'PUBLIC' ? 'RAFP (complémentaire)' : 'Agirc-Arrco'}
                  value={fmt(result.complementary.annual / 12)}
                  sub={contractType === 'PUBLIC' ? `Forfait ${rafpRate} % du traitement` : `${Math.round(result.complementary.totalPoints || 0)} pts × 1,4159 €`} />
                <KPICard
                  label="Total brut mensuel"
                  value={fmt(result.totalGrossAnnual / 12)}
                  sub={`Avant PS ${contractType === 'PUBLIC' ? '9,1' : '10,1'} %`}
                  color="text-gray-800 dark:text-gray-100"
                  big />
                <KPICard
                  label="Total net mensuel"
                  value={fmt(result.monthlyNet)}
                  sub={`Remplacement ${fmtPct(result.replacementRate)}`}
                  big />
              </div>

              {/* Tableau comparaison âges de départ */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Comparaison par âge de départ
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400">Indicateur</th>
                        {result.ageComparison.map(r => (
                          <th key={r.age} className={`px-3 py-2.5 text-center font-semibold ${r.age === retirementAge ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`}>
                            {r.age} ans {r.age === retirementAge && '★'}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: 'Trimestres validés',
                          tip: `Nombre de trimestres retenus pour le calcul, limité à ${trimestresRequis} (taux plein pour votre génération). Comprend les trimestres déjà acquis, les trimestres bonifiés et les trimestres projetés jusqu'à l'âge de départ choisi.`,
                          fn: r => `${Math.round(r.trimestresFinaux)} / ${trimestresRequis}`
                        },
                        { label: 'Pension nette mensuelle', tip: 'Pension totale brute (base + complémentaire) après déduction des prélèvements sociaux (CSG + CRDS + CASA + cotisation maladie). C\'est le montant que vous percevrez réellement.', fn: r => fmt(r.monthlyNet), bold: true },
                        { label: 'Taux de remplacement', tip: 'Pension nette mensuelle / dernier salaire net mensuel estimé. Indique dans quelle proportion votre niveau de vie est maintenu à la retraite.', fn: r => fmtPct(r.replacementRate) },
                        { label: 'Capital PER nécessaire', tip: 'Capital PER à constituer pour couvrir le manque entre votre pension et votre objectif, selon la règle de retrait et la TMI retraite paramétrées.', fn: r => {
                          const tgt = targetMode === 'replacementRate' ? (career?.lastNetMonthly || 0) * targetReplacementRate / 100 : targetMonthlyIncome
                          const delta = Math.max(0, tgt - r.monthlyNet)
                          const cap = computeRequiredPERCapital(delta * 12, { retirementTMI, perWithdrawalRate })
                          return cap > 0 ? fmtK(cap) : '0 €'
                        }},
                        { label: 'Verdict', tip: '❌ Départ impossible (âge < légal). ⚠ Départ possible mais avec décote (trimestres insuffisants). ✓ Taux plein atteint. ⭐ Départ tardif avec surcote maximale.', fn: r => r.verdict },
                      ].map(({ label, tip, fn, bold }, idx) => (
                        <tr key={label} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                            {label}
                            {tip && <InfoTooltip text={tip} width="w-72" />}
                          </td>
                          {result.ageComparison.map(r => (
                            <td key={r.age} className={`px-3 py-2 text-center ${bold ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'} ${r.age === retirementAge ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                              {fn(r)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Graphique évolution */}
              {chartData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Évolution des revenus nets
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={4} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={64} />
                      <Tooltip content={<CustomTooltipChart />} />
                      <ReferenceLine x={career?.yearOfRetirement} stroke="#6366f1" strokeDasharray="4 4"
                        label={{ value: 'Retraite', fontSize: 10, fill: '#6366f1', position: 'top' }} />
                      <Area type="monotone" dataKey="salaire" name="Salaire net" fill="#6366f1" stroke="#6366f1" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="pension" name="Pension nette" fill="#7c3aed" stroke="#7c3aed" fillOpacity={0.3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Bloc PER */}
              {result.deltaMonthly > 0 && result.perCapital > 0 && (
                <div className={`rounded-xl border p-4 ${result.perContrib < 500 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'}`}>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    🎯 Pour atteindre votre objectif de {targetMode === 'replacementRate' ? `${targetReplacementRate} % de remplacement` : fmt(targetMonthlyIncome) + '/mois'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Manque mensuel net</p>
                      <p className="font-bold text-red-600 text-base">{fmt(result.deltaMonthly)}/mois</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Capital PER cible</p>
                      <p className="font-bold text-indigo-600 text-base">{fmtK(result.perCapital)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Versement mensuel</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{fmt(result.perContrib)}/mois</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Durée d'effort</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{career?.yearsRemaining} ans</p>
                      <p className="text-gray-400 mt-0.5">({perAnnualReturn} %/an · TMI sortie {retirementTMI} %)</p>
                    </div>
                  </div>
                </div>
              )}

              {result.deltaMonthly <= 0 && (
                <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 p-4">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    ✅ Votre pension estimée ({fmt(result.monthlyNet)}/mois) dépasse votre objectif de {targetMode === 'replacementRate' ? `${targetReplacementRate} %` : fmt(targetMonthlyIncome) + '/mois'}.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Notes méthodologiques */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p className="font-semibold text-gray-600 dark:text-gray-300 mb-2">Notes méthodologiques</p>
            <p>① Simulation indicative — non contractuelle. Les montants réels dépendent de votre historique de carrière complet.</p>
            <p>② Salaires non saisis : rétro-projection linéaire depuis l'année de début de carrière au taux de revalorisation saisi.</p>
            <p>③ Régime Général (privé) : SAM calculé sur les 25 meilleures années plafonnées au PASS de l'année correspondante.</p>
            <p>④ Trimestres requis : {trimestresRequis} trimestres pour la génération {yearOfBirth}. Âge légal minimum : {ageMinimal} ans.</p>
            <p>⑤ Décote : −1,25 % par trimestre manquant (max 25 %). Surcote : +1,25 % par trimestre supplémentaire.</p>
            <p>⑥ Prélèvements sociaux : CSG 8,3 % + CRDS 0,5 % + CASA 0,3 % {contractType === 'PRIVATE' ? '+ 1 % maladie sur Agirc-Arrco' : ''}.</p>
            {contractType === 'PUBLIC' && <p>⑦ CNRACL : pension calculée sur l'indice majoré des 6 derniers mois. RAFP : forfait {rafpRate} % (modèle V1 simplifié).</p>}
            <p>⑧ Salaire net estimé à {fmtPct(77, 0)} du salaire brut (approximation — pas de calcul fiscal détaillé pour la projection).</p>
            <p>⑨ Capital PER : règle des {perWithdrawalRate} % appliquée au revenu brut nécessaire après TMI retraite {retirementTMI} %.</p>
            <p className="text-gray-400 dark:text-gray-500 italic mt-2">Pour une estimation personnalisée, consultez votre relevé de carrière sur <strong>info-retraite.fr</strong>.</p>
          </div>

        </div>
      </div>
    </div>
  )
}
