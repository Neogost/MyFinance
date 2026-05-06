import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { simulateTax } from '../../api/tools'
import { compareEnvelopes } from '../../utils/fiscalEnvelopes'
import { FISCAL_PARAMS, inferTMI } from '../../data/fiscal-envelopes'
import { useAnalytics } from '../../hooks/useAnalytics'

// ── Formatage ────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}
function fmtPct(n, dec = 1) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' %'
}
function fmtK(n) {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1000000) return (n / 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€'
  if (Math.abs(n) >= 1000) return (n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' K€'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
}


// ── InfoTooltip ──────────────────────────────────────────────────────────────

// position : 'bottom' | 'top'
// align    : 'center' (défaut) | 'left' (tooltip ouvre à droite) | 'right' (tooltip ouvre à gauche)
function InfoTooltip({ text, width = 'w-64', position = 'bottom', align = 'center' }) {
  const hAlign = align === 'left'  ? 'left-0'
               : align === 'right' ? 'right-0'
               : 'left-1/2 -translate-x-1/2'

  const arrowH = align === 'left'  ? 'left-2'
               : align === 'right' ? 'right-2'
               : 'left-1/2 -translate-x-1/2'

  const positionCls = position === 'top'
    ? `bottom-full ${hAlign} mb-2`
    : `top-full ${hAlign} mt-2`

  const arrowCls = position === 'top'
    ? `top-full ${arrowH} border-4 border-transparent border-t-gray-800`
    : `bottom-full ${arrowH} border-4 border-transparent border-b-gray-800`

  return (
    <span className="relative group ml-1.5 cursor-help inline-flex items-center align-middle">
      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span className={`absolute ${positionCls} ${width} text-xs text-white bg-gray-800 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30 shadow-lg leading-relaxed font-normal text-left`}>
        <span className={`absolute ${arrowCls}`} />
        {text}
      </span>
    </span>
  )
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, min, max, step = 1, hint, unit = '', disabled }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={min} max={max} step={step}
          disabled={disabled}
          className={`w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${unit ? 'pr-8' : ''} ${disabled ? 'bg-gray-50 text-gray-400' : ''}`}
        />
        {unit && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Section({ title, children, collapsible = false, defaultOpen = true, accent = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const base      = accent ? 'bg-indigo-50 rounded-xl border border-indigo-100 p-4' : 'bg-white rounded-xl shadow-sm border border-gray-100 p-4'
  const titleCls  = accent ? 'text-xs font-semibold text-indigo-700 uppercase tracking-wide' : 'text-xs font-semibold text-gray-500 uppercase tracking-wide'
  return (
    <div className={base}>
      {collapsible ? (
        <button onClick={() => setOpen(v => !v)} className={`flex items-center justify-between w-full ${titleCls}`}>
          {title}
          <span className={accent ? 'text-indigo-400' : 'text-gray-400'}>{open ? '▲' : '▼'}</span>
        </button>
      ) : (
        <h2 className={titleCls}>{title}</h2>
      )}
      {(!collapsible || open) && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}

function Toggle2({ left, right, value, onChange }) {
  return (
    <div className="flex border border-gray-300 rounded-md overflow-hidden text-xs w-full">
      <button onClick={() => onChange(left.value)}
        className={`flex-1 py-1.5 px-2 transition ${value === left.value ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
        {left.label}
      </button>
      <button onClick={() => onChange(right.value)}
        className={`flex-1 py-1.5 px-2 transition ${value === right.value ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
        {right.label}
      </button>
    </div>
  )
}

const ENVELOPE_META = {
  cto: { label: 'CTO',           color: '#6b7280', bg: 'bg-gray-50',    border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-700' },
  pea: { label: 'PEA',           color: '#6366f1', bg: 'bg-indigo-50',  border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
  av:  { label: 'Assurance-vie', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700' },
  per: { label: 'PER',           color: '#f97316', bg: 'bg-orange-50',  border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
}

const TMI_OPTIONS = [0, 11, 30, 41, 45]

function EnvelopeCard({ envKey, data, winner }) {
  if (!data) return null
  const meta     = ENVELOPE_META[envKey]
  const isWinner = data.rank === 1

  return (
    <div className={`rounded-xl border-2 p-4 flex flex-col gap-2 ${isWinner ? 'border-indigo-400 shadow-md' : meta.border}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWinner ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
          {isWinner ? '🏆 N°1' : `N°${data.rank}`}
        </span>
      </div>

      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Capital brut</span>
          <span className="font-medium text-gray-800">{fmt(data.capitalGross)}</span>
        </div>
        <div className="flex justify-between">
          <span>Frais cumulés</span>
          <span className="text-red-600">−{fmt(data.totalFees)}</span>
        </div>
        {data.taxAtEntry < 0 && (
          <div className="flex justify-between">
            <span>Éco. fiscale entrée</span>
            <span className="text-emerald-600">+{fmt(-data.taxAtEntry)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Impôt sortie</span>
          <span className="text-red-600">−{fmt(data.taxAtExit)}</span>
        </div>
        {data.netSavings > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Réinvest. éco. PER</span>
            <span>+{fmt(data.netSavings)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-2 mt-1">
        <p className="text-base font-bold" style={{ color: meta.color }}>{fmt(data.netCapital)}</p>
        <p className="text-xs text-gray-500">net · {fmtPct(data.annualReturn)}/an brut</p>
      </div>

      {data.peaCapBreached && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">⚠ Plafond PEA ({fmt(FISCAL_PARAMS.PEA_CAP)}) dépassé</p>
      )}
      {data.perCapBreached && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">⚠ Plafond PER dépassé</p>
      )}
    </div>
  )
}

function WinnerBanner({ winner, delta }) {
  if (!winner) return null
  const meta = ENVELOPE_META[winner.key]
  return (
    <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 md:p-5">
      <p className="text-xs font-semibold opacity-80 uppercase tracking-wide mb-1">Meilleure enveloppe</p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-2xl md:text-3xl font-bold">{meta.label}</p>
          <p className="text-sm opacity-90 mt-0.5">{fmt(winner.netCapital)} net après impôts</p>
        </div>
        <div className="text-sm opacity-80">
          {delta > 0 && <p>+{fmt(delta)} vs 2e</p>}
        </div>
      </div>
    </div>
  )
}

const CustomTooltipLine = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">Après {label} ans</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{ENVELOPE_META[p.dataKey]?.label ?? p.dataKey}</span>
          <span className="font-medium text-gray-800">{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">À {label} ans</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{ENVELOPE_META[p.dataKey]?.label ?? p.dataKey}</span>
          <span className="font-medium text-gray-800">{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Page principale ──────────────────────────────────────────────────────────

// Rendements par défaut réalistes par enveloppe
const DEFAULT_RETURNS = { cto: 7, pea: 6.5, av: 3.5, per: 4.5 }

export default function FiscalEnvelopeComparatorPage({ user }) {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('tools.fiscal_envelope') }, [])
  // Versements
  const [initialAmount,      setInitialAmount]      = useState(10000)
  const [monthlyContrib,     setMonthlyContrib]     = useState(300)
  const [duration,           setDuration]           = useState(20)

  // Rendements — mode "même taux" ou taux par enveloppe
  const [sameRate,    setSameRate]    = useState(false)
  const [sharedRate,  setSharedRate]  = useState(6)
  const [ctoReturn,   setCtoReturn]   = useState(DEFAULT_RETURNS.cto)
  const [peaReturn,   setPeaReturn]   = useState(DEFAULT_RETURNS.pea)
  const [avReturn,    setAvReturn]    = useState(DEFAULT_RETURNS.av)
  const [perReturn,   setPerReturn]   = useState(DEFAULT_RETURNS.per)

  // Profil fiscal
  const [apiTMI,             setApiTMI]             = useState(null)
  const [tmiLoading,         setTmiLoading]         = useState(true)
  const [currentTMI,         setCurrentTMI]         = useState(30)
  const [retirementTMI,      setRetirementTMI]      = useState(30)
  const [householdSituation, setHouseholdSituation] = useState('single')

  // Frais
  const [ctoFees, setCtoFees] = useState(FISCAL_PARAMS.DEFAULT_FEES.cto)
  const [peaFees, setPeaFees] = useState(FISCAL_PARAMS.DEFAULT_FEES.pea)
  const [avFees,  setAvFees]  = useState(FISCAL_PARAMS.DEFAULT_FEES.av)
  const [perFees, setPerFees] = useState(FISCAL_PARAMS.DEFAULT_FEES.per)

  // Options avancées
  const [perAnnualCap,      setPerAnnualCap]      = useState(FISCAL_PARAMS.PER_DEFAULT_ANNUAL_CAP)
  const [reinvestTaxSaving, setReinvestTaxSaving] = useState(true)
  const [dividendYield,     setDividendYield]     = useState(2)
  const [taxOption,         setTaxOption]         = useState('pfu')

  // Rendements effectifs selon le mode
  const effectiveReturns = sameRate
    ? { cto: sharedRate, pea: sharedRate, av: sharedRate, per: sharedRate }
    : { cto: ctoReturn,  pea: peaReturn,  av: avReturn,   per: perReturn  }

  // Chargement de la TMI depuis l'API
  useEffect(() => {
    if (!user) { setTmiLoading(false); return }
    simulateTax()
      .then(res => {
        const revenuParPart = res.totalTaxableIncome && res.fiscalParts
          ? res.totalTaxableIncome / res.fiscalParts
          : null
        if (revenuParPart != null) {
          const tmi = inferTMI(revenuParPart)
          setApiTMI(tmi)
          setCurrentTMI(tmi)
          setRetirementTMI(Math.max(0, tmi - 11))
        }
      })
      .catch(() => {})
      .finally(() => setTmiLoading(false))
  }, [])

  const result = useMemo(() => compareEnvelopes({
    initialAmount,
    monthlyContribution: monthlyContrib,
    duration,
    ctoReturn:  effectiveReturns.cto,
    peaReturn:  effectiveReturns.pea,
    avReturn:   effectiveReturns.av,
    perReturn:  effectiveReturns.per,
    ctoFees,
    peaFees,
    avFees,
    perFees,
    dividendYield,
    currentTMI,
    retirementTMI,
    taxOption,
    householdSituation,
    perAnnualCap,
    reinvestTaxSaving,
  }), [
    initialAmount, monthlyContrib, duration,
    effectiveReturns.cto, effectiveReturns.pea, effectiveReturns.av, effectiveReturns.per,
    ctoFees, peaFees, avFees, perFees,
    dividendYield, currentTMI, retirementTMI,
    taxOption, householdSituation, perAnnualCap, reinvestTaxSaving,
  ])

  const { envelopes, ranking, winner, chartData } = result ?? {}

  // Delta entre N°1 et N°2
  const delta = ranking?.[1] ? (ranking[0].netCapital - ranking[1].netCapital) : 0

  // Données bar chart à 3 jalons
  const barJalons = [5, 10, 20].filter(y => y <= duration)
  const barData = barJalons.map(y => ({
    name: `${y} ans`,
    cto: envelopes?.cto?.yearlyData[y - 1]?.capital ?? 0,
    pea: envelopes?.pea?.yearlyData[y - 1]?.capital ?? 0,
    av:  envelopes?.av?.yearlyData[y - 1]?.capital  ?? 0,
    per: envelopes?.per?.yearlyData[y - 1]?.capital ?? 0,
  }))

  const totalContribs = initialAmount + monthlyContrib * duration * 12

  return (
    <div className="max-w-7xl mx-auto">
    <h1 className="text-2xl font-bold text-gray-900 mb-6">
      Comparateur d'enveloppes fiscales
      <span className="text-sm font-normal text-gray-400 ml-2">PEA · CTO · Assurance-vie · PER</span>
    </h1>
    <div className="flex flex-col lg:flex-row gap-4 lg:items-start">

      {/* ══ PANNEAU GAUCHE ══════════════════════════════════════════════════ */}
      <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-3">

        <Section title="Versements">
          <NumInput label="Capital initial (€)" value={initialAmount} onChange={setInitialAmount} min={0} step={1000} />
          <NumInput label="Versement mensuel (€)" value={monthlyContrib} onChange={setMonthlyContrib} min={0} step={50} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Horizon (années) — {duration} ans
              <InfoTooltip text="Durée pendant laquelle vous investissez. L'horizon est déterminant : certaines enveloppes n'ont d'avantage fiscal qu'après une durée minimale (5 ans pour le PEA, 8 ans pour l'AV)." />
            </label>
            <input type="range" min={1} max={40} value={duration} onChange={e => setDuration(Number(e.target.value))}
              className="w-full accent-indigo-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>1 an</span><span>40 ans</span></div>
          </div>
        </Section>

        <Section title="Rendements attendus">
          {/* Toggle mode */}
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <Toggle2
              left={{ value: false, label: 'Par enveloppe' }}
              right={{ value: true,  label: 'Même taux' }}
              value={sameRate}
              onChange={v => setSameRate(v === true || v === 'true')}
            />
            <InfoTooltip width="w-80" text="Par enveloppe : chaque enveloppe a son propre rendement attendu, plus réaliste (CTO/PEA → actions mondiales, AV → mix fonds euros + UC, PER → profil équilibré). Même taux : même rendement pour toutes les enveloppes, utile pour isoler l'impact fiscal seul." />
          </div>

          {sameRate ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rendement commun (%)
                <InfoTooltip text="Appliqué identiquement aux 4 enveloppes — permet d'isoler l'impact fiscal pur, sans biais lié à l'univers d'investissement." />
              </label>
              <div className="flex items-center gap-2">
                <input type="range" min={0.5} max={15} step={0.5} value={sharedRate}
                  onChange={e => setSharedRate(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-600" />
                <span className="text-sm font-semibold text-gray-800 w-12 text-right">{sharedRate} %</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                {
                  key: 'cto', label: 'CTO', color: 'text-gray-700',
                  value: ctoReturn, set: setCtoReturn,
                  tip: 'ETF monde (MSCI World, S&P500…) : ~7–9 %/an historique sur 20 ans. Pas de restriction géographique. Défaut : 7 %.',
                },
                {
                  key: 'pea', label: 'PEA', color: 'text-indigo-600',
                  value: peaReturn, set: setPeaReturn,
                  tip: 'Limité aux actions UE et ETF éligibles (CAC40, Euro Stoxx 600, ETF Europe…). Légèrement inférieur au MSCI World historiquement. Défaut : 6,5 %.',
                },
                {
                  key: 'av', label: 'Assurance-vie', color: 'text-emerald-600',
                  value: avReturn, set: setAvReturn,
                  tip: 'Dépend fortement de l\'allocation : fonds euros seul ~2–3 %, 100 % UC actions ~6–7 %. Pour un mix classique 50/50, ~3,5–4 %. Défaut : 3,5 %.',
                },
                {
                  key: 'per', label: 'PER', color: 'text-orange-600',
                  value: perReturn, set: setPerReturn,
                  tip: 'Similaire à l\'AV mais souvent plus dynamique (gestion pilotée "long terme" avec plus d\'UC actions). Typiquement 4–5 % pour un profil équilibré. Défaut : 4,5 %.',
                },
              ].map(({ key, label, color, value, set, tip }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${color}`}>
                      {label}
                      <InfoTooltip text={tip} />
                    </span>
                    <span className="text-xs font-bold text-gray-800">{value} %</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0.5} max={15} step={0.5} value={value}
                      onChange={e => set(parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-600" style={{ accentColor: ENVELOPE_META[key].color }} />
                    <button
                      onClick={() => set(DEFAULT_RETURNS[key])}
                      className="text-xs text-gray-400 hover:text-indigo-600 transition shrink-0"
                      title={`Réinitialiser à ${DEFAULT_RETURNS[key]} %`}
                    >↺</button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                Valeurs par défaut calibrées sur les moyennes historiques. Cliquez ↺ pour réinitialiser.
              </p>
            </div>
          )}
        </Section>

        <Section title="Profil fiscal">
          {tmiLoading ? (
            <p className="text-xs text-gray-400">Chargement TMI…</p>
          ) : apiTMI != null ? (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1">✓ TMI chargée depuis votre profil ({apiTMI} %)</p>
          ) : (
            <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">TMI non disponible — saisissez manuellement</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              TMI actuelle
              <InfoTooltip width="w-72" text="Tranche Marginale d'Imposition : taux appliqué sur le dernier euro de revenu imposable. Barème 2024 : 0 % (< 11 294 €/part), 11 % (11 294–28 797 €), 30 % (28 797–82 341 €), 41 % (82 341–177 106 €), 45 % (> 177 106 €). Utilisée pour estimer l'économie d'impôt à l'entrée du PER et la taxation à la sortie au barème." />
            </label>
            <select value={currentTMI} onChange={e => setCurrentTMI(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {TMI_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              TMI à la retraite (PER)
              <InfoTooltip width="w-72" text="Pour le PER, la sortie en capital est imposée au barème de l'IR à la retraite. Les retraités ont souvent une TMI plus basse (revenus réduits) : c'est ce qui rend le PER avantageux — vous déduisez à votre TMI active (haute) et payez à votre TMI retraite (basse). Si votre TMI retraite est supérieure, le PER perd de son intérêt." />
            </label>
            <select value={retirementTMI} onChange={e => setRetirementTMI(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {TMI_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Situation foyer (AV)
              <InfoTooltip text="L'abattement annuel sur les gains de l'assurance-vie après 8 ans est de 4 600 € pour un célibataire et 9 200 € pour un couple marié ou pacsé. Au-delà, les gains restants sont taxés à 24,7 % (si versements ≤ 150 000 €)." />
            </label>
            <Toggle2
              left={{ value: 'single', label: 'Célibataire' }}
              right={{ value: 'couple', label: 'Couple' }}
              value={householdSituation}
              onChange={setHouseholdSituation}
            />
            <p className="text-xs text-gray-400 mt-0.5">
              Abattement AV après 8 ans : {householdSituation === 'couple' ? '9 200' : '4 600'} €/an
            </p>
          </div>
        </Section>

        <Section title="Frais d'enveloppe" collapsible defaultOpen={false}>
          <p className="text-xs text-gray-400 -mt-1">
            Les frais réduisent le rendement effectif chaque année.
            <InfoTooltip width="w-72" text="Sur un courtier en ligne (Boursorama, Fortuneo…), les frais CTO et PEA sont souvent nuls. Les frais d'assurance-vie (AV) et de PER sont composés des frais de gestion du contrat (~0,6 %/an) et des frais propres à chaque fonds ou UC. Sur 20 ans, 0,6 %/an de frais supplémentaires réduisent le capital final d'environ 11 %." />
          </p>
          <NumInput label="CTO (%/an)" value={ctoFees} onChange={setCtoFees} min={0} max={5} step={0.1} unit="%" />
          <NumInput label="PEA (%/an)" value={peaFees} onChange={setPeaFees} min={0} max={5} step={0.1} unit="%" />
          <NumInput label="Assurance-vie (%/an)" value={avFees} onChange={setAvFees} min={0} max={5} step={0.1} unit="%"
            hint="Frais UC typiques : 0,6 %/an" />
          <NumInput label="PER (%/an)" value={perFees} onChange={setPerFees} min={0} max={5} step={0.1} unit="%"
            hint="Frais UC typiques : 0,6 %/an" />
        </Section>

        <Section title="Options avancées" collapsible defaultOpen={false}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Option fiscale CTO / PEA&lt;5 ans / AV&lt;8 ans
              <InfoTooltip width="w-80" text="Prélèvement Forfaitaire Unique (PFU) : flat tax de 31,4 % (14,2 % IR + 17,2 % prélèvements sociaux). C'est l'option par défaut depuis 2018. Option barème : les plus-values s'ajoutent à vos revenus et sont taxées à votre TMI + 17,2 % PS. L'option barème peut être avantageuse si votre TMI est de 0 ou 11 %, mais elle s'applique alors à tous vos revenus de capitaux de l'année." />
            </label>
            <Toggle2
              left={{ value: 'pfu', label: 'PFU 31,4 %' }}
              right={{ value: 'bareme', label: 'Barème IR' }}
              value={taxOption}
              onChange={setTaxOption}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rendement en dividendes CTO (%/an)
              <InfoTooltip text="Part du rendement distribuée sous forme de dividendes (ETF distribuants, actions à dividendes). Contrairement aux enveloppes PEA/AV/PER qui permettent la capitalisation des dividendes, le CTO impose les dividendes chaque année au moment de leur versement, réduisant l'effet des intérêts composés. Un ETF capitalisant (accumulant) évite cette taxation annuelle." />
            </label>
            <div className="relative">
              <input type="number" value={dividendYield} onChange={e => setDividendYield(parseFloat(e.target.value) || 0)}
                min={0} max={10} step={0.5}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8" />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Dividendes taxés annuellement (CTO uniquement)</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Plafond déduction PER (€/an)
              <InfoTooltip width="w-80" text="Le PER permet de déduire vos versements de votre revenu imposable, dans la limite de 10 % de vos revenus professionnels nets N-1, plafonné à 8 × le Plafond Annuel de la Sécurité Sociale (PASS). En 2024 : max ~32 909 €/an. Les plafonds non utilisés sont reportables sur 3 ans. Au-delà du plafond, les versements capitalisent mais sans avantage fiscal à l'entrée." />
            </label>
            <div className="relative">
              <input type="number" value={perAnnualCap} onChange={e => setPerAnnualCap(parseFloat(e.target.value) || 0)}
                min={1000} max={100000} step={500}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Défaut : {FISCAL_PARAMS.PER_DEFAULT_ANNUAL_CAP.toLocaleString('fr-FR')} € (10 % revenus N-1, plafond PASS×8)</p>
          </div>
          <div className="flex items-start gap-2">
            <input type="checkbox" id="reinvest" checked={reinvestTaxSaving}
              onChange={e => setReinvestTaxSaving(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <label htmlFor="reinvest" className="text-xs text-gray-700 cursor-pointer">
                Réinvestir l'économie d'impôt PER dans un CTO virtuel
                <InfoTooltip width="w-80" text="Pour comparer le PER équitablement, il faut tenir compte de l'économie d'impôt réalisée à l'entrée (TMI × versement). Cette option la réinvestit chaque année dans un CTO virtuel (sans frais). À la sortie, le CTO virtuel est taxé au PFU 31,4 % sur ses gains. Sans cette option, vous supposez que l'économie d'impôt est dépensée — ce qui sous-estime l'avantage réel du PER." />
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Économie annuelle : {fmt(Math.min(monthlyContrib * 12, perAnnualCap) * currentTMI / 100)} ({fmtPct(currentTMI)} × versement)
              </p>
            </div>
          </div>
        </Section>

      </div>

      {/* ══ PANNEAU DROIT ═══════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Bannière vainqueur */}
        {winner && <WinnerBanner winner={winner} delta={delta} />}

        {/* Légende des enveloppes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Les 4 enveloppes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-gray-700 shrink-0">CTO</span>
              <span className="text-gray-500">Compte-titres ordinaire — aucun avantage à l'entrée, pas de plafond, PFU 31,4 % à la sortie. Univers illimité (actions monde, ETF, crypto…). Idéal si TMI faible ou investissement hors UE.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-indigo-600 shrink-0">PEA</span>
              <span className="text-gray-500">Plan d'Épargne en Actions — exonération IR après 5 ans (PS 17,2 % uniquement). Plafond 150 000 €. Limité aux actions UE et ETF éligibles. Meilleure enveloppe pour actions européennes long terme.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-emerald-600 shrink-0">AV</span>
              <span className="text-gray-500">Assurance-vie — abattement annuel ({householdSituation === 'couple' ? '9 200' : '4 600'} €) sur les gains après 8 ans, taux réduit 24,7 %. Avantage successoral. Large univers (fonds euros + UC). Frais d'enveloppe à surveiller.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-orange-600 shrink-0">PER</span>
              <span className="text-gray-500">Plan Épargne Retraite — déduction des versements du revenu imposable ({fmtPct(currentTMI)} × versement = {fmt(Math.min(monthlyContrib * 12, perAnnualCap) * currentTMI / 100)}/an d'éco.). Capital bloqué jusqu'à la retraite sauf cas exceptionnels.</span>
            </div>
          </div>
        </div>

        {/* 4 cartes enveloppes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {['pea', 'av', 'per', 'cto'].map(key => (
            <EnvelopeCard key={key} envKey={key} data={envelopes?.[key]} winner={winner} />
          ))}
        </div>

        {/* Graphique évolution capital brut */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Évolution du capital brut sur {duration} ans
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Avant impôts à la sortie — frais d'enveloppe déjà déduits.
            <InfoTooltip text="Le graphique affiche le capital accumulé avant la fiscalité finale à la sortie. Les frais d'enveloppe annuels sont déjà déduits. La ligne grise pointillée représente l'ensemble des versements effectués (capital investi sans rendement). Tout ce qui est au-dessus représente les gains." />
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tickFormatter={v => `${v}a`} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={60} />
              <Tooltip content={<CustomTooltipLine />} />
              <Legend formatter={k => ENVELOPE_META[k]?.label ?? k} wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={totalContribs} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: 'Versements', fontSize: 10, fill: '#9ca3af' }} />
              {['cto', 'pea', 'av', 'per'].map(key => (
                <Line key={key} type="monotone" dataKey={key}
                  stroke={ENVELOPE_META[key].color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart comparatif par jalons */}
        {barData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Comparaison par horizon (capital brut)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={60} />
                <Tooltip content={<CustomTooltipBar />} />
                <Legend formatter={k => ENVELOPE_META[k]?.label ?? k} wrapperStyle={{ fontSize: 11 }} />
                {['cto', 'pea', 'av', 'per'].map(key => (
                  <Bar key={key} dataKey={key} fill={ENVELOPE_META[key].color} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tableau récapitulatif */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tableau récapitulatif</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Indicateur</th>
                  {['pea', 'av', 'per', 'cto'].map(key => (
                    <th key={key} className="px-3 py-2.5 text-right font-semibold" style={{ color: ENVELOPE_META[key].color }}>
                      {ENVELOPE_META[key].label}
                      <div className="text-gray-400 font-normal text-[10px]">{fmtPct(effectiveReturns[key])}/an brut</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: 'Versements totaux',
                    tip: 'Capital initial + versements mensuels × durée. C\'est le montant total que vous investissez de votre poche, sans aucun rendement.',
                    fn: e => fmt(e.totalContribs),
                  },
                  {
                    label: 'Capital brut au terme',
                    tip: 'Capital accumulé après capitalisation des intérêts et déduction des frais d\'enveloppe, mais avant l\'impôt à la sortie.',
                    fn: e => fmt(e.capitalGross),
                  },
                  {
                    label: 'Frais cumulés',
                    tip: 'Total estimé des frais de gestion annuels prélevés sur l\'encours (frais CTO/PEA/AV/PER × durée). Ces frais réduisent le capital brut chaque année.',
                    fn: e => e.totalFees > 0 ? `−${fmt(e.totalFees)}` : '0 €',
                    cls: 'text-red-600',
                  },
                  {
                    label: 'Éco. fiscale entrée',
                    tip: 'PER uniquement : chaque année, vos versements sont déduits de votre revenu imposable, ce qui réduit votre impôt de TMI × versement. Cette économie est un gain immédiat que les autres enveloppes n\'offrent pas.',
                    fn: e => e.taxAtEntry < 0 ? `+${fmt(-e.taxAtEntry)}` : '—',
                    cls: 'text-emerald-600',
                  },
                  {
                    label: 'Impôt sortie',
                    tip: 'Impôt dû lors du retrait : PFU 31,4 % (CTO, AV<8ans, PEA<5ans), PS 17,2 % uniquement (PEA>5ans), taux réduit 24,7 % après abattement (AV>8ans), barème IR + PFU 31,4 % sur gains (PER).',
                    fn: e => e.taxAtExit > 0 ? `−${fmt(e.taxAtExit)}` : '0 €',
                    cls: 'text-red-600',
                  },
                  {
                    label: 'Réinvest. éco. PER',
                    tip: 'Capital net de l\'économie d\'impôt PER réinvestie dans un CTO virtuel sur toute la durée, après PFU 31,4 % sur les gains de ce CTO virtuel. Ne s\'affiche que si l\'option est activée.',
                    fn: e => e.netSavings > 0 ? `+${fmt(e.netSavings)}` : '—',
                    cls: 'text-emerald-600',
                  },
                  {
                    label: 'Capital net',
                    tip: 'Capital final après tous les frais et tous les impôts — c\'est le montant réellement disponible. C\'est sur cette ligne que se base le classement.',
                    fn: e => fmt(e.netCapital),
                    bold: true,
                  },
                  {
                    label: 'Rendement brut (paramétré)',
                    tip: 'Rendement annuel brut saisi pour cette enveloppe, avant frais et avant impôts. Les frais d\'enveloppe réduisent ce taux ; les impôts s\'appliquent à la sortie uniquement. C\'est le taux de capitalisation effectivement utilisé dans le calcul.',
                    fn: e => fmtPct(e.annualReturn),
                  },
                  {
                    label: 'Rang',
                    tip: 'Classement des enveloppes par capital net décroissant pour vos paramètres actuels. Ce classement peut changer si vous modifiez la durée, la TMI ou les frais.',
                    fn: e => `N°${e.rank}`,
                    bold: true,
                  },
                ].map(({ label, tip, fn, cls, bold }, idx) => (
                  <tr key={label} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">
                      {label}
                      {tip && <InfoTooltip text={tip} width="w-72" position={idx === 0 ? 'bottom' : 'top'} align="left" />}
                    </td>
                    {['pea', 'av', 'per', 'cto'].map(key => (
                      <td key={key} className={`px-3 py-2 text-right ${bold ? 'font-semibold text-gray-900' : 'text-gray-700'} ${cls ?? ''}`}>
                        {envelopes?.[key] ? fn(envelopes[key]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes méthodologiques */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-600 mb-2">Notes méthodologiques</p>
          <p>① Capitalisation mensuelle des versements sur toute la durée.</p>
          {sameRate
            ? <p>② Rendement identique {fmtPct(sharedRate)}/an brut appliqué aux 4 enveloppes (mode « même taux »). L'écart de résultat reflète uniquement la fiscalité.</p>
            : <p>② Rendements différenciés par enveloppe : CTO {fmtPct(effectiveReturns.cto)}, PEA {fmtPct(effectiveReturns.pea)}, AV {fmtPct(effectiveReturns.av)}, PER {fmtPct(effectiveReturns.per)} — ces hypothèses influencent le classement autant que la fiscalité.</p>
          }
          <p>③ CTO : dividendes ({fmtPct(dividendYield)}/an) taxés annuellement au {taxOption === 'pfu' ? 'PFU 31,4 %' : 'barème IR + PS'}, plus-values taxées à la sortie uniquement.</p>
          <p>④ PEA : exonération IR après 5 ans ; seuls les prélèvements sociaux ({fmtPct(FISCAL_PARAMS.SOCIAL_CHARGES_RATE * 100)}) s'appliquent sur les gains.</p>
          <p>⑤ AV : abattement annuel {householdSituation === 'couple' ? '9 200 €' : '4 600 €'} appliqué une fois à la sortie (modèle de rachat unique). Taux réduit 24,7 % si versements ≤ 150 000 €.</p>
          <p>⑥ PER : déduction TMI {fmtPct(currentTMI)} sur les versements. Sortie en capital : versements taxés au barème (TMI retraite {fmtPct(retirementTMI)}), gains au PFU 31,4 %.</p>
          {reinvestTaxSaving && <p>⑦ Réinvestissement de l'économie PER : capitalisée au rendement PER ({fmtPct(effectiveReturns.per)}/an), nette de PFU 31,4 % à la sortie.</p>}
          <p>⑧ Les frais d'enveloppe sont déduits mensuellement du rendement (approche linéaire conservatrice).</p>
          <p>⑨ Les graphiques affichent le capital brut avant imposition à la sortie. Les cartes et le tableau affichent le capital net.</p>
          <p className="text-gray-400 italic mt-2">Simulation indicative — non contractuelle. Consultez un conseiller en gestion de patrimoine pour une analyse personnalisée.</p>
        </div>

      </div>
    </div>
    </div>
  )
}
