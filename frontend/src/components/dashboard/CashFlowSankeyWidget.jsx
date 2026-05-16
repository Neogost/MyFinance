import { useState, useEffect, createContext, useContext } from 'react'
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts'
import { getSalaryContracts, getOtherIncomes, getBonuses } from '../../api/income'
import { getExpenses } from '../../api/expenses'

const fmtEur = n =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' €'

const CATEGORY_META = {
  LOGEMENT:     { label: 'Logement',           color: '#60a5fa' },
  TRANSPORT:    { label: 'Transport',           color: '#fb923c' },
  ASSURANCES:   { label: 'Assurances',          color: '#f87171' },
  ABONNEMENTS:  { label: 'Abonnements',         color: '#a78bfa' },
  SANTE:        { label: 'Santé',               color: '#4ade80' },
  FAMILLE:      { label: 'Famille',             color: '#f472b6' },
  ALIMENTATION: { label: 'Alimentation',        color: '#facc15' },
  EPARGNE:      { label: 'Épargne programmée',  color: '#2dd4bf' },
  AUTRE:        { label: 'Autre',               color: '#9ca3af' },
}

const OTHER_INCOME_LABELS = {
  LOCATIF:      'Revenus locatifs',
  DIVIDENDE:    'Dividendes',
  AIDE_SOCIALE: 'Aides sociales',
  AUTRE:        'Autres revenus',
}

// Seuls les types récurrents mensuels comptent dans le flux de trésorerie mensuel —
// même contrat que côté backend (ExpenseSummaryDto.monthlyNetIncome). DIVIDENDE et
// AUTRE sont ponctuels (champ "Date de perception" dans le formulaire), les inclure
// au titre d'un mois donné gonfle artificiellement le flux.
const RECURRING_INCOME_TYPES = new Set(['LOCATIF', 'AIDE_SOCIALE'])

const TYPE_LABEL = {
  income:    'Revenu',
  aggregate: 'Total revenus',
  category:  'Catégorie de dépense',
  expense:   'Dépense individuelle',
  savings:   'Épargne / Reste à vivre',
}

const LEGEND_ITEMS = [
  { color: '#6366f1', label: 'Revenus' },
  { color: '#fb923c', label: 'Catégories' },
  { color: '#cbd5e1', label: 'Dépenses' },
  { color: '#10b981', label: 'Épargne' },
]

const ThemeContext = createContext({
  textPrimary:   '#374151',
  textSecondary: '#6b7280',
  tooltipBg:     '#ffffff',
  tooltipBorder: '#e5e7eb',
  tooltipText:   '#1f2937',
  tooltipSub:    '#6b7280',
  tooltipArrow:  '#d1d5db',
  expenseColor:  '#cbd5e1',
  maxLabel:      22,
  hideValues:    false,
})

// ── Data builder ───────────────────────────────────────────────

