import { useState, useEffect, useCallback } from 'react'
import { getPerformanceGlobal, getPerformancePositions } from '../../api/performance'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CATEGORY_LABELS = {
  BOURSE:      'Bourse',
  CRYPTO:      'Crypto-monnaie',
  IMMO_PAPIER: 'Immo papier',
  LIVRET:      'Livret',
}

const PERIODS = [
  { label: 'Globale',   from: null,    to: null },
  { label: 'YTD',       from: 'ytd',   to: null },
  { label: '1 an',      from: '1y',    to: null },
  { label: '3 ans',     from: '3y',    to: null },
  { label: '5 ans',     from: '5y',    to: null },
]

function pct(v, decimals = 2) {
  if (v == null) return '—'
  return (v * 100).toFixed(decimals) + ' %'
}

/** Affichage sans décimale — privilégié sur l'UI pour ne pas suggérer une précision qu'on n'a pas. */
function pct0(v) {
  if (v == null) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${(v * 100).toFixed(0)} %`
}

/**
 * Plages réalistes par catégorie. Une valeur hors plage signale très probablement
 * un artefact de calcul (recatégorisation, snapshot manquant, données incomplètes)
 * plus qu'une vraie performance.
 */
const REALISTIC_TWR_BOUNDS = {
  LIVRET:      { min: -0.05, max: 0.10 },  // produit régulé, taux historique 0,5-5 %
  IMMO_PAPIER: { min: -0.25, max: 0.25 },  // SCPI typiquement 3-6 %, max ~10 %
  BOURSE:      { min: -0.70, max: 1.50 },  // crashes historiques ~-50 %, super années ~+60 %
  // CRYPTO non borné — volatilité extrême réelle
}

function isImplausible(value, category) {
  if (value == null) return false
  const bounds = REALISTIC_TWR_BOUNDS[category]
  return bounds && (value < bounds.min || value > bounds.max)
}

function eur(v) {
  if (v == null) return '—'
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

function resolveFrom(key) {
  const today = new Date()
  if (!key) return null
  if (key === 'ytd') return `${today.getFullYear()}-01-01`
  if (key === '1y') {
    const d = new Date(today); d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().slice(0, 10)
  }
  if (key === '3y') {
    const d = new Date(today); d.setFullYear(d.getFullYear() - 3)
    return d.toISOString().slice(0, 10)
  }
  if (key === '5y') {
    const d = new Date(today); d.setFullYear(d.getFullYear() - 5)
    return d.toISOString().slice(0, 10)
  }
  return null
}

function InfoTooltip({ text, children, width = 'w-72', position = 'below', align = 'center' }) {
  const posClass = position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
  const alignClass = align === 'left'
    ? 'left-0'
    : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2'
  const arrowAlign = align === 'left'
    ? 'left-3'
    : align === 'right'
      ? 'right-3'
      : 'left-1/2 -translate-x-1/2'
  return (
    <span className="relative group ml-1.5 cursor-help inline-flex items-center align-middle">
      <span className="text-gray-400 group-hover:text-indigo-500 transition-colors text-sm leading-none">ⓘ</span>
      <span className={`absolute ${posClass} ${alignClass} ${width} text-xs text-white bg-gray-800 rounded-lg px-3 py-2.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30 shadow-lg font-normal text-left normal-case tracking-normal`}>
        {position === 'above'
          ? <span className={`absolute top-full ${arrowAlign} border-4 border-transparent border-t-gray-800`} />
          : <span className={`absolute bottom-full ${arrowAlign} border-4 border-transparent border-b-gray-800`} />
        }
        {children ?? text}
      </span>
    </span>
  )
}

function TooltipBody({ desc, method, result }) {
  return (
    <span className="flex flex-col gap-1.5 leading-relaxed">
      <span>{desc}</span>
      {method && <span className="text-gray-300">{method}</span>}
      {result && (
        <span className="border-t border-gray-600 pt-1.5 text-gray-100 font-medium">
          {result}
        </span>
      )}
    </span>
  )
}

function KpiCard({ label, info, infoAlign = 'center', value, sub, color = 'text-gray-900', small = false }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center">
        {label}
        {info && <InfoTooltip width="w-80" align={infoAlign}>{info}</InfoTooltip>}
      </span>
      <span className={`${small ? 'text-xl' : 'text-2xl'} font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400 dark:text-gray-500">{sub}</span>}
    </div>
  )
}

