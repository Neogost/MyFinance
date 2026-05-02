import { useState, useEffect } from 'react'
import {
  getPositions, createPosition, updatePosition,
  updateBalance, updateEstimatedValue, closePosition, deletePosition,
  getSnapshots, getSnapshot, getReferentiel, getPatrimoineTargets,
} from '../../api/patrimoine'
import { getDebts } from '../../api/debts'
import { getExpenseSummary } from '../../api/expenses'
import { getSalaryContracts } from '../../api/income'
import { computeSafetyNetTarget } from '../../utils/safetyNet'
import { getMyGroupMembers, getMemberPositions } from '../../api/familyGroup'
import { CATEGORY_META, PROJECTION_RATES } from './constants'
import { fmt, Amount, Tooltip } from './utils'
import PositionCard from './PositionCard'
import { BalanceEditModal, EstimatedValueModal } from './ValueEditModals'
import PositionForm from './PositionForm'
import OrderPanel from './OrderPanel'
import InstrumentPriceUpdateModal from './InstrumentPriceUpdateModal'
import ExchangeRateUpdateModal from './ExchangeRateUpdateModal'
import SnapshotPanel from './SnapshotPanel'
import PatrimoineGroupedView, { PatrimoineLegend } from './PatrimoineGroupedView'
import PatrimoineStrategyModal from './PatrimoineStrategyModal'
import CategoryStrategyBar from './CategoryStrategyBar'
import PatrimoineActionBar from './PatrimoineActionBar'
import PatrimoineFilters from './PatrimoineFilters'
import ExportCsvModal from './ExportCsvModal'
import { useAnalytics } from '../../hooks/useAnalytics'