function buildSankeyData(contracts, otherIncomes, expenses, annualBonuses = []) {
  const today = new Date()
  const currentYear = today.getFullYear()

  const activeContract = contracts.find(c => !c.endDate) ?? contracts[0] ?? null
  const incomeSources = []

  if (activeContract) {
    const hasAfterTax    = activeContract.monthlyNetAfterTax != null
    const monthlyTotal   = hasAfterTax
      ? activeContract.monthlyNetAfterTax
      : (activeContract.monthlyNetImposable ?? 0)
    const monthlyBenefits = hasAfterTax ? (activeContract.monthlyBenefits ?? 0) : 0
    const monthlyTR       = activeContract.employerMonthlyMealVoucherCost ?? 0
    const totalAvantages  = monthlyBenefits + monthlyTR
    // Ratio brut→net après PAS, utilisé pour les primes brutes. On prend le ratio « après PAS »
    // pour rester cohérent avec le reste du Sankey (qui est en net après PAS).
    // Fallback à 0.72 si on n'a pas de monthlyNetAfterTax (profil fiscal incomplet).
    const netRatio        = hasAfterTax && (activeContract.monthlyGrossSalary ?? 0) > 0
      ? activeContract.monthlyNetAfterTax / activeContract.monthlyGrossSalary
      : 0.72
    const annualBonusGrossMonthly = annualBonuses
      .filter(b => b.type === 'ANNUELLE' && (b.grossAmount ?? 0) > 0)
      .reduce((s, b) => s + b.grossAmount / 12, 0)
    const mensuelleGross = activeContract.monthlyActiveMensuelleGross ?? 0
    const totalBonusNet  = (annualBonusGrossMonthly + mensuelleGross) * netRatio
    const baseSalary     = monthlyTotal - monthlyBenefits
    const compLabel      = activeContract.companyName ? ` — ${activeContract.companyName}` : ''

    if (baseSalary > 0.5)     incomeSources.push({ name: `Salaire${compLabel}`, amount: baseSalary,      type: 'income' })
    if (totalBonusNet > 0.5)  incomeSources.push({ name: 'Primes',              amount: totalBonusNet,   type: 'income' })
    if (totalAvantages > 0.5) incomeSources.push({ name: 'Avantages en nature', amount: totalAvantages,  type: 'income' })
  }

  const currentOtherIncomes = otherIncomes.filter(oi => {
    if (!RECURRING_INCOME_TYPES.has(oi.type)) return false
    if (oi.periodStart) {
      if (new Date(oi.periodStart) > today) return false
      if (oi.periodEnd && new Date(oi.periodEnd) < today) return false
      return true
    }
    // Fallback : pas de période renseignée — on considère le revenu actif s'il
    // a été saisi dans l'année courante (sécurité pour les aides ponctuelles).
    if (oi.date) return new Date(oi.date).getFullYear() === currentYear
    return false
  })
  const otherByType = {}
  for (const oi of currentOtherIncomes) {
    otherByType[oi.type] = (otherByType[oi.type] ?? 0) + (oi.amount ?? 0)
  }
  for (const [type, amount] of Object.entries(otherByType)) {
    if (amount > 0) incomeSources.push({ name: OTHER_INCOME_LABELS[type] ?? type, amount, type: 'income' })
  }

  const totalIncome = incomeSources.reduce((s, src) => s + src.amount, 0)
  if (totalIncome <= 0 || incomeSources.length === 0) return null

  const activeExpenses = expenses.filter(e => {
    if (e.endDate   && new Date(e.endDate)   < today) return false
    if (e.startDate && new Date(e.startDate) > today) return false
    return true
  })
  const byCat = {}
  for (const e of activeExpenses) {
    if (!byCat[e.category]) byCat[e.category] = []
    byCat[e.category].push({ name: e.label, amount: e.monthlyAmount ?? 0 })
  }
  const categories = Object.entries(byCat)
    .map(([key, items]) => ({
      key,
      name:   CATEGORY_META[key]?.label ?? key,
      amount: items.reduce((s, i) => s + i.amount, 0),
      items:  items.filter(i => i.amount >= 0.5),
    }))
    .filter(c => c.amount >= 0.5 && c.items.length > 0)
    .sort((a, b) => b.amount - a.amount)

  if (categories.length === 0) return null

  const totalExpenses = categories.reduce((s, c) => s + c.amount, 0)
  const savings    = totalIncome - totalExpenses
  const hasSavings = savings > 0.5
  const norm       = Math.max(totalIncome, totalExpenses)
  const expScale   = totalExpenses > 0 ? totalIncome / totalExpenses : 1
  const nIncome    = incomeSources.length
  const nCat       = categories.length
  const useAgg     = nIncome > 1
  const aggIdx     = nIncome
  const catBase    = nIncome + (useAgg ? 1 : 0)

  let expOffset = catBase + nCat
  const catExpStart = categories.map(cat => { const s = expOffset; expOffset += cat.items.length; return s })
  const nExp        = expOffset - catBase - nCat
  const savingsIdx  = catBase + nCat + nExp

  const nodes = [
    ...incomeSources.map(src => ({ name: src.name, type: 'income', amount: src.amount })),
    ...(useAgg ? [{ name: 'Total revenus', type: 'aggregate', amount: totalIncome }] : []),
    ...categories.map(cat => ({ name: cat.name, type: 'category', catKey: cat.key, amount: cat.amount })),
    ...categories.flatMap(cat => cat.items.map(item => ({ name: item.name, type: 'expense', amount: item.amount }))),
    ...(hasSavings ? [{ name: 'Épargne / Reste', type: 'savings', amount: savings }] : []),
  ]

  const links = []
  if (useAgg) {
    for (let i = 0; i < nIncome; i++) links.push({ source: i, target: aggIdx, value: incomeSources[i].amount })
    for (let j = 0; j < nCat; j++) {
      const flow = categories[j].amount * Math.min(1, expScale)
      if (flow >= 0.5) links.push({ source: aggIdx, target: catBase + j, value: flow })
    }
    if (hasSavings) links.push({ source: aggIdx, target: savingsIdx, value: savings })
  } else {
    if (hasSavings) links.push({ source: 0, target: savingsIdx, value: savings })
    for (let j = 0; j < nCat; j++) {
      const flow = incomeSources[0].amount * (categories[j].amount / norm)
      if (flow >= 0.5) links.push({ source: 0, target: catBase + j, value: flow })
    }
  }
  for (let j = 0; j < nCat; j++) {
    for (let k = 0; k < categories[j].items.length; k++) {
      const flow = categories[j].items[k].amount * Math.min(1, expScale)
      if (flow >= 0.5) links.push({ source: catBase + j, target: catExpStart[j] + k, value: flow })
    }
  }

  return { nodes, links }
}