function PerformanceBadge({ value, category }) {
  if (value == null) return <span className="text-gray-400 text-sm">—</span>

  if (isImplausible(value, category)) {
    return (
      <span className="inline-flex items-center text-sm font-medium text-gray-400">
        <span className="line-through decoration-gray-400/60">{pct0(value)}</span>
        <InfoTooltip
          position="above"
          width="w-80"
          text="Valeur hors plage réaliste pour cette catégorie. Cause probable : une position de cette catégorie a été reclassée après un relevé, ou un relevé manque à un moment où le portefeuille a beaucoup bougé. À considérer comme indicatif."
        />
      </span>
    )
  }

  const pos = value >= 0
  return (
    <span className={`text-sm font-semibold ${pos ? 'text-emerald-600' : 'text-red-600'}`}>
      {pct0(value)}
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name} : {p.value != null ? (p.value >= 0 ? '+' : '') + (p.value * 100).toFixed(2) + ' %' : '—'}
        </p>
      ))}
    </div>
  )
}

export default function PerformancePage() {
  const [periodIdx,      setPeriodIdx]      = useState(0)
  const [benchmarkInput, setBenchmarkInput] = useState('')
  const [global,         setGlobal]         = useState(null)
  const [positions,      setPositions]      = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  // regroupement par catégorie — map ordonnée : catégorie → positions triées par TWR
  const positionsByCategory = positions.reduce((acc, pos) => {
    if (!acc[pos.category]) acc[pos.category] = []
    acc[pos.category].push(pos)
    return acc
  }, {})

  const period = PERIODS[periodIdx]

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fromKey = period.from
      const params  = {}
      const fromStr = resolveFrom(fromKey)
      if (fromStr) params.from = fromStr
      const bench = parseFloat(benchmarkInput)
      if (!isNaN(bench) && bench > 0) params.benchmarkRate = bench

      const [g, p] = await Promise.all([
        getPerformanceGlobal(params),
        getPerformancePositions(fromStr ? { from: fromStr } : {}),
      ])
      setGlobal(g)
      setPositions(p)
    } catch {
      setError('Impossible de charger les données de performance.')
    } finally {
      setLoading(false)
    }
  }, [period, benchmarkInput])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Préparer la série temporelle pour Recharts
  const chartData = (global?.timeSeries ?? []).map(pt => ({
    date: pt.date,
    'Mon portefeuille': pt.cumulativeReturn,
    ...(pt.benchmarkReturn != null ? { Benchmark: pt.benchmarkReturn } : {}),
  }))

  const hasBenchmark = chartData.some(d => d.Benchmark != null)
  const hasChart     = chartData.length >= 2

  // catégories dans l'ordre des colonnes du tableau par catégorie (pour cohérence visuelle)
  const CATEGORY_ORDER = ['BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'LIVRET']
  const sortedCategories = CATEGORY_ORDER.filter(c => positionsByCategory[c])

  // ── Textes de tooltip dynamiques (injectent les valeurs réelles) ────
  const dur   = global?.durationYears ?? 0
  const twrA  = global?.twrAnnualized
  const mwrA  = global?.mwrAnnualized
  const val   = global?.currentValueEur  != null ? eur(global.currentValueEur)  : '—'
  const inv   = global?.totalInvestedEur != null ? eur(global.totalInvestedEur) : '—'
  const gain  = global?.absoluteGainEur  != null ? eur(global.absoluteGainEur)  : '—'
  const divs  = global?.dividendsAndInterestsEur != null ? eur(global.dividendsAndInterestsEur) : '—'

  // Durée réelle du TWR (depuis le premier relevé, pas le premier ordre)
  const snapCount   = global?.timeSeries?.length ?? 0
  const twrDurYears = (() => {
    if (!global?.firstSnapshotDate || !global?.to) return dur
    const ms = new Date(global.to) - new Date(global.firstSnapshotDate)
    return ms / (365.25 * 24 * 3600 * 1000)
  })()
  const twrBrut = twrA != null && twrDurYears > 0 ? Math.pow(1 + twrA, twrDurYears) - 1 : null

  // Valeur d'ouverture (période restreinte) pour le tooltip MWR
  const opening    = global?.openingValueEur != null ? eur(global.openingValueEur) : null
  const hasOpening = opening != null

  const infoTwr = (
    <TooltipBody
      desc="Mesure la performance pure de l'actif en neutralisant la taille et le timing de tes versements."
      method={<>
        HPRᵢ = (V_fin − V_début − CF) / (V_début + 0,5×CF) pour chaque intervalle entre relevés,
        puis chaînage : TWR = Π(1+HPRᵢ) − 1, annualisé sur la durée couverte par les relevés.
        {snapCount > 0 && <> {snapCount} sous-période{snapCount > 1 ? 's' : ''} chaînée{snapCount > 1 ? 's' : ''}.</>}
      </>}
      result={twrBrut != null ? <>
        TWR brut sur {twrDurYears.toFixed(1)} an(s) = {pct(twrBrut)}
        {' '}→ annualisé = {pct(twrA)}/an
      </> : null}
    />
  )

  const infoMwr = (
    <TooltipBody
      desc="Tient compte du moment précis de chaque versement — si tu as investi avant une forte hausse, ton MWR sera meilleur que le TWR."
      method={<>
        XIRR (Newton-Raphson) : trouve r tel que Σ CFᵢ/(1+r)^(jᵢ/365) = 0,
        où CFᵢ sont tes versements (négatifs) et la valeur actuelle (positive).
        {hasOpening && <> En période restreinte, la valeur du portefeuille en début de période est ajoutée comme flux initial.</>}
      </>}
      result={mwrA != null ? (
        hasOpening ? <>
          Ouverture {global.from} : {opening} · versements nets : {inv}
          {' '}→ {val} actuels sur {dur.toFixed(1)} an(s) → MWR = {pct(mwrA)}/an
        </> : <>
          {inv} investis → {val} actuels sur {dur.toFixed(1)} an(s)
          {' '}→ MWR = {pct(mwrA)}/an
        </>
      ) : null}
    />
  )

  const infoGain = (
    <TooltipBody
      desc={hasOpening
        ? "Gain de la période = Valeur actuelle − Valeur d'ouverture − Versements nets de la période."
        : "Gain net = Valeur actuelle − Capital net investi total."}
      method="Versements nets = Σ(BUY + DEPOSIT + ABONDEMENT) − Σ(SELL + WITHDRAWAL) sur la période. Dividendes et intérêts exclus (gains internes déjà compris dans la valeur actuelle)."
      result={global?.absoluteGainEur != null ? (
        hasOpening
          ? <>{val} − {opening} (ouverture) − {inv} (versements) = {gain}</>
          : <>{val} − {inv} = {gain}</>
      ) : null}
    />
  )

  const infoDivs = (
    <TooltipBody
      desc="Cumul des ordres INTEREST, DIVIDEND et AIRDROP sur la période."
      method="Ces flux augmentent la valeur de la position sans être comptés comme versements — ils n'affectent pas le dénominateur du TWR."
      result={global?.dividendsAndInterestsEur != null
        ? <>Total encaissé : {divs}</>
        : null}
    />
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 dark:text-gray-500">Chargement…</p>
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Performance patrimoniale</h2>
          {global && (
            <div className="mt-0.5 space-y-0.5">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                MWR : {global.from} → {global.to} ({global.durationYears?.toFixed(1)} ans)
                <InfoTooltip
                  align="left"
                  text="La période du MWR démarre au premier ordre enregistré (BUY, DEPOSIT…) toutes positions confondues. Le MWR/XIRR a besoin de l'historique complet des flux pour calculer le taux de rendement réel — tronquer la période fausserait le résultat."
                />
              </p>
              {global.firstSnapshotDate && global.firstSnapshotDate !== global.from && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  TWR : depuis le premier relevé ({global.firstSnapshotDate})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sélecteur de période */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
            {PERIODS.map((p, i) => (
              <button key={p.label} onClick={() => setPeriodIdx(i)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  periodIdx === i
                    ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Benchmark */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              vs
              <InfoTooltip
                width="w-80"
                text="Taux de rendement annuel constant servant de référence. Ex. : 8 %/an ≈ performance historique d'un ETF MSCI World sur 30 ans. La courbe benchmark est calculée comme (1 + taux/100)^(jours/365) − 1 à chaque date de relevé, en partant de 0 au premier jour de la période sélectionnée."
              />
            </span>
            <input
              type="number" min="0" max="50" step="0.5"
              value={benchmarkInput}
              onChange={e => setBenchmarkInput(e.target.value)}
              onBlur={fetchAll}
              placeholder="8 %/an"
              className="w-24 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ── Bannière permanente : fonctionnalité en travaux ──── */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg px-4 py-3 text-sm text-orange-800 dark:text-orange-300 flex items-start gap-3">
        <span className="text-2xl leading-none">🚧</span>
        <div className="flex-1 leading-snug space-y-1">
          <p className="font-bold">Fonctionnalité en cours de développement — réservée aux administrateurs</p>
          <p className="text-orange-700 dark:text-orange-400">
            Les calculs de performance (TWR, MWR) sont implémentés mais ont des limites structurelles connues qui peuvent produire des valeurs imprécises ou aberrantes. Cette page n'est pas exposée aux utilisateurs réguliers tant que ces limites n'auront pas été levées.
          </p>
        </div>
        <InfoTooltip align="right" width="w-96">
          <span className="block font-semibold mb-1.5">Limites assumées :</span>
          <span className="block mb-1">• Calculs basés sur les relevés mensuels — précision dégradée entre deux relevés (Modified Dietz est une approximation)</span>
          <span className="block mb-1">• Si une position change de catégorie après un relevé, l'historique de cette catégorie devient incohérent rétroactivement</span>
          <span className="block mb-1">• <code>IMMO_PHYSIQUE</code> et <code>LIQUIDITE</code> sont exclus (valeurs subjectives / non productives de rendement)</span>
          <span className="block mb-1">• Les frais de courtage, de gestion et TER d'ETF ne sont pas comptés</span>
          <span className="block mb-1">• Conversion devise figée au taux de la date d'ordre</span>
          <span className="block">• Les valeurs hors plage réaliste (ex. Livret à -50 %/an) sont barrées et signalées par ⓘ</span>
        </InfoTooltip>
      </div>

      {/* ── Avertissement spécifique (snapshots manquants, etc.) ─── */}
      {global?.warning && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1">
          ⚠ {global.warning}
          <InfoTooltip
            text="Le TWR est calculé par chaînage de sous-périodes entre chaque relevé mensuel. Sans relevés, il est impossible de mesurer la valorisation du portefeuille avant et après chaque versement — le TWR ne peut pas être calculé. Le MWR (XIRR), lui, ne nécessite que les ordres et la valeur actuelle."
            width="w-80"
          />
        </div>
      )}

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="TWR annualisé"
          infoAlign="left"
          info={infoTwr}
          value={global?.twrAnnualized != null ? pct0(global.twrAnnualized) : '—'}
          sub="Performance pure (neutralise les versements)"
          color={global?.twrAnnualized >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <KpiCard
          label="MWR annualisé"
          infoAlign="left"
          info={infoMwr}
          value={global?.mwrAnnualized != null ? pct0(global.mwrAnnualized) : '—'}
          sub="Rendement réellement vécu"
          color={global?.mwrAnnualized >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <KpiCard
          label="Plus-value"
          info={infoGain}
          value={<span className="amount">{eur(global?.absoluteGainEur)}</span>}
          sub={hasOpening
            ? `Ouverture : ${opening} · Apports : ${inv} · Valeur : ${val}`
            : `Investi : ${inv} · Valeur : ${val}`}
          color={Number(global?.absoluteGainEur) >= 0 ? 'text-emerald-600' : 'text-red-600'}
          small
        />
        <KpiCard
          label="Dividendes & intérêts"
          infoAlign="right"
          info={infoDivs}
          value={<span className="amount">{eur(global?.dividendsAndInterestsEur)}</span>}
          sub="Cumulés sur la période"
          color="text-indigo-600"
          small
        />
      </div>

      {/* Surperformance benchmark */}
      {global?.benchmarkOutperformance != null && (
        <div className={`rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1 ${
          global.benchmarkOutperformance >= 0
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {global.benchmarkOutperformance >= 0 ? '✓ Surperformance' : '✗ Sous-performance'} vs benchmark {global.benchmarkRate} %/an :
          {' '}{pct0(global.benchmarkOutperformance)} par an
          <InfoTooltip
            text="Surperformance = TWR du portefeuille − taux benchmark. Positif : ton portefeuille a fait mieux qu'un placement passif au taux de référence. Négatif : un ETF monde au taux saisi aurait rapporté davantage sur la période."
            width="w-80"
          />
        </div>
      )}

      {/* ── Graphique TWR ─────────────────────────────────────── */}
      {hasChart ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Évolution du rendement cumulé (TWR)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={v => `${(v * 100).toFixed(0)} %`}
                tick={{ fontSize: 11 }}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone" dataKey="Mon portefeuille"
                stroke="#4f46e5" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
              />
              {hasBenchmark && (
                <Line
                  type="monotone" dataKey="Benchmark"
                  stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 5" dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
          Graphique disponible dès que des relevés de patrimoine sont enregistrés.
        </div>
      )}

      {/* ── Tableau par catégorie ─────────────────────────────── */}
      {global?.categories?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Par catégorie</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Catégorie</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    TWR/an
                    <InfoTooltip text="Time-Weighted Return annualisé — neutralise tes versements pour mesurer la performance pure de l'actif. Comparable à un benchmark." />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    MWR/an
                    <InfoTooltip text="Money-Weighted Return annualisé (XIRR) — tient compte du timing de tes versements. Reflète le rendement que tu as réellement obtenu compte tenu de quand tu as mis l'argent." />
                  </th>
                  {['Investi', 'Valeur actuelle', 'Plus-value', 'Revenus'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {global.categories.map(cat => (
                  <tr key={cat.category} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                      {CATEGORY_LABELS[cat.category] ?? cat.category}
                    </td>
                    <td className="px-4 py-3"><PerformanceBadge value={cat.twrAnnualized} category={cat.category} /></td>
                    <td className="px-4 py-3"><PerformanceBadge value={cat.mwrAnnualized} category={cat.category} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 amount">{eur(cat.totalInvestedEur)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 amount">{eur(cat.currentValueEur)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold amount ${Number(cat.absoluteGainEur) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Number(cat.absoluteGainEur) >= 0 ? '+' : ''}{eur(cat.absoluteGainEur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-indigo-600 dark:text-indigo-400 amount">{eur(cat.dividendsAndInterestsEur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tableau par position (regroupé par catégorie) ────── */}
      {positions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Par position</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Position</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    TWR/an
                    <InfoTooltip text="Time-Weighted Return annualisé — neutralise tes versements pour mesurer la performance pure de l'actif. Comparable à un benchmark." />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    MWR/an
                    <InfoTooltip text="Money-Weighted Return annualisé (XIRR) — tient compte du timing de tes versements. Reflète le rendement que tu as réellement obtenu compte tenu de quand tu as mis l'argent." />
                  </th>
                  {['Investi', 'Valeur', 'Gain'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map(cat => {
                  const catPositions = positionsByCategory[cat]
                  const catStats = global?.categories?.find(c => c.category === cat)
                  return [
                    /* Ligne d'en-tête de catégorie */
                    <tr key={`cat-${cat}`} className="bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-800">
                      <td className="px-4 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                        {CATEGORY_LABELS[cat] ?? cat}
                        <span className="ml-2 font-normal text-indigo-500 dark:text-indigo-400">
                          ({catPositions.length} position{catPositions.length > 1 ? 's' : ''})
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {catStats && <PerformanceBadge value={catStats.twrAnnualized} category={cat} />}
                      </td>
                      <td className="px-4 py-2">
                        {catStats && <PerformanceBadge value={catStats.mwrAnnualized} category={cat} />}
                      </td>
                      <td className="px-4 py-2 text-xs text-indigo-600 dark:text-indigo-400 amount">
                        {catStats ? eur(catStats.totalInvestedEur) : ''}
                      </td>
                      <td className="px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 amount">
                        {catStats ? eur(catStats.currentValueEur) : ''}
                      </td>
                      <td className={`px-4 py-2 text-xs font-semibold amount ${Number(catStats?.absoluteGainEur) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {catStats ? (Number(catStats.absoluteGainEur) >= 0 ? '+' : '') + eur(catStats.absoluteGainEur) : ''}
                      </td>
                    </tr>,
                    /* Lignes de positions (triées par TWR décroissant) */
                    ...catPositions.map(pos => (
                      <tr key={pos.positionId} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3 pl-7 text-sm font-medium text-gray-800 dark:text-gray-200">
                          {pos.label}
                          {pos.status === 'CLOSED' && (
                            <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">clôturée</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><PerformanceBadge value={pos.twrAnnualized} category={pos.category} /></td>
                        <td className="px-4 py-3"><PerformanceBadge value={pos.mwrAnnualized} category={pos.category} /></td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 amount">{eur(pos.investedEur)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 amount">{eur(pos.currentValueEur)}</td>
                        <td className={`px-4 py-3 text-sm font-semibold amount ${Number(pos.gainEur) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {Number(pos.gainEur) >= 0 ? '+' : ''}{eur(pos.gainEur)}
                        </td>
                      </tr>
                    ))
                  ]
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cas vide */}
      {!loading && positions.length === 0 && global?.warning && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center text-gray-400 dark:text-gray-500">
          <p className="text-lg mb-2">Aucune donnée de performance</p>
          <p className="text-sm">Ajoutez des positions (Bourse, Crypto, Immo papier, Livret) et enregistrez des ordres pour voir apparaître votre performance.</p>
        </div>
      )}
    </div>
  )
}