export default function PatrimoinePage({ currentUser, familyMode, onNavigate }) {
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('patrimoine.main') }, [])
  const [positions, setPositions]             = useState([])
  const [snapshots, setSnapshots]             = useState([])
  const [formTarget, setFormTarget]           = useState(undefined)
  const [balanceTarget, setBalanceTarget]     = useState(null)
  const [estimatedTarget, setEstimatedTarget] = useState(null)
  const [ordersTarget, setOrdersTarget]       = useState(null)
  const [showPriceUpdate, setShowPriceUpdate]               = useState(false)
  const [showExchangeRateUpdate, setShowExchangeRateUpdate] = useState(false)
  const [showSnapshots, setShowSnapshots]                   = useState(false)
  const [showStrategy, setShowStrategy]                     = useState(false)
  const [showExportCsv, setShowExportCsv]                   = useState(false)
  const [targets, setTargets]                               = useState({})
  const [maxTargets, setMaxTargets]                         = useState({})
  const [breakdowns, setBreakdowns]                         = useState({})
  const [referentiel,      setReferentiel]      = useState(null)
  const [snExpensesSummary, setSnExpensesSummary] = useState(null)
  const [snActiveContract,  setSnActiveContract]  = useState(null)
  const [filter, setFilter]                   = useState('ALL')
  const [showClosed, setShowClosed]           = useState(false)
  const [viewMode, setViewMode] = useState(() => sessionStorage.getItem('patrimoine.viewMode') ?? 'grouped')

  function handleSetViewMode(mode) {
    sessionStorage.setItem('patrimoine.viewMode', mode)
    setViewMode(mode)
  }
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(null)
  const [familyMembers, setFamilyMembers]     = useState([]) // [{ id, firstName, lastName, positions }]
  const [debts, setDebts]                     = useState([])
  const [ytdSnapshotDetail, setYtdSnapshotDetail] = useState(null)

  const isAdmin = currentUser?.role === 'ADMIN'

  useEffect(() => {
    fetchPositions(); fetchSnapshots(); fetchReferentiel(); fetchTargets()
    getDebts().then(setDebts).catch(() => {})
    const mode = currentUser?.safetyNetMode
    if (mode === 'MONTHS_EXPENSES') {
      getExpenseSummary().then(setSnExpensesSummary).catch(() => {})
    } else if (mode === 'MONTHS_SALARY') {
      getSalaryContracts()
        .then(cs => setSnActiveContract(cs.find(c => c.endDate == null) ?? null))
        .catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!familyMode) { setFamilyMembers([]); return }
    async function fetchFamily() {
      try {
        const members = await getMyGroupMembers()
        const withPositions = await Promise.all(
          members.map(async m => ({ ...m, positions: await getMemberPositions(m.id) }))
        )
        setFamilyMembers(withPositions)
      } catch {
        setFamilyMembers([])
      }
    }
    fetchFamily()
  }, [familyMode])

  async function fetchPositions() {
    try {
      setLoading(true)
      setPositions(await getPositions())
    } catch {
      setError('Impossible de charger le patrimoine.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSnapshots() {
    try {
      const snaps = await getSnapshots()
      setSnapshots(snaps)
      const jan1 = `${new Date().getFullYear()}-01-01`
      const ref = snaps
        .filter(s => s.snapshotDate < jan1)
        .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0] ?? null
      if (ref?.id) setYtdSnapshotDetail(await getSnapshot(ref.id))
    } catch {
      // snapshots non critiques, on ignore l'erreur
    }
  }

  async function fetchReferentiel() {
    try {
      setReferentiel(await getReferentiel())
    } catch {
      // référentiel non critique
    }
  }

  async function fetchTargets() {
    try {
      const dto = await getPatrimoineTargets()
      applyTargetsDto(dto)
    } catch {
      // objectifs non critiques
    }
  }

  function applyTargetsDto(dto) {
    setTargets(dto?.targets ?? {})
    setMaxTargets(dto?.maxTargets ?? {})
    setBreakdowns(dto?.breakdowns ?? {})
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updatePosition(formTarget.id, payload)
      setPositions(ps => ps.map(p => p.id === updated.id ? updated : p))
      trackEvent('FEATURE_USE', 'patrimoine.position.edit', { category: payload.category })
    } else {
      const created = await createPosition(payload)
      setPositions(ps => [created, ...ps])
      trackEvent('FEATURE_USE', 'patrimoine.position.create', { category: payload.category })
    }
    setFormTarget(undefined)
  }

  async function handleUpdateBalance(position, newBalance) {
    const updated = await updateBalance(position.id, { currentBalance: newBalance })
    setPositions(ps => ps.map(p => p.id === updated.id ? updated : p))
    setBalanceTarget(null)
  }

  async function handleUpdateEstimatedValue(position, newValue) {
    const updated = await updateEstimatedValue(position.id, { estimatedCurrentValue: newValue })
    setPositions(ps => ps.map(p => p.id === updated.id ? updated : p))
    setEstimatedTarget(null)
  }

  async function handleClose(position) {
    trackEvent('FEATURE_USE', 'patrimoine.position.close', { category: position.category })
    try {
      const updated = await closePosition(position.id)
      setPositions(ps => ps.map(p => p.id === updated.id ? updated : p))
    } catch {
      setError('Impossible de fermer la position.')
    }
  }

  async function handleDelete(position) {
    try {
      await deletePosition(position.id)
      trackEvent('FEATURE_USE', 'patrimoine.position.delete', { category: position.category })
      setPositions(ps => ps.filter(p => p.id !== position.id))
    } catch {
      setError('Impossible de supprimer la position.')
    }
  }

  async function handleOrdersChanged() {
    setPositions(await getPositions())
  }

  // ── Filtres ──────────────────────────────────────────────────────

  const CATEGORY_ORDER = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']

  const allCategories  = ['ALL', ...CATEGORY_ORDER]
  const categoryLabels = { ALL: 'Tous', ...Object.fromEntries(
    Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label])
  )}
  const filtered = positions
    .filter(p => {
      if (!showClosed && p.status === 'CLOSED') return false
      if (filter !== 'ALL' && p.category !== filter) return false
      return true
    })
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))

  // ── Synthèse ─────────────────────────────────────────────────────

  const IMMO_CATEGORIES = new Set(['IMMO_PHYSIQUE', 'IMMO_PAPIER'])
  const allFamilyPositions = familyMode && familyMembers.length > 0
    ? [...positions, ...familyMembers.flatMap(m => m.positions)]
    : positions
  const active = allFamilyPositions.filter(p => p.status === 'ACTIVE')
  const allPos = allFamilyPositions

  const patrimoineBrut      = active.reduce((s, p) => s + parseFloat(p.computed?.currentValueEur  ?? 0), 0)
  const patrimoineFinancier = active
    .filter(p => !IMMO_CATEGORIES.has(p.category))
    .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
  const totalInvesti   = allPos.reduce((s, p) => s + parseFloat(p.computed?.investedAmountEur ?? 0), 0)
  const totalPlusValue = allPos.reduce((s, p) => s + parseFloat(p.computed?.capitalGainEur ?? 0), 0)
  const totalProjection = active
    .filter(p => p.computed?.monthlyIncomeProjectionEur != null)
    .reduce((s, p) => s + parseFloat(p.computed.monthlyIncomeProjectionEur), 0)

  const investiByCategory = Object.entries(
    allPos
      .filter(p => p.computed?.investedAmountEur != null && parseFloat(p.computed.investedAmountEur) !== 0)
      .reduce((acc, p) => {
        acc[p.category] = (acc[p.category] ?? 0) + parseFloat(p.computed.investedAmountEur)
        return acc
      }, {})
  ).sort(([, a], [, b]) => b - a)

  const gainsByCategory = Object.entries(
    allPos
      .filter(p => p.computed?.capitalGainEur != null && parseFloat(p.computed.capitalGainEur) !== 0)
      .reduce((acc, p) => {
        acc[p.category] = (acc[p.category] ?? 0) + parseFloat(p.computed.capitalGainEur)
        return acc
      }, {})
  ).sort(([, a], [, b]) => b - a)

  const ownActivePositions = positions.filter(p => p.status === 'ACTIVE')

  // ── Matelas de sécurité ──────────────────────────────────────
  const snLivretLiquidite = ownActivePositions
    .filter(p => p.category === 'LIVRET' || p.category === 'LIQUIDITE')
    .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)

  const snTarget = computeSafetyNetTarget(currentUser, snExpensesSummary, snActiveContract)

  const snPct      = snTarget != null ? Math.min((snLivretLiquidite / snTarget) * 100, 100) : null
  const snAchieved = snPct != null && snLivretLiquidite >= snTarget

  const categoryStats = CATEGORY_ORDER
    .map(cat => {
      const catActive  = active.filter(p => p.category === cat)
      const catAll     = allPos.filter(p => p.category === cat)
      const value      = catActive.reduce((s, p) => s + parseFloat(p.computed?.currentValueEur   ?? 0), 0)
      const gain       = catAll.reduce((s, p)    => s + parseFloat(p.computed?.capitalGainEur     ?? 0), 0)
      const invested   = catAll.reduce((s, p)    => s + parseFloat(p.computed?.investedAmountEur  ?? 0), 0)
      const gainPct    = invested !== 0 ? (gain / Math.abs(invested)) * 100 : null
      const ownValue   = ownActivePositions
        .filter(p => p.category === cat)
        .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
      return { cat, value, gain, invested, gainPct, ownValue }
    })
    .filter(({ value }) => value > 0)

  // Affiche l'indicateur matelas une seule fois, sur la première carte LIQUIDITE ou LIVRET présente
  const snIndicatorCat = categoryStats.find(s => s.cat === 'LIQUIDITE' || s.cat === 'LIVRET')?.cat ?? null

  // Map positionId → dette pour afficher la valeur nette sur les cartes IMMO_PHYSIQUE
  const debtByPositionId = debts.reduce((m, d) => d.positionId ? { ...m, [d.positionId]: d } : m, {})

  // Projection annuelle : valeur actuelle × taux moyen par catégorie
  const projectionByCategory = CATEGORY_ORDER
    .map(cat => {
      const rate  = PROJECTION_RATES[cat] ?? 0
      const value = active
        .filter(p => p.category === cat)
        .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
      return { cat, rate, value, projected: value * rate }
    })
    .filter(({ projected }) => projected > 0)

  const totalProjectionAnnuelle = projectionByCategory.reduce((s, { projected }) => s + projected, 0)

  // Prorata : jours restants dans l'année en cours
  const today       = new Date()
  const endOfYear   = new Date(today.getFullYear(), 11, 31)
  const daysInYear  = today.getFullYear() % 4 === 0 ? 366 : 365
  const daysLeft    = Math.round((endOfYear - today) / 86_400_000) + 1
  const projectionProrataYTD = totalProjectionAnnuelle * (daysLeft / daysInYear)

  const jan1CurrentYear = `${new Date().getFullYear()}-01-01`
  const ytdRefSnapshot  = snapshots
    .filter(s => s.snapshotDate < jan1CurrentYear)
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0] ?? null
  const ytdContributions = (() => {
    if (!ytdRefSnapshot || !ytdSnapshotDetail) return null
    const snapByPosId = {}
    ytdSnapshotDetail.positionSnapshots?.forEach(sp => {
      snapByPosId[sp.position.id] = parseFloat(sp.currentValueEur ?? 0)
    })
    return active
      .map(pos => ({
        id: pos.id,
        label: pos.label,
        category: pos.category,
        contribution: parseFloat(pos.computed?.currentValueEur ?? 0) - (snapByPosId[pos.id] ?? 0),
        isNew: snapByPosId[pos.id] == null,
      }))
      .filter(c => Math.abs(c.contribution) > 0.5)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
  })()

  const totalPlusValueYTD = ytdRefSnapshot != null
    ? patrimoineBrut - parseFloat(ytdRefSnapshot.totalCurrentValueEur ?? 0)
    : null

  // ── Positionnement INSEE ─────────────────────────────────────
  const inseeInfo = (() => {
    if (!referentiel || !currentUser?.birthDate) return null
    const age = Math.floor((new Date() - new Date(currentUser.birthDate)) / (365.25 * 24 * 3600 * 1000))
    const tranche = referentiel.tranches.find(t => age >= t.ageMin && age <= t.ageMax)
    if (!tranche) return null
    const seuils = [tranche.d1, tranche.d2, tranche.d3, tranche.d4, tranche.d5,
                    tranche.d6, tranche.d7, tranche.d8, tranche.d9]
    const nbMembres = familyMode && familyMembers.length > 0 ? 1 + familyMembers.length : 1
    const patrimoineComparaison = patrimoineBrut / nbMembres
    const decile = seuils.findIndex(s => patrimoineComparaison < s)
    const rang   = decile === -1 ? 10 : decile + 1
    return { tranche, rang, seuils, nbMembres, patrimoineComparaison }
  })()

  if (loading) return <p className="text-gray-500">Chargement…</p>

  return (
    <div>
      {/* ── Erreur ── */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {/* ── Bannière Mode Foyer ── */}
      {familyMode && (
        <div className="flex items-center gap-2 px-4 py-2 mb-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 font-medium">
          <span>🏠</span>
          <span>Mode Foyer — patrimoine agrégé du groupe ({familyMembers.length + 1} membres)</span>
        </div>
      )}

      {/* ── En-tête ── */}
      <PatrimoineActionBar
        isAdmin={isAdmin}
        onShowSnapshots={() => setShowSnapshots(true)}
        onShowExchangeRates={() => setShowExchangeRateUpdate(true)}
        onShowPriceUpdate={() => setShowPriceUpdate(true)}
        onShowStrategy={() => setShowStrategy(true)}
        onExportCsv={() => { trackEvent('BUTTON_CLICK', 'patrimoine.export.open_csv'); setShowExportCsv(true) }}
        onAddPosition={() => { trackEvent('BUTTON_CLICK', 'patrimoine.position.open_form'); setFormTarget(null) }}
      />

      {/* ── Synthèse globale ── */}
      {positions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center leading-tight">
              Patrimoine Brut
              <Tooltip>Somme de l'ensemble des actifs : bourse, crypto, livrets, liquidités, immobilier physique et papier.</Tooltip>
            </p>
            <p className="text-sm font-bold text-gray-900 amount"><Amount value={patrimoineBrut} /></p>
            {inseeInfo && (
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="amount">D{inseeInfo.rang}/10</span> · {inseeInfo.tranche.label}
                <Tooltip>
                  <span className="block font-semibold mb-1">Référentiel INSEE — {inseeInfo.tranche.label}</span>
                  <span className="block text-gray-400 text-xs mb-2">{referentiel.source}</span>
                  {inseeInfo.nbMembres > 1 && (
                    <span className="block text-indigo-300 text-xs mb-2">
                      Mode Foyer — moyenne par membre : {fmt(inseeInfo.patrimoineComparaison)} ({inseeInfo.nbMembres} membres)
                    </span>
                  )}
                  {inseeInfo.seuils.map((s, i) => (
                    <span key={i} className={`flex justify-between gap-3 ${inseeInfo.rang === i + 1 ? 'text-white font-semibold' : ''}`}>
                      <span>D{i + 1}</span>
                      <span className="amount">{s.toLocaleString('fr-FR')} €</span>
                    </span>
                  ))}
                </Tooltip>
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm p-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center leading-tight">
              Pat. Financier
              <Tooltip>Actifs financiers uniquement : bourse, crypto, livrets et liquidités. Hors immobilier physique et papier.</Tooltip>
            </p>
            <p className="text-sm font-bold text-gray-700 amount"><Amount value={patrimoineFinancier} /></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center leading-tight">
              Total investi
              {investiByCategory.length > 0 && (
                <Tooltip>
                  <span className="block font-semibold mb-1">Ventilation par catégorie</span>
                  {investiByCategory.map(([cat, amount]) => (
                    <span key={cat} className="flex justify-between gap-3">
                      <span>{CATEGORY_META[cat]?.label ?? cat}</span>
                      <span className="amount">{fmt(amount)}</span>
                    </span>
                  ))}
                </Tooltip>
              )}
            </p>
            <p className="text-sm font-bold text-gray-700 amount"><Amount value={totalInvesti} /></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center leading-tight">
              Plus-value
              {gainsByCategory.length > 0 && (
                <Tooltip>
                  <span className="block font-semibold mb-1">Ventilation par catégorie</span>
                  {gainsByCategory.map(([cat, gain]) => (
                    <span key={cat} className="flex justify-between gap-3">
                      <span>{CATEGORY_META[cat]?.label ?? cat}</span>
                      <span className={`amount ${gain >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{fmt(gain)}</span>
                    </span>
                  ))}
                </Tooltip>
              )}
            </p>
            <p className={`text-sm font-bold amount ${totalPlusValue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              <Amount value={totalPlusValue} />
            </p>
          </div>
          {totalPlusValueYTD != null && (
            <div className="bg-white rounded-xl shadow-sm p-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center leading-tight">
                Plus-value YTD
                <Tooltip>
                  <span className="block font-semibold mb-1">Variation depuis {ytdRefSnapshot.snapshotDate}</span>
                  <span className="block text-gray-400 text-xs mb-2">Inclut les nouveaux versements effectués en {new Date().getFullYear()}.</span>
                  {ytdContributions === null ? (
                    <span className="block text-gray-400 text-xs">Chargement…</span>
                  ) : ytdContributions.length === 0 ? (
                    <span className="block text-gray-400 text-xs">Aucune variation significative.</span>
                  ) : (
                    <>
                      {ytdContributions.slice(0, 12).map(c => (
                        <span key={c.id} className="flex justify-between gap-3 text-xs">
                          <span className="truncate max-w-[170px]">
                            {CATEGORY_META[c.category]?.icon} {c.label}{c.isNew ? ' ✦' : ''}
                          </span>
                          <span className={`amount shrink-0 ${c.contribution >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                            {c.contribution >= 0 ? '+' : ''}{fmt(c.contribution)}
                          </span>
                        </span>
                      ))}
                      {ytdContributions.length > 12 && (
                        <span className="block text-gray-400 text-xs mt-1">et {ytdContributions.length - 12} autres…</span>
                      )}
                      {ytdContributions.some(c => c.isNew) && (
                        <span className="block text-gray-400 text-xs mt-2">✦ Position ouverte cette année</span>
                      )}
                    </>
                  )}
                </Tooltip>
              </p>
              <p className={`text-sm font-bold amount ${totalPlusValueYTD >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                <Amount value={totalPlusValueYTD} prefix={totalPlusValueYTD >= 0 ? '+' : ''} />
              </p>
            </div>
          )}
          {totalProjection > 0 && (
            <div className="bg-emerald-50 rounded-xl shadow-sm p-2">
              <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1 leading-tight">Revenus / mois</p>
              <p className="text-sm font-bold text-emerald-700 amount"><Amount value={totalProjection} /></p>
            </div>
          )}
          {totalProjectionAnnuelle > 0 && (
            <div className="bg-amber-50 rounded-xl shadow-sm p-2">
              <p className="text-xs text-amber-600 uppercase tracking-wide mb-1 flex items-center leading-tight">
                Projection {today.getFullYear()}
                <Tooltip>
                  <span className="block font-semibold mb-1">Plus-value estimée ({daysLeft} j restants)</span>
                  {projectionByCategory.map(({ cat, rate, projected }) => (
                    <span key={cat} className="flex justify-between gap-3">
                      <span>{CATEGORY_META[cat]?.label ?? cat} ({(rate * 100).toFixed(1)} %)</span>
                      <span className="text-amber-300 amount">+{fmt(projected)}</span>
                    </span>
                  ))}
                  <span className="block mt-2 text-gray-400 text-xs">Taux annuels × valeur actuelle, proratisé sur {daysLeft} j. Estimation indicative.</span>
                </Tooltip>
              </p>
              <p className="text-sm font-bold text-amber-700 amount"><Amount value={projectionProrataYTD} prefix="+" /></p>
              <p className="text-xs text-amber-500 mt-0.5 amount"><Amount value={totalProjectionAnnuelle} prefix="annuel : +" /></p>
            </div>
          )}
        </div>
      )}

      {/* ── Répartition par catégorie ── */}
      {categoryStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {categoryStats.map(({ cat, value, gain, gainPct, ownValue }) => {
            const meta     = CATEGORY_META[cat]
            const showGain = gain !== 0
            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm p-3 flex flex-col">
                <p className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{meta.icon}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                </p>
                <p className="text-base font-bold text-gray-900 amount"><Amount value={value} /></p>
                {patrimoineBrut > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {((value / patrimoineBrut) * 100).toFixed(1)} % du patrimoine
                  </p>
                )}
                {showGain && (
                  <p className={`text-xs font-semibold amount mt-0.5 ${gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    <Amount value={gain} prefix={gain >= 0 ? '+' : ''} />
                    {gainPct !== null && (
                      <span className="ml-1 font-normal opacity-75">
                        ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)} %)
                      </span>
                    )}
                  </p>
                )}
                {snPct != null && cat === snIndicatorCat && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`${snAchieved ? 'text-emerald-600' : 'text-indigo-600'}`}>
                        Matelas · LIVRET + LIQUIDITE
                      </span>
                      <span className={snAchieved ? 'text-emerald-600 font-semibold' : 'text-indigo-600'}>
                        {snPct.toFixed(0)} %{snAchieved ? ' ✓' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${snAchieved ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                        style={{ width: `${snPct}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-auto">
                  <CategoryStrategyBar currentValue={ownValue} target={targets[cat] ?? null} />
                  {/* Alerte plafond dépassé — LIQUIDITE / LIVRET */}
                  {maxTargets?.[cat] && ownValue > maxTargets[cat] && (
                    <p className="mt-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      ⚠ Plafond dépassé de {(ownValue - maxTargets[cat]).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Filtres ── */}
      <PatrimoineFilters
        filter={filter}
        onFilterChange={setFilter}
        showClosed={showClosed}
        onShowClosedChange={setShowClosed}
        viewMode={viewMode}
        onViewModeChange={handleSetViewMode}
        allCategories={allCategories}
        categoryLabels={categoryLabels}
      />

      {/* ── Positions ── */}
      {viewMode === 'grouped' ? (
        <PatrimoineGroupedView
          positions={filtered}
          onEdit={setFormTarget}
          onDelete={handleDelete}
          onClose={handleClose}
          onUpdateBalance={setBalanceTarget}
          onUpdateEstimatedValue={setEstimatedTarget}
          onViewOrders={setOrdersTarget}
        />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucune position</p>
          <p className="text-sm">Cliquez sur « + Ajouter une position » pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map(position => (
            <PositionCard
              key={position.id}
              position={position}
              onEdit={setFormTarget}
              onDelete={handleDelete}
              onClose={handleClose}
              onUpdateBalance={setBalanceTarget}
              onUpdateEstimatedValue={setEstimatedTarget}
              onViewOrders={setOrdersTarget}
              linkedDebt={debtByPositionId[position.id]}
            />
          ))}
        </div>
      )}

      {/* ── Positions des autres membres (Mode Foyer) ── */}
      {familyMode && familyMembers.map(member => {
        const memberFiltered = member.positions.filter(p => showClosed || p.status !== 'CLOSED')
        return (
          <div key={member.id} className="mt-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              🏠 {member.firstName} {member.lastName}
            </p>
            <PatrimoineGroupedView positions={memberFiltered} readOnly />
          </div>
        )
      })}

      <PatrimoineLegend />

      {/* ── Modals ── */}
      {formTarget !== undefined && (
        <PositionForm
          position={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}

      {balanceTarget && (
        <BalanceEditModal
          position={balanceTarget}
          onSave={(v) => handleUpdateBalance(balanceTarget, v)}
          onCancel={() => setBalanceTarget(null)}
        />
      )}

      {estimatedTarget && (
        <EstimatedValueModal
          position={estimatedTarget}
          onSave={(v) => handleUpdateEstimatedValue(estimatedTarget, v)}
          onCancel={() => setEstimatedTarget(null)}
        />
      )}

      {ordersTarget && (
        <OrderPanel
          position={ordersTarget}
          onClose={() => setOrdersTarget(null)}
          onOrdersChanged={handleOrdersChanged}
        />
      )}

      {showPriceUpdate && (
        <InstrumentPriceUpdateModal
          onClose={() => setShowPriceUpdate(false)}
          onSaved={fetchPositions}
        />
      )}

      {showExchangeRateUpdate && (
        <ExchangeRateUpdateModal
          onClose={() => setShowExchangeRateUpdate(false)}
          onSaved={fetchPositions}
        />
      )}

      {showSnapshots && (
        <SnapshotPanel onClose={() => setShowSnapshots(false)} />
      )}

      {showStrategy && (
        <PatrimoineStrategyModal
          targets={targets}
          maxTargets={maxTargets}
          breakdowns={breakdowns}
          onClose={() => setShowStrategy(false)}
          onSave={applyTargetsDto}
        />
      )}

      {showExportCsv && (
        <ExportCsvModal
          positions={positions}
          onClose={() => setShowExportCsv(false)}
          onTrackEvent={trackEvent}
        />
      )}
    </div>
  )
}