// ── Custom renderers (module-level, theme via context) ─────────

function CustomNode({ x, y, width, height, payload }) {
  const { textPrimary, textSecondary, expenseColor, maxLabel } = useContext(ThemeContext)
  if (!payload || height < 1) return null
  const { name, type, catKey } = payload

  const color = type === 'income'    ? '#6366f1'
    : type === 'aggregate' ? '#818cf8'
    : type === 'savings'   ? '#10b981'
    : type === 'category'  ? (CATEGORY_META[catKey]?.color ?? '#fb923c')
    : expenseColor

  const isLeft   = type === 'income' || type === 'aggregate'
  const lx       = isLeft ? x - 6 : x + width + 6
  const anchor   = isLeft ? 'end' : 'start'
  const label    = (name?.length > maxLabel) ? name.slice(0, maxLabel - 1) + '…' : name
  const amtLabel = payload.amount != null ? fmtEur(payload.amount) + '/mois' : ''
  const twoLines = height >= 22 && amtLabel
  const oneLine  = !twoLines && height >= 10

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.85} rx={2} />
      {twoLines && (
        <>
          <text x={lx} y={y + height / 2 - 5} textAnchor={anchor} dominantBaseline="middle"
            fontSize={10} fontWeight={500} fill={textPrimary}>{label}</text>
          <text x={lx} y={y + height / 2 + 7} textAnchor={anchor} dominantBaseline="middle"
            fontSize={9} fill={textSecondary} className="amount">{amtLabel}</text>
        </>
      )}
      {oneLine && !amtLabel && (
        <text x={lx} y={y + height / 2} textAnchor={anchor} dominantBaseline="middle"
          fontSize={9} fill={textPrimary}>
          {label}
        </text>
      )}
      {oneLine && amtLabel && (
        <>
          <text x={lx} y={y + height / 2 - 4} textAnchor={anchor} dominantBaseline="middle"
            fontSize={9} fill={textPrimary}>{label}</text>
          <text x={lx} y={y + height / 2 + 5} textAnchor={anchor} dominantBaseline="middle"
            fontSize={8} fill={textSecondary} className="amount">{amtLabel}</text>
        </>
      )}
    </g>
  )
}

