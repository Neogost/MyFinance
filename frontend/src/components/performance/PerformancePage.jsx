import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { getGlobalPerformance, getBenchmarkPerformance } from '../../api/performance'
import { getInstruments } from '../../api/patrimoine'
import { useAnalytics } from '../../hooks/useAnalytics'
import { CATEGORY_META } from '../patrimoine/constants'
import DateRangeInput from '../ui/DateRangeInput'

// ── Helpers de date ───────────────────────────────────────────────────────────

function toIso(date) { return date.toISOString().slice(0, 10) }

function periodDates(period, customFrom, customTo) {
  const today = new Date()
  switch (period) {
    case 'GLOBAL': return { from: null, to: null }
    case 'YTD':    return { from: `${today.getFullYear()}-01-01`, to: null }
    case '1Y':     return { from: toIso(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())), to: null }
    case '3Y':     return { from: toIso(new Date(today.getFullYear() - 3, today.getMonth(), today.getDate())), to: null }
    case '5Y':     return { from: toIso(new Date(today.getFullYear() - 5, today.getMonth(), today.getDate())), to: null }
    case 'CUSTOM': return { from: customFrom || null, to: customTo || null }
    default:       return { from: null, to: null }
  }
}

// ── InfoTooltip — hover ───────────────────────────────────────────────────────
function InfoTooltip({ text, width = 'w-72', position = 'bottom' }) {
  const above = position === 'top'
  return (
    <span className="relative group ml-1.5 cursor-help inline-flex items-center align-middle">
      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span className={`absolute ${above ? 'bottom-full mb-2' : 'top-full mt-2'}
        left-1/2 -translate-x-1/2 ${width}
        text-xs text-white bg-gray-800 normal-case font-normal text-left leading-relaxed
        rounded-lg px-3 py-2 shadow-lg
        opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50`}
      >
        {text}
      </span>
    </span>
  )
}

// ── Sélecteur de période ──────────────────────────────────────────────────────

const PRESETS = [
  { id: 'GLOBAL', label: 'Global' },
  { id: 'YTD',    label: 'YTD' },
  { id: '1Y',     label: '1 an' },
  { id: '3Y',     label: '3 ans' },
  { id: '5Y',     label: '5 ans' },
  { id: 'CUSTOM', label: 'Personnalisée' },
]

function PeriodSelector({ period, customFrom, customTo, onPeriodChange, onCustomChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p.id
                ? 'bg-indigo-600 text-[#fff]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'CUSTOM' && (
        <div className="pt-1 max-w-xs">
          <DateRangeInput
            from={customFrom}
            to={customTo}
            onFromChange={v => onCustomChange('from', v)}
            onToChange={v => onCustomChange('to', v)}
            placeholder="Sélectionner une période…"
            maxDate={new Date()}
          />
          <p className="text-xs text-gray-400 mt-1">Vide = aujourd'hui pour la date de fin</p>
        </div>
      )}
    </div>
  )
}

// ── Helpers de formatage ──────────────────────────────────────────────────────
function fmtPct(val) {
  if (val == null) return '—'
  return (val >= 0 ? '+' : '') + (val * 100).toFixed(2) + ' %/an'
}

function fmtEur(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

function fmtMonth(val) {
  if (val == null) return '—'
  return (val * 100).toFixed(2) + ' %'
}

// ── Helpers comparaison période précédente ────────────────────────────────

function shiftDateOneYear(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y - 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function prevPeriodDates(period, customFrom, customTo) {
  if (period === 'GLOBAL') return null
  const { from, to } = periodDates(period, customFrom, customTo)
  if (!from) return null
  return { from: shiftDateOneYear(from), to: shiftDateOneYear(to) }
}

// Construit un objet comparaison { prevStr, dStr, positive } pour un KPI donné.
// scale=100 pour les taux (→ pts de %) ; scale=1 pour les ratios purs.
// higherIsBetter=false inverse la logique de couleur (ex : volatilité).
function buildCmp(curr, prev, fmtFn, scale = 100, higherIsBetter = true) {
  if (curr == null || prev == null) return null
  const delta = (curr - prev) * scale
  const sign  = delta >= 0 ? '+' : ''
  return {
    prevStr:  fmtFn(prev),
    dStr:     `${sign}${delta.toFixed(1)} pt`,
    positive: higherIsBetter ? delta >= 0 : delta <= 0,
  }
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, tooltip, color = 'indigo', subtitle, valueColor, comparison }) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:text-indigo-300',
    teal:   'bg-teal-50 border-teal-200 text-teal-700 dark:text-teal-300',
    gray:   'bg-gray-50 border-gray-200 text-gray-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700 dark:text-amber-300',
  }
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="text-xs font-medium mb-1 uppercase tracking-wide flex items-center">
        {label}<InfoTooltip text={tooltip} />
      </div>
      <div className={`text-2xl font-bold whitespace-nowrap ${valueColor ?? ''}`}>{value}</div>
      {subtitle && <div className="text-xs mt-1 opacity-70">{subtitle}</div>}
      {comparison && (
        <div className="mt-1.5 pt-1.5 border-t border-current/20 text-xs flex flex-wrap items-center gap-1">
          <span className="opacity-50">vs {comparison.prevStr}</span>
          <span className={`font-semibold ${comparison.positive ? 'text-emerald-600' : 'text-red-500'}`}>
            {comparison.dStr}
          </span>
        </div>
      )}
    </div>
  )
}

function fmtVolatility(val) {
  if (val == null) return '—'
  return (val * 100).toFixed(1) + ' %/an'
}

function fmtDrawdown(val) {
  if (val == null) return '—'
  // val est ≤ 0 (perte) — on garde le signe pour insister
  return (val * 100).toFixed(1) + ' %'
}

function drawdownColor(val) {
  if (val == null || val === 0) return ''
  if (val > -0.05) return 'text-emerald-700'   // < 5 %
  if (val > -0.15) return 'text-amber-600'     // 5–15 %
  if (val > -0.30) return 'text-orange-600'    // 15–30 %
  return 'text-red-600'                         // > 30 %
}

function drawdownSubtitle(val) {
  if (val == null) return 'Non calculable'
  if (val === 0)   return 'Aucune perte traversée'
  if (val > -0.05) return 'Très contenue'
  if (val > -0.15) return 'Modérée'
  if (val > -0.30) return 'Importante'
  return 'Sévère'
}

function fmtSharpe(val) {
  if (val == null) return '—'
  return val.toFixed(2)
}