function CustomLink({ sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, payload }) {
  if (!payload?.source || linkWidth < 0.5) return null
  const { source } = payload
  const color = source.type === 'income' || source.type === 'aggregate' ? '#6366f1'
    : source.type === 'category' ? (CATEGORY_META[source.catKey]?.color ?? '#fb923c')
    : '#94a3b8'
  const d = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`
  return (
    <g>
      <path d={d} stroke="transparent" strokeWidth={Math.max(linkWidth, 12)} fill="none" />
      <path d={d} stroke={color} strokeOpacity={0.22} strokeWidth={linkWidth} fill="none" />
    </g>
  )
}

function CustomTooltip({ active, payload }) {
  const { tooltipBg, tooltipBorder, tooltipText, tooltipSub, tooltipArrow, expenseColor } = useContext(ThemeContext)
  if (!active || !payload?.length) return null
  const d   = payload[0]?.payload
  const val = payload[0]?.value
  if (!d) return null

  const isLink = 'source' in d && 'target' in d
  if (isLink) {
    const srcName  = d.source?.name ?? null
    const tgtName  = d.target?.name ?? payload[0]?.name ?? null
    const flow     = d.value ?? val
    const srcType  = d.source?.type
    const catColor = srcType === 'income' || srcType === 'aggregate' ? '#6366f1'
      : srcType === 'category' ? (CATEGORY_META[d.source?.catKey]?.color ?? '#fb923c')
      : '#94a3b8'
    return (
      <div className="shadow-lg rounded-xl px-3 py-2.5 text-xs pointer-events-none max-w-56 border"
        style={{ background: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}>
        {srcName && (
          <>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: catColor }} />
              <span className="font-medium" style={{ color: tooltipSub }}>{srcName}</span>
            </div>
            <span className="block mb-1" style={{ color: tooltipArrow }}>↓</span>
          </>
        )}
        {tgtName && <p className="font-semibold leading-tight mb-1.5">{tgtName}</p>}
        {flow != null && <p className="font-bold text-indigo-400 amount">{fmtEur(flow)}/mois</p>}
      </div>
    )
  }

  if (d.name) {
    const typeLabel = TYPE_LABEL[d.type] ?? ''
    const nodeColor = d.type === 'income'   ? '#6366f1'
      : d.type === 'savings'  ? '#10b981'
      : d.type === 'category' ? (CATEGORY_META[d.catKey]?.color ?? '#fb923c')
      : expenseColor
    const amount = d.amount ?? val
    return (
      <div className="shadow-lg rounded-xl px-3 py-2.5 text-xs pointer-events-none max-w-56 border"
        style={{ background: tooltipBg, borderColor: tooltipBorder, color: tooltipText }}>
        {typeLabel && <p className="mb-1" style={{ color: tooltipSub }}>{typeLabel}</p>}
        <div className="flex items-start gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ background: nodeColor }} />
          <p className="font-semibold leading-tight">{d.name}</p>
        </div>
        {amount != null && <p className="mt-1.5 font-bold text-indigo-400 amount">{fmtEur(amount)}/mois</p>}
      </div>
    )
  }

  return null
}

// ── Mobile list sub-components (module-level) ─────────────────

function MobileSection({ title, children }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function MobileRow({ color, label, amount }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color, opacity: 0.85 }} />
        <span className="text-sm text-gray-700 truncate">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-800 tabular-nums shrink-0 amount">{fmtEur(amount)}/mois</span>
    </div>
  )
}

function MobileDivider({ label, amount, colorClass }) {
  return (
    <div className={`flex items-center justify-between pt-2 mt-1 border-t border-gray-200 font-bold text-sm ${colorClass}`}>
      <span>{label}</span>
      <span className="tabular-nums amount">{fmtEur(amount)}/mois</span>
    </div>
  )
}

// ── Main widget ────────────────────────────────────────────────

export default function CashFlowSankeyWidget({ hideValues = false }) {
  const [sankeyData, setSankeyData] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [isDark, setIsDark]         = useState(() => document.documentElement.classList.contains('dark'))
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    async function load() {
      const contracts = await getSalaryContracts()
      const activeCt  = contracts.find(c => !c.endDate) ?? contracts[0] ?? null
      const [otherIncomes, expenses, annualBonuses] = await Promise.all([
        getOtherIncomes(),
        getExpenses(),
        activeCt?.id ? getBonuses(activeCt.id).catch(() => []) : Promise.resolve([]),
      ])
      setSankeyData(buildSankeyData(contracts, otherIncomes, expenses, annualBonuses))
    }
    load().catch(() => setError(true)).finally(() => setLoading(false))
  }, [])

  const theme = {
    textPrimary:   isDark ? '#e5e7eb' : '#374151',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    tooltipBg:     isDark ? '#1f2937' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',
    tooltipText:   isDark ? '#f3f4f6' : '#1f2937',
    tooltipSub:    isDark ? '#9ca3af' : '#6b7280',
    tooltipArrow:  isDark ? '#4b5563' : '#d1d5db',
    expenseColor:  isDark ? '#475569' : '#cbd5e1',
    maxLabel:      isMobile ? 14 : 22,
    hideValues,
  }

  if (loading) return (
    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Chargement…</div>
  )
  if (error) return (
    <div className="h-48 flex items-center justify-center text-red-400 text-sm">Données indisponibles</div>
  )
  if (!sankeyData) return (
    <div className="h-48 flex items-center justify-center text-gray-400 text-sm text-center px-4">
      Ajoutez un contrat salarial et des dépenses récurrentes pour visualiser votre flux de revenus.
    </div>
  )

  // ── Mobile: replace Sankey with a readable list layout ──────
  if (isMobile) {
    const incomes    = sankeyData.nodes.filter(n => n.type === 'income')
    const categories = sankeyData.nodes.filter(n => n.type === 'category')
    const savings    = sankeyData.nodes.find(n => n.type === 'savings')
    const totalIn    = incomes.reduce((s, n) => s + (n.amount ?? 0), 0)
    const totalOut   = categories.reduce((s, n) => s + (n.amount ?? 0), 0)

    return (
      <div>
        <MobileSection title="Revenus">
          {incomes.map(n => (
            <MobileRow key={n.name} color="#6366f1" label={n.name} amount={n.amount ?? 0} />
          ))}
          <MobileDivider label="Total revenus" amount={totalIn} colorClass="text-indigo-600" />
        </MobileSection>

        <MobileSection title="Dépenses">
          {categories.map(n => (
            <MobileRow key={n.name} color={CATEGORY_META[n.catKey]?.color ?? '#fb923c'} label={n.name} amount={n.amount ?? 0} />
          ))}
          <MobileDivider label="Total dépenses" amount={totalOut} colorClass="text-gray-700" />
        </MobileSection>

        {savings && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#10b981' }} />
              <span className="text-sm font-semibold text-emerald-700">Épargne / Reste</span>
            </div>
            <span className="text-sm font-bold text-emerald-700 tabular-nums amount">{fmtEur(savings.amount ?? 0)}/mois</span>
          </div>
        )}
      </div>
    )
  }

  // ── Desktop: Sankey chart ─────────────────────────────────────
  return (
    <ThemeContext.Provider value={theme}>
      <div className="flex flex-col h-full">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4 shrink-0">
          {LEGEND_ITEMS.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color, opacity: 0.85 }} />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto">
          <div style={{ minWidth: 540, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={sankeyData}
                node={<CustomNode />}
                link={<CustomLink />}
                nodePadding={6}
                nodeWidth={12}
                iterations={64}
                margin={{ top: 16, right: 200, bottom: 16, left: 170 }}
              >
                <Tooltip content={<CustomTooltip />} />
              </Sankey>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  )
}