function sharpeColor(val) {
  if (val == null) return ''
  if (val < 0)   return 'text-red-600'
  if (val < 0.5) return 'text-amber-600'
  if (val < 1)   return ''          // neutre — hérite de la carte gray
  return 'text-emerald-700'
}

function sharpeSubtitle(val) {
  if (val == null) return 'Non calculable'
  if (val < 0)   return 'Rendement sous le taux sans risque'
  if (val < 0.5) return 'En dessous de la moyenne'
  if (val < 1)   return 'Correct'
  return 'Excellent (> 1)'
}

// ── Graphique TWR cumulé base 100 ────────────────────────────────────────

function buildTwr100Series(monthlyBreakdown, fromDate) {
  if (!monthlyBreakdown?.length) return []
  const openingMonth = fromDate
    ? (() => {
        const [y, m] = fromDate.split('-').map(Number)
        const prev = new Date(y, m - 2, 1)
        return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
      })()
    : null
  const series = openingMonth ? [{ month: openingMonth, portfolio: 100 }] : []
  let current = 100
  for (const row of monthlyBreakdown) {
    if (row.included && row.monthlyReturn != null) current *= (1 + row.monthlyReturn)
    series.push({ month: row.month, portfolio: parseFloat(current.toFixed(3)) })
  }
  return series
}

function mergeBenchmark(portfolioSeries, benchmarkSeries) {
  if (!benchmarkSeries?.length) return portfolioSeries
  const bMap = Object.fromEntries(benchmarkSeries.map(p => [p.month, p.value]))
  return portfolioSeries.map(p => ({ ...p, benchmark: bMap[p.month] ?? null }))
}

function buildFixedRateSeries(portfolioSeries, annualRatePct) {
  const r = parseFloat(annualRatePct)
  if (isNaN(r) || r < -99 || r > 1000) return null
  const monthlyRate = Math.pow(1 + r / 100, 1 / 12) - 1
  let value = 100
  return portfolioSeries.map((p, i) => {
    if (i > 0) value *= (1 + monthlyRate)
    return { month: p.month, value: parseFloat(value.toFixed(3)) }
  })
}

// ── Série underwater (drawdown depth dans le temps) ───────────────────────

function buildUnderwaterSeries(monthlyBreakdown) {
  if (!monthlyBreakdown?.length) return []
  let value = 100
  let peak  = 100
  return monthlyBreakdown.map(row => {
    if (row.included && row.monthlyReturn != null) {
      value *= (1 + row.monthlyReturn)
      if (value > peak) peak = value
    }
    const depth = parseFloat(((value - peak) / peak * 100).toFixed(3))
    return { month: row.month, depth }
  })
}

function UnderwaterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { month, depth } = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{month}</p>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full shrink-0 bg-red-400" />
        <span className="text-gray-500">Drawdown :</span>
        <span className="font-semibold text-red-600">{depth.toFixed(2)} %</span>
      </div>
    </div>
  )
}

function TwrTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const month = payload[0]?.payload?.month
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-1.5">{month}</p>
      {payload.map(p => {
        if (p.value == null) return null
        const gain = p.value - 100
        const color = gain >= 0 ? 'text-emerald-700' : 'text-red-600'
        const isPortfolio = p.dataKey === 'portfolio'
        return (
          <div key={p.dataKey} className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.stroke ?? p.fill }} />
            <span className="text-gray-500">{isPortfolio ? 'Portefeuille' : 'Benchmark'} :</span>
            <span className={`font-semibold ${color}`}>
              {gain >= 0 ? '+' : ''}{gain.toFixed(2)} %
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Sélecteur de benchmark ────────────────────────────────────────────────

function InstrumentPicker({ selectedId, selectedLabel, onSelect, onClear }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setLoading(true)
    getInstruments({ query })
      .then(data => setResults(data?.slice(0, 10) ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [query])

  const pick = (inst) => {
    onSelect(inst.id, inst.name + (inst.ticker ? ` (${inst.ticker})` : ''))
    setQuery(''); setResults([]); setOpen(false)
  }

  if (selectedId) {
    return (
      <div className="flex items-center gap-2 text-xs bg-gray-100 rounded-lg px-3 py-1.5">
        <span className="font-medium text-gray-700 truncate max-w-[180px]">{selectedLabel}</span>
        <button onClick={onClear} className="text-gray-400 hover:text-red-500 shrink-0">✕</button>
      </div>
    )
  }
  return (
    <div className="relative">
      <input
        type="text" placeholder="Rechercher un indice…" value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
      />
      {loading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">…</span>}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map(inst => (
            <button key={inst.id} onClick={() => pick(inst)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center gap-2">
              <span className="font-medium text-gray-800 truncate">{inst.name}</span>
              {inst.ticker && <span className="text-gray-400 shrink-0">{inst.ticker}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BenchmarkSelector({
  mode, onModeChange,
  selectedId, selectedLabel, onSelect, onClear,
  fixedRateInput, onFixedRateChange,
}) {
  const tabCls = (m) => `px-2.5 py-1 text-xs rounded-md transition font-medium ${
    mode === m ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
  }`
  return (
    <div className="flex flex-col gap-2 items-end">
      {/* Onglets mode */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
        <button className={tabCls('instrument')} onClick={() => onModeChange('instrument')}>
          📈 Indice
        </button>
        <button className={tabCls('rate')} onClick={() => onModeChange('rate')}>
          % Taux fixe
        </button>
      </div>
      {/* Contenu selon le mode */}
      {mode === 'instrument' ? (
        <InstrumentPicker
          selectedId={selectedId} selectedLabel={selectedLabel}
          onSelect={onSelect} onClear={onClear}
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="number" min="-99" max="100" step="0.1"
            value={fixedRateInput}
            onChange={e => onFixedRateChange(e.target.value)}
            placeholder="7,0"
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 w-20 text-right focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
          />
          <span className="text-xs text-gray-500 font-medium">%/an</span>
          {fixedRateInput && (
            <button onClick={() => onFixedRateChange('')} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Graphique complet ─────────────────────────────────────────────────────

function TwrCumulativeChart({ monthlyBreakdown, from, period, customFrom, customTo }) {
  const [benchmarkMode,  setBenchmarkMode]  = useState('instrument')
  // -- mode instrument --
  const [benchmarkId,    setBenchmarkId]    = useState(null)
  const [benchmarkLabel, setBenchmarkLabel] = useState(null)
  const [instSeries,     setInstSeries]     = useState(null)
  const [instTwr,        setInstTwr]        = useState(null)
  const [benchmarkLoading, setBenchmarkLoading] = useState(false)
  // -- mode taux fixe --
  const [fixedRateInput, setFixedRateInput] = useState('')

  const portfolioSeries = useMemo(
    () => buildTwr100Series(monthlyBreakdown, from),
    [monthlyBreakdown, from]
  )

  // Série de référence : instrument ou taux fixe
  const benchmarkSeries = useMemo(() => {
    if (benchmarkMode === 'rate') return buildFixedRateSeries(portfolioSeries, fixedRateInput)
    return instSeries
  }, [benchmarkMode, fixedRateInput, instSeries, portfolioSeries])

  const benchmarkTwr = useMemo(() => {
    if (benchmarkMode === 'rate') {
      const r = parseFloat(fixedRateInput)
      return isNaN(r) ? null : r / 100
    }
    return instTwr
  }, [benchmarkMode, fixedRateInput, instTwr])

  const benchmarkDisplayLabel = useMemo(() => {
    if (benchmarkMode === 'rate') {
      const r = parseFloat(fixedRateInput)
      return isNaN(r) || fixedRateInput === '' ? null : `Taux fixe +${r.toFixed(1)} %/an`
    }
    return benchmarkLabel
  }, [benchmarkMode, fixedRateInput, benchmarkLabel])

  const chartData = useMemo(
    () => mergeBenchmark(portfolioSeries, benchmarkSeries),
    [portfolioSeries, benchmarkSeries]
  )

  // Charger le benchmark instrument quand la période change
  useEffect(() => {
    if (benchmarkMode !== 'instrument' || !benchmarkId) return
    setBenchmarkLoading(true)
    const { from: f, to: t } = period === 'CUSTOM'
      ? { from: customFrom || null, to: customTo || null }
      : { from, to: null }
    getBenchmarkPerformance(benchmarkId, f, t)
      .then(dto => { setInstSeries(dto.series); setInstTwr(dto.twrAnnualized) })
      .catch(() => { setInstSeries(null); setInstTwr(null) })
      .finally(() => setBenchmarkLoading(false))
  }, [benchmarkId, benchmarkMode, from, period, customFrom, customTo])

  const handleModeChange = (m) => {
    setBenchmarkMode(m)
    // Réinitialiser l'autre mode lors du switch
    if (m === 'rate')       { setBenchmarkId(null); setBenchmarkLabel(null); setInstSeries(null); setInstTwr(null) }
    if (m === 'instrument') { setFixedRateInput('') }
  }
  const handleSelectBenchmark = (id, label) => {
    setBenchmarkId(id); setBenchmarkLabel(label); setInstSeries(null); setInstTwr(null)
  }
  const handleClearBenchmark = () => {
    setBenchmarkId(null); setBenchmarkLabel(null); setInstSeries(null); setInstTwr(null)
  }

  const hasData = portfolioSeries.some(p => p.portfolio !== 100)
  if (!hasData) return null

  const n = portfolioSeries.length
  const tickInterval = n > 36 ? 11 : n > 18 ? 5 : 2
  const ticks = portfolioSeries
    .map((p, i) => ({ ...p, i }))
    .filter(({ month, i }) => {
      if (i === 0 || i === n - 1) return true
      if (tickInterval >= 11) return month.endsWith('-01')
      return i % tickInterval === 0
    })
    .map(p => p.month)

  const allVals = chartData.flatMap(p => [p.portfolio, p.benchmark].filter(Boolean))
  const minVal = Math.min(...allVals)
  const maxVal = Math.max(...allVals)
  const yDomain = [Math.floor(minVal * 0.98), Math.ceil(maxVal * 1.02)]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-700">
            Performance cumulée (base 100)
            <InfoTooltip
              text="Courbe de la valeur d'1 € investi au début de la période, chaque mois multiplié par le rendement Modified Dietz (TWR). Un indice de 127 signifie que 100 € investis valent 127 €. L'indice benchmark utilise le prix de l'instrument sans cashflows — comparaison standard CFA."
              width="w-96"
            />
          </h2>
          {/* KPI benchmark inline si disponible */}
          {benchmarkTwr != null && benchmarkDisplayLabel && (
            <span className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-amber-700">
              {benchmarkMode === 'rate'
                ? <span className="font-semibold">{benchmarkDisplayLabel}</span>
                : <>{benchmarkDisplayLabel} : <span className="font-semibold">{fmtPct(benchmarkTwr)}</span></>
              }
            </span>
          )}
          {benchmarkLoading && (
            <span className="text-xs text-gray-400">Chargement…</span>
          )}
        </div>
        <BenchmarkSelector
          mode={benchmarkMode}
          onModeChange={handleModeChange}
          selectedId={benchmarkId}
          selectedLabel={benchmarkLabel}
          onSelect={handleSelectBenchmark}
          onClear={handleClearBenchmark}
          fixedRateInput={fixedRateInput}
          onFixedRateChange={setFixedRateInput}
        />
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="twr-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" ticks={ticks}
            tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis domain={yDomain}
            tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
            width={36} tickFormatter={v => v.toFixed(0)} />
          <ReferenceLine y={100} stroke="#d1d5db" strokeDasharray="4 4" />
          <Tooltip content={<TwrTooltip />} />
          {/* Courbe portefeuille */}
          <Area type="monotone" dataKey="portfolio" name="Portefeuille"
            stroke="#4f46e5" strokeWidth={2} fill="url(#twr-gradient)"
            dot={false} activeDot={{ r: 4, fill: '#4f46e5' }} connectNulls />
          {/* Courbe benchmark (si sélectionné) */}
          {benchmarkSeries && (
            <Line type="monotone" dataKey="benchmark" name={benchmarkDisplayLabel}
              stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3"
              dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} connectNulls />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-400 mt-1">Base 100 au {portfolioSeries[0]?.month}</p>
    </div>
  )
}

// ── Graphique underwater (drawdown dans le temps) ────────────────────────

function UnderwaterChart({ monthlyBreakdown }) {
  const series = useMemo(() => buildUnderwaterSeries(monthlyBreakdown), [monthlyBreakdown])
  const hasDrawdown = series.some(p => p.depth < -1)
  if (!hasDrawdown) return null

  const n = series.length
  const tickInterval = n > 36 ? 11 : n > 18 ? 5 : 2
  const ticks = series
    .map((p, i) => ({ ...p, i }))
    .filter(({ month, i }) => {
      if (i === 0 || i === n - 1) return true
      if (tickInterval >= 11) return month.endsWith('-01')
      return i % tickInterval === 0
    })
    .map(p => p.month)

  const minDepth = Math.min(...series.map(p => p.depth))
  const yDomain = [Math.floor(minDepth * 1.05) - 1, 0.5]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        Profil de drawdown
        <InfoTooltip
          text="À chaque mois, la profondeur = (valeur actuelle − pic historique) / pic × 100. Quand la courbe est à 0 %, le portefeuille est à son plus-haut. La largeur et la profondeur de la zone rouge indiquent la sévérité et la durée des pertes traversées."
          width="w-80"
        />
      </h2>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="underwater-gradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" ticks={ticks}
            tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis domain={yDomain}
            tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
            width={40} tickFormatter={v => `${v.toFixed(0)} %`} />
          <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 4" />
          <Tooltip content={<UnderwaterTooltip />} />
          <Area type="monotone" dataKey="depth"
            stroke="#ef4444" strokeWidth={1.5}
            fill="url(#underwater-gradient)"
            dot={false} activeDot={{ r: 3, fill: '#ef4444' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Section pédagogique ──────────────────────────────────────────────────

// Données de l'exemple pédagogique (constantes, hors rendu)
const PEDAGOGY_YEARS = [
  { label: 'An 1', return: +0.20, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', barColor: 'bg-emerald-400' },
  { label: 'An 2', return: -0.10, color: 'text-red-600',     bg: 'bg-red-50 border-red-200',         barColor: 'bg-red-400' },
  { label: 'An 3', return: +0.15, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', barColor: 'bg-emerald-400' },
]
// TWR = (1.20 × 0.90 × 1.15) − 1 = 24.2 %  →  annualisé ≈ 7.5 %/an
// Alice : 10 000 début + 10 000 fin An 1 → 22 770 en fin An 3   (MWR ≈ 4.5 %/an)
// Bob   : 10 000 début + 10 000 fin An 2 → 23 920 en fin An 3   (MWR ≈ 8.7 %/an)

function YearBadge({ year }) {
  const sign = year.return >= 0 ? '+' : ''
  return (
    <div className={`border rounded-lg px-3 py-2 text-center text-xs ${year.bg}`}>
      <div className="font-semibold text-gray-600 mb-0.5">{year.label}</div>
      <div className={`text-lg font-bold ${year.color}`}>{sign}{(year.return * 100).toFixed(0)} %</div>
    </div>
  )
}

function InvestorTimeline({ name, emoji, events, invested, final, mwr, highlight }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <span className="font-semibold text-gray-800 text-sm">{name}</span>
      </div>
      <div className="space-y-1.5 text-xs mb-3">
        {events.map((e, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`shrink-0 font-mono font-semibold w-12 ${e.amount > 0 ? 'text-indigo-600' : e.amount < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {e.moment}
            </span>
            <span className="text-gray-600">{e.label}</span>
            {e.amount !== 0 && (
              <span className={`ml-auto font-semibold shrink-0 ${e.amount > 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                {e.amount > 0 ? '+' : ''}{e.amount.toLocaleString('fr-FR')} €
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 pt-2 text-xs space-y-1">
        <div className="flex justify-between text-gray-500">
          <span>Total versé :</span>
          <span className="font-semibold text-gray-700">{invested.toLocaleString('fr-FR')} €</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Valeur finale :</span>
          <span className="font-semibold text-emerald-700">{final.toLocaleString('fr-FR')} €</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-gray-600">MWR (son rendement vécu) :</span>
          <span className={highlight ? 'text-indigo-700' : 'text-teal-700'}>{mwr}</span>
        </div>
      </div>
    </div>
  )
}

function PedagogySection() {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <span className="text-lg">📚</span>
        <span className="font-semibold text-gray-700 text-sm flex-1">
          TWR et MWR expliqués simplement — avec un exemple sur 3 ans
        </span>
        <span className="text-xs text-gray-400">{open ? '▲ réduire' : '▼ développer'}</span>
      </button>

      {open && (
        <div className="px-5 pb-6 pt-2 space-y-6 bg-white text-sm">

          {/* L'exemple de marché commun */}
          <div>
            <p className="text-gray-600 mb-3">
              Imaginons un fonds (CW8, S&P 500, peu importe) qui fait exactement ça sur 3 ans :
            </p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {PEDAGOGY_YEARS.map(y => <YearBadge key={y.label} year={y} />)}
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2.5 text-xs text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                <strong>TWR total</strong> = 1,20 × 0,90 × 1,15 − 1 = <span className="text-emerald-700 font-bold">+24,2 %</span> sur 3 ans
              </span>
              <span>
                <strong>TWR annualisé</strong> = <span className="text-indigo-700 font-bold">+7,5 %/an</span>
              </span>
              <span className="text-gray-400 italic">Ce chiffre est le même pour tout le monde, quoi qu'il arrive.</span>
            </div>
          </div>

          {/* Deux investisseurs */}
          <div>
            <p className="font-semibold text-gray-700 mb-1">Deux investisseurs, même fonds, résultats différents.</p>
            <p className="text-gray-500 text-xs mb-3">
              Alice et Bob investissent tous les deux <strong>20 000 € au total</strong> dans ce même fonds.
              Mais pas au même moment.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InvestorTimeline
                name="Alice — investit avant la baisse"
                emoji="😬"
                events={[
                  { moment: 'Début',    label: 'Verse au départ',           amount: 10000 },
                  { moment: 'Fin An 1', label: '→ 12 000 € (+20 %)',        amount: 0 },
                  { moment: 'Fin An 1', label: 'Verse encore (timing raté !)', amount: 10000 },
                  { moment: 'Fin An 2', label: '→ 19 800 € (−10 %)',        amount: 0 },
                  { moment: 'Fin An 3', label: '→ 22 770 € (+15 %)',        amount: 0 },
                ]}
                invested={20000}
                final={22770}
                mwr="+4,5 %/an"
                highlight={false}
              />
              <InvestorTimeline
                name="Bob — investit après la baisse"
                emoji="😎"
                events={[
                  { moment: 'Début',    label: 'Verse au départ',           amount: 10000 },
                  { moment: 'Fin An 1', label: '→ 12 000 € (+20 %)',        amount: 0 },
                  { moment: 'Fin An 2', label: '→ 10 800 € (−10 %)',        amount: 0 },
                  { moment: 'Fin An 2', label: 'Verse encore (bon timing !)',amount: 10000 },
                  { moment: 'Fin An 3', label: '→ 23 920 € (+15 %)',        amount: 0 },
                ]}
                invested={20000}
                final={23920}
                mwr="+8,7 %/an"
                highlight={true}
              />
            </div>
          </div>

          {/* Conclusion */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-indigo-800">Ce qu'il faut retenir</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold text-indigo-700 mb-1">TWR = la performance du fonds</p>
                <p className="text-gray-600 leading-relaxed">
                  Alice et Bob ont le <strong>même TWR : +7,5 %/an</strong>. C'est la performance
                  du fonds lui-même, indépendamment de qui a investi quand. C'est ce qu'on compare à un indice (CW8, S&P 500…).
                </p>
              </div>
              <div>
                <p className="font-semibold text-teal-700 mb-1">MWR = ta performance vécue</p>
                <p className="text-gray-600 leading-relaxed">
                  Alice a vécu <strong>+4,5 %/an</strong>, Bob <strong>+8,7 %/an</strong>.
                  La différence vient uniquement du <em>timing de leurs versements</em>.
                  Si tu investis beaucoup avant une baisse, ton MWR sera inférieur au TWR — et inversement.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 border-t border-indigo-200 pt-2">
              💡 <strong>MWR &lt; TWR</strong> → tu as eu tendance à verser avant les baisses.
              <span className="mx-2">·</span>
              <strong>MWR &gt; TWR</strong> → ton timing de versement a été favorable.
              <span className="mx-2">·</span>
              <strong>MWR ≈ TWR</strong> → tu investis régulièrement (DCA) ou n'a fait qu'un seul versement.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Décomposition du rendement ───────────────────────────────────────────

function ReturnDecomposition({ absoluteGainEur, totalDividendsEur, totalInvestedEur }) {
  if (absoluteGainEur == null || totalDividendsEur == null || totalInvestedEur == null) return null
  if (totalInvestedEur === 0) return null

  const capitalGain  = absoluteGainEur - totalDividendsEur
  const incomeGain   = totalDividendsEur
  const totalGain    = absoluteGainEur

  // Pourcentages par rapport au capital investi
  const capitalPct   = (capitalGain  / totalInvestedEur * 100)
  const incomePct    = (incomeGain   / totalInvestedEur * 100)

  // Largeurs de la barre empilée (proportions du gain total — uniquement si gain > 0)
  const showBar      = totalGain > 0 && incomeGain >= 0
  const capitalBarW  = showBar ? Math.max(0, capitalGain) / totalGain * 100 : 0
  const incomeBarW   = showBar ? Math.max(0, incomeGain)  / totalGain * 100 : 0

  const fmtSigned = (v) => {
    if (v == null) return '—'
    const s = fmtEur(Math.abs(v))
    return v >= 0 ? `+${s}` : `−${s}`
  }
  const fmtPctSigned = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} %`

  return (
    <div className="pt-1 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Décomposition du gain
          <InfoTooltip
            text="Le gain total se décompose en deux sources : la plus-value de marché (appréciation du cours des actifs) et les revenus perçus (dividendes, intérêts, airdrops). Les revenus sont déjà inclus dans la valeur actuelle (réinvestissement virtuel)."
            width="w-96"
          />
        </span>
        <span className={`text-xs font-semibold ${totalGain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          Total {fmtSigned(totalGain)}
        </span>
      </div>

      {/* Barre empilée */}
      {showBar && (
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 mb-3">
          <div className="bg-indigo-500 transition-all" style={{ width: `${capitalBarW}%` }} />
          <div className="bg-teal-500 transition-all"   style={{ width: `${incomeBarW}%`  }} />
        </div>
      )}

      {/* Deux lignes de décomposition */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-start gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-gray-500 mb-0.5">Plus-value de marché</div>
            <div className={`font-semibold ${capitalGain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {fmtSigned(capitalGain)}
            </div>
            <div className="text-gray-400">{fmtPctSigned(capitalPct)} du versé</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-gray-500 mb-0.5">Revenus perçus</div>
            <div className="font-semibold text-teal-700">
              {fmtSigned(incomeGain)}
            </div>
            <div className="text-gray-400">{fmtPctSigned(incomePct)} du versé</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section par catégorie ─────────────────────────────────────────────────

const CARD_COLORS = {
  BOURSE:     'bg-indigo-50 border-indigo-200 text-indigo-700 dark:text-indigo-300',
  CRYPTO:     'bg-violet-50 border-violet-200 text-violet-700 dark:text-violet-300',
  LIVRET:     'bg-teal-50 border-teal-200 text-teal-700 dark:text-teal-300',
  IMMO_PAPIER:'bg-amber-50 border-amber-200 text-amber-700 dark:text-amber-300',
}

function CategoryCard({ cat }) {
  const meta     = CATEGORY_META[cat.category] ?? { label: cat.category, icon: '📊' }
  const colors   = CARD_COLORS[cat.category] ?? 'bg-gray-50 border-gray-200 text-gray-700'
  const gainColor = cat.absoluteGainEur >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'

  return (
    <div className={`border rounded-xl p-4 ${colors}`}>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">{meta.icon}</span>
        <span className="text-sm font-semibold">{meta.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <div className="opacity-60 mb-0.5">TWR annualisé</div>
          <div className="font-bold text-base">{fmtPct(cat.twrAnnualized)}</div>
        </div>
        <div>
          <div className="opacity-60 mb-0.5">MWR annualisé</div>
          <div className="font-bold text-base">{fmtPct(cat.mwrAnnualized)}</div>
        </div>
        <div>
          <div className="opacity-60 mb-0.5">Valeur actuelle</div>
          <div className="font-medium">{fmtEur(cat.currentValueEur)}</div>
        </div>
        <div>
          <div className="opacity-60 mb-0.5">Plus-value</div>
          <div className={`font-medium ${gainColor}`}>{fmtEur(cat.absoluteGainEur)}</div>
        </div>
      </div>
    </div>
  )
}

// ── Section par position — style PatrimoineGroupedView ───────────────────

const CATEGORY_ORDER = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']

function PerfPositionRow({ pos }) {
  const gainColor = (pos.absoluteGainEur ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
      <td className="py-2 pl-6 pr-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm font-medium text-gray-900 truncate" title={pos.label}>{pos.label}</span>
          {pos.currency && pos.currency !== 'EUR' && (
            <span className="text-xs text-gray-400 shrink-0">{pos.currency}</span>
          )}
        </div>
      </td>
      <td className="py-2 px-2 text-right font-semibold text-sm tabular-nums text-indigo-700">
        {fmtPct(pos.twrAnnualized)}
      </td>
      <td className="py-2 px-2 text-right text-sm tabular-nums text-teal-700">
        {fmtPct(pos.mwrAnnualized)}
      </td>
      <td className="py-2 px-2 text-right text-sm font-bold text-gray-900 tabular-nums">
        {fmtEur(pos.currentValueEur)}
      </td>
      <td className={`py-2 px-2 pr-4 text-right text-sm font-semibold tabular-nums ${gainColor}`}>
        {fmtEur(pos.absoluteGainEur)}
      </td>
    </tr>
  )
}

function ByPositionSection({ byPosition }) {
  const grandTotal = byPosition.reduce((s, p) => s + (p.currentValueEur ?? 0), 0)

  // Grouper par partenaire puis par catégorie
  const grouped = {}
  byPosition.forEach(pos => {
    const partner = pos.partner || 'Sans partenaire'
    if (!grouped[partner]) grouped[partner] = {}
    if (!grouped[partner][pos.category]) grouped[partner][pos.category] = []
    grouped[partner][pos.category].push(pos)
  })

  // Tri partenaires par valeur décroissante (Sans partenaire en dernier)
  const partners = Object.entries(grouped).sort(([ka, a], [kb, b]) => {
    if (ka === 'Sans partenaire') return 1
    if (kb === 'Sans partenaire') return -1
    const va = Object.values(a).flat().reduce((s, p) => s + (p.currentValueEur ?? 0), 0)
    const vb = Object.values(b).flat().reduce((s, p) => s + (p.currentValueEur ?? 0), 0)
    return vb - va
  })

  const [collapsed, setCollapsed] = useState(new Set())
  const toggle = (p) => setCollapsed(prev => {
    const next = new Set(prev); next.has(p) ? next.delete(p) : next.add(p); return next
  })

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-700 -mb-2">
        Par position
        <InfoTooltip
          text="Performance TWR et MWR calculée indépendamment pour chaque position, regroupée par partenaire. Utile pour identifier vos meilleures et moins bonnes allocations."
          width="w-96"
        />
      </h2>

      {partners.map(([partner, byCategory]) => {
        const allPs       = Object.values(byCategory).flat()
        const total       = allPs.reduce((s, p) => s + (p.currentValueEur   ?? 0), 0)
        const totalGain   = allPs.reduce((s, p) => s + (p.absoluteGainEur   ?? 0), 0)
        const pct         = grandTotal > 0 ? (total / grandTotal) * 100 : 0
        const isCollapsed = collapsed.has(partner)
        const cats        = CATEGORY_ORDER.filter(cat => byCategory[cat])

        return (
          <div key={partner} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            {/* En-tête partenaire — identique à PatrimoineGroupedView */}
            <button
              onClick={() => toggle(partner)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor"
                className={`text-gray-400 shrink-0 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}
                viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
              <span className="font-semibold text-gray-900 text-sm flex-1">{partner}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-9 text-right whitespace-nowrap">{pct.toFixed(1)} %</span>
              </div>
              <span className="text-sm font-bold text-gray-700 w-28 text-right tabular-nums">{fmtEur(total)}</span>
            </button>

            {/* Tableau dépliable */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed min-w-[560px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs text-gray-400 font-normal py-1.5 pl-6 pr-2 w-[38%]">Position</th>
                      <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2 w-[14%]">TWR</th>
                      <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2 w-[14%]">MWR</th>
                      <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2 w-[17%]">Valeur actuelle</th>
                      <th className="text-right text-xs text-gray-400 font-normal py-1.5 px-2 pr-4 w-[17%]">Plus-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map(cat => {
                      const meta   = CATEGORY_META[cat] ?? { label: cat, icon: '📊' }
                      const ps     = byCategory[cat]
                      const catVal = ps.reduce((s, p) => s + (p.currentValueEur ?? 0), 0)
                      const catPct = grandTotal > 0 ? (catVal / grandTotal) * 100 : 0
                      return (
                        <>
                          {/* Sous-en-tête catégorie */}
                          <tr key={`${cat}-header`} className="bg-gray-50/70 border-y border-gray-100">
                            <td colSpan={5} className="py-1.5 pl-6 pr-4">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  <span>{meta.icon}</span>
                                  <span>{meta.label}</span>
                                  <span className="font-normal text-gray-400 normal-case tracking-normal">
                                    — {ps.length} position{ps.length > 1 ? 's' : ''}
                                  </span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{catPct.toFixed(1)} % du total</span>
                                  <span className="text-xs font-semibold text-gray-600 tabular-nums">{fmtEur(catVal)}</span>
                                </span>
                              </div>
                            </td>
                          </tr>
                          {ps.map(pos => <PerfPositionRow key={pos.positionId} pos={pos} />)}
                        </>
                      )
                    })}

                    {/* Sous-total partenaire */}
                    <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                      <td colSpan={2} className="py-2 pl-6 pr-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total {partner}</span>
                      </td>
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2 text-right">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtEur(total)}</span>
                      </td>
                      <td className={`py-2 px-2 pr-4 text-right text-sm font-bold tabular-nums ${totalGain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {fmtEur(totalGain)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tableau breakdown mensuel ─────────────────────────────────────────────────
function MonthlyBreakdownTable({ breakdown }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="text-left py-2 px-3 border-b">Mois</th>
            <th className="text-right py-2 px-3 border-b">
              V_début
              <InfoTooltip text="Valeur du portefeuille au dernier jour du mois précédent." width="w-56" />
            </th>
            <th className="text-right py-2 px-3 border-b">
              V_fin
              <InfoTooltip text="Valeur du portefeuille au dernier jour du mois (ou aujourd'hui si mois partiel)." width="w-56" />
            </th>
            <th className="text-right py-2 px-3 border-b">
              Flux net
              <InfoTooltip text="Somme nette des versements et retraits externes du mois (en EUR)." width="w-56" />
            </th>
            <th className="text-right py-2 px-3 border-b">
              Σ w·F
              <InfoTooltip text="Flux pondérés par le temps (convention CFA Institute) : w = (D-j)/D. Utilisé au dénominateur de la formule Modified Dietz." width="w-64" />
            </th>
            <th className="text-right py-2 px-3 border-b">
              R_m
              <InfoTooltip text="Rendement mensuel : (V_fin - V_début - F_net) / (V_début + Σ w·F)." width="w-56" />
            </th>
            <th className="text-center py-2 px-3 border-b">Inclus</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row, i) => (
            <tr key={i} className={`border-b ${row.included ? 'hover:bg-gray-50' : 'text-gray-400 bg-gray-50'}`}>
              <td className="py-1.5 px-3 font-mono">
                {row.month}
                {row.partial && <span className="ml-1 text-amber-600">(partiel)</span>}
              </td>
              {row.included ? (
                <>
                  <td className="py-1.5 px-3 text-right">{fmtEur(row.valueStart)}</td>
                  <td className="py-1.5 px-3 text-right">{fmtEur(row.valueEnd)}</td>
                  <td className={`py-1.5 px-3 text-right ${row.cashflowsNetEur > 0 ? 'text-emerald-600' : row.cashflowsNetEur < 0 ? 'text-red-600' : ''}`}>
                    {row.cashflowsNetEur !== 0 ? fmtEur(row.cashflowsNetEur) : '—'}
                  </td>
                  <td className="py-1.5 px-3 text-right">{fmtEur(row.weightedCashflowsEur)}</td>
                  <td className={`py-1.5 px-3 text-right font-medium ${row.monthlyReturn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {fmtMonth(row.monthlyReturn)}
                  </td>
                  <td className="py-1.5 px-3 text-center text-emerald-600">✓</td>
                </>
              ) : (
                <>
                  <td colSpan={5} className="py-1.5 px-3 italic">{row.reason}</td>
                  <td className="py-1.5 px-3 text-center text-gray-400">✗</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {breakdown.length > 0 && (
        <p className="text-xs text-gray-500 mt-2 px-1">
          Formule Modified Dietz mensuelle enchaînée — <strong>TWR annualisé = Π(1+R_m)^(365/jours) − 1</strong>
        </p>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PerformancePage() {
  const [period, setPeriod]         = useState('GLOBAL')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showWarnings, setShowWarnings]   = useState(false)
  // Comparaison période précédente
  const [showComparison, setShowComparison] = useState(false)
  const [prevData, setPrevData]             = useState(null)
  const [prevLoading, setPrevLoading]       = useState(false)
  const { trackPageView, trackEvent } = useAnalytics()

  const load = useCallback((p, cf, ct) => {
    const { from, to } = periodDates(p, cf, ct)
    // En mode custom, n'appeler l'API que si au moins "from" est renseigné
    if (p === 'CUSTOM' && !from) return
    setLoading(true)
    setError(null)
    setData(null)
    setPrevData(null)
    setShowBreakdown(false)
    setShowWarnings(false)
    getGlobalPerformance(from, to)
      .then(dto => {
        setData(dto)
        trackEvent('FEATURE_USE', 'tools.performance.compute', {
          period: p,
          twrAvailable: dto.twrAnnualized != null,
          mwrAvailable: dto.mwrAnnualized != null,
          warningsCount: dto.warnings?.length ?? 0,
        })
      })
      .catch(err => setError(err.message ?? 'Erreur lors du calcul'))
      .finally(() => setLoading(false))
  }, [trackEvent])

  const loadPrev = useCallback((p, cf, ct) => {
    const prev = prevPeriodDates(p, cf, ct)
    if (!prev) { setPrevData(null); return }
    setPrevLoading(true)
    getGlobalPerformance(prev.from, prev.to)
      .then(dto => setPrevData(dto))
      .catch(() => setPrevData(null))
      .finally(() => setPrevLoading(false))
  }, [])

  const handleToggleComparison = () => {
    const next = !showComparison
    setShowComparison(next)
    if (next && prevData == null) loadPrev(period, customFrom, customTo)
    if (!next) setPrevData(null)
  }

  // Chargement initial
  useEffect(() => {
    trackPageView('tools.performance.view')
    load('GLOBAL', '', '')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (p) => {
    setPeriod(p)
    setPrevData(null)
    if (p !== 'CUSTOM') {
      load(p, customFrom, customTo)
      if (showComparison) loadPrev(p, customFrom, customTo)
    }
  }

  const handleCustomChange = (field, value) => {
    const newFrom = field === 'from' ? value : customFrom
    const newTo   = field === 'to'   ? value : customTo
    if (field === 'from') setCustomFrom(value)
    else setCustomTo(value)
    load('CUSTOM', newFrom, newTo)
    if (showComparison) loadPrev('CUSTOM', newFrom, newTo)
  }

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-gray-900">Performance patrimoniale</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          TWR et MWR annualisés — combien rapportent vos actifs, indépendamment de vos versements.
        </p>
      </div>

      {/* Sélecteur de période */}
      <PeriodSelector
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        onPeriodChange={handlePeriodChange}
        onCustomChange={handleCustomChange}
      />

      {/* Chargement */}
      {loading && (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          Calcul en cours…
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Résultats */}
      {data && (
        <>
          {/* KPIs : TWR / MWR / Volatilité / Sharpe / Drawdown + toggle comparaison */}
          <div className="flex items-center justify-end -mb-2">
            {period !== 'GLOBAL' && (
              <button
                onClick={handleToggleComparison}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                  showComparison
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {prevLoading
                  ? <span className="text-gray-400">…</span>
                  : <span>{showComparison ? '✓' : '⊕'}</span>
                }
                vs période précédente
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard
              label="TWR annualisé"
              value={fmtPct(data.twrAnnualized)}
              color="indigo"
              subtitle="Performance pure des actifs"
              tooltip="Time-Weighted Return — mesure la performance pure de vos actifs, indépendamment du timing et du volume de vos versements. C'est la métrique standard pour comparer un portefeuille à un benchmark (CW8, S&P 500). Un TWR de 9 %/an signifie que 1 € investi au début aurait gagné en moyenne 9 % par an."
              comparison={showComparison ? buildCmp(data.twrAnnualized, prevData?.twrAnnualized, fmtPct) : null}
            />
            <KpiCard
              label="MWR annualisé"
              value={fmtPct(data.mwrAnnualized)}
              color="teal"
              subtitle="Performance réellement vécue"
              tooltip="Money-Weighted Return — mesure la performance que vous avez réellement vécue, qui intègre le fait que l'argent placé tôt a plus pesé que l'argent placé tard. C'est la réponse honnête à « combien j'ai gagné par an, en moyenne, avec mes choix d'investissement ». Calculé comme un XIRR sur l'ensemble de vos cashflows."
              comparison={showComparison ? buildCmp(data.mwrAnnualized, prevData?.mwrAnnualized, fmtPct) : null}
            />
            <KpiCard
              label="Volatilité"
              value={fmtVolatility(data.volatilityAnnualized)}
              color="gray"
              subtitle="Amplitude des variations mensuelles"
              tooltip="Écart-type annualisé des rendements mensuels (formule de Bessel, n−1). Mesure l'amplitude des variations de votre portefeuille. Un portefeuille 100 % ETF monde tourne autour de 12–15 %/an. Une crypto heavy peut dépasser 40 %/an. Plus c'est bas, plus le chemin vers le rendement est régulier."
              comparison={showComparison ? buildCmp(data.volatilityAnnualized, prevData?.volatilityAnnualized, fmtVolatility, 100, false) : null}
            />
            <KpiCard
              label="Ratio de Sharpe"
              value={fmtSharpe(data.sharpeRatio)}
              color="gray"
              subtitle={sharpeSubtitle(data.sharpeRatio)}
              valueColor={sharpeColor(data.sharpeRatio)}
              tooltip="(TWR annualisé − 3 % taux sans risque) ÷ volatilité. Mesure le rendement obtenu par unité de risque prise. Sharpe > 1 = excellent, 0,5–1 = correct, < 0,5 = médiocre. Le S&P 500 tourne autour de 0,5–0,7 sur le long terme. Un Sharpe négatif signifie que vous êtes moins bien rémunéré que le Livret A pour le risque pris."
              comparison={showComparison ? buildCmp(data.sharpeRatio, prevData?.sharpeRatio, fmtSharpe, 1) : null}
            />
            <KpiCard
              label="Drawdown max"
              value={fmtDrawdown(data.maxDrawdown)}
              color="gray"
              subtitle={drawdownSubtitle(data.maxDrawdown)}
              valueColor={drawdownColor(data.maxDrawdown)}
              tooltip="La plus grosse perte traversée depuis un sommet (peak-to-trough) sur la période. Complète le ratio de Sharpe en montrant la sévérité réelle des baisses subies. Un portefeuille avec un Sharpe acceptable mais un drawdown de −45 % a dû être douloureux à traverser. Repères : un ETF monde a connu environ −34 % en 2008, −20 % en mars 2020, −22 % en 2022."
              comparison={showComparison ? buildCmp(data.maxDrawdown, prevData?.maxDrawdown, fmtDrawdown) : null}
            />
          </div>

          {/* Performance par catégorie */}
          {data.byCategory?.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">
                Par catégorie
                <InfoTooltip
                  text="Performance TWR et MWR calculée indépendamment pour chaque catégorie d'actifs. Chaque catégorie utilise ses propres cashflows et sa propre valorisation — les totaux ne s'additionnent pas nécessairement à la performance globale (effet de diversification et de timing entre catégories)."
                  width="w-96"
                />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.byCategory.map(cat => (
                  <CategoryCard key={cat.category} cat={cat} />
                ))}
              </div>
            </div>
          )}

          {/* Graphique TWR cumulé */}
          {data.monthlyBreakdown?.length > 0 && (
            <TwrCumulativeChart
              monthlyBreakdown={data.monthlyBreakdown}
              from={data.from}
              period={period}
              customFrom={customFrom}
              customTo={customTo}
            />
          )}

          {/* Profil de drawdown (underwater chart) */}
          {data.monthlyBreakdown?.length > 0 && (
            <UnderwaterChart monthlyBreakdown={data.monthlyBreakdown} />
          )}

          {/* Performance par position */}
          {data.byPosition?.length > 0 && (
            <ByPositionSection byPosition={data.byPosition} />
          )}

          {/* Écart TWR vs MWR */}
          {data.twrAnnualized != null && data.mwrAnnualized != null &&
            Math.abs(data.twrAnnualized - data.mwrAnnualized) > 0.01 && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Écart TWR / MWR : {((data.twrAnnualized - data.mwrAnnualized) * 100).toFixed(2)} pt
              <InfoTooltip
                text="Un MWR inférieur au TWR signifie que vos gros versements sont arrivés à un moment moins favorable que la moyenne. Un MWR supérieur signifie que votre timing a été chanceux ou pertinent."
                width="w-80"
              />
            </div>
          )}

          {/* Synthèse */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Synthèse</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Période</span>
                <InfoTooltip
                  text="Date de début effective du chaînage TWR. En mode Global : 1er du mois suivant le premier versement (mois exclu car V_début = 0). En période restreinte : 1er du mois sélectionné, avec un snapshot d'ouverture synthétique à la date précédente."
                  width="w-80"
                />
                <p className="font-medium mt-0.5">
                  {data.from} → {data.to}
                  <span className="ml-2 text-gray-400 text-xs">({data.durationYears?.toFixed(2)} ans)</span>
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Versé net</span>
                <InfoTooltip
                  text="Somme nette des versements en EUR sur la période (versements - retraits). En période restreinte, inclut la valeur du portefeuille à la date d'ouverture comme « investissement initial »."
                  width="w-72"
                />
                <p className="font-medium mt-0.5">{fmtEur(data.totalInvestedEur)}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Valeur actuelle</span>
                <p className="font-medium mt-0.5">{fmtEur(data.currentValueEur)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Plus-value absolue</span>
                <InfoTooltip
                  text="Valeur actuelle − Versements nets. Peut différer de la performance % à cause du timing : 10 000 € versés il y a 10 ans ont eu plus de temps pour croître que 10 000 € versés l'an dernier."
                  width="w-72"
                />
                <p className={`font-medium mt-0.5 ${data.absoluteGainEur >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {fmtEur(data.absoluteGainEur)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide">Dividendes / intérêts</span>
                <InfoTooltip
                  text="Total des INTEREST, DIVIDEND et AIRDROP perçus sur la période, comptés en EUR. Ces flux ne sont pas des cashflows externes — ils sont déjà inclus dans la valeur actuelle (réinvestissement virtuel) et contribuent au TWR."
                  width="w-80"
                />
                <p className="font-medium mt-0.5 text-teal-700">{fmtEur(data.totalDividendsEur)}</p>
              </div>
            </div>

            <ReturnDecomposition
              absoluteGainEur={data.absoluteGainEur}
              totalDividendsEur={data.totalDividendsEur}
              totalInvestedEur={data.totalInvestedEur}
            />
          </div>

          {/* Avertissements */}
          {data.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowWarnings(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition"
              >
                <span>⚠ {data.warnings.length} avertissement{data.warnings.length > 1 ? 's' : ''}</span>
                <span className="text-xs">{showWarnings ? '▲' : '▼'}</span>
              </button>
              {showWarnings && (
                <ul className="px-4 pb-3 space-y-1.5">
                  {data.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Détail mensuel (dépliable) */}
          {data.monthlyBreakdown?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowBreakdown(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <span>▸ Voir le détail du calcul (mois par mois)</span>
                <span className="text-xs text-gray-400">{showBreakdown ? '▲ réduire' : '▼ développer'}</span>
              </button>
              {showBreakdown && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-gray-500 mb-3">
                    Chaînage TWR Modified Dietz — comparez chaque ligne avec votre calcul Excel pour valider.
                  </p>
                  <MonthlyBreakdownTable breakdown={data.monthlyBreakdown} />
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Calculé le {new Date(data.computedAt).toLocaleString('fr-FR')}
          </p>

          {/* Section pédagogique */}
          <PedagogySection />
        </>
      )}
    </div>
  )
}
