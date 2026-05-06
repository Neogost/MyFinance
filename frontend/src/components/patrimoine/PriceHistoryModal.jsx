import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Brush,
} from 'recharts'
import { getInstrumentPriceHistory, getInstrumentOrderMarkers } from '../../api/patrimoine'
import { useAnalytics } from '../../hooks/useAnalytics'

const PERIODS = [
  { label: '6 mois', months: 6 },
  { label: '1 an',   months: 12 },
  { label: '2 ans',  months: 24 },
  { label: '5 ans',  months: 60 },
  { label: 'Tout',   months: null },
]

function fmtPrice(v, currency = 'EUR', digits = 2) {
  if (v == null) return '—'
  return Number(v).toLocaleString('fr-FR', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }) + (currency === 'EUR' ? ' €' : ` ${currency}`)
}

function fmtPct(v) {
  if (v == null) return '—'
  return (v >= 0 ? '+' : '') + Number(v).toLocaleString('fr-FR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) + ' %'
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateShort(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

// ── Tooltip enrichi ─────────────────────────────────────────────

function CustomTooltip({ active, payload, label, currency, displayMode, pru, units, markers }) {
  if (!active || !payload?.length) return null
  const raw = payload[0]?.payload
  const price = raw?.price
  // label = displayDate (date snappée au cours) ; m.date = date réelle de l'ordre
  const marker = markers?.find(m => (m.displayDate ?? m.date) === label)

  const latentPv = displayMode === 'price' && pru && units > 0 && price != null
    ? (price - pru) * units : null

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[160px]">
      <p className="text-gray-400 mb-1.5">{fmtDate(label)}</p>
      <p className="font-bold text-gray-900 text-sm">
        {displayMode === 'price' ? fmtPrice(price, currency) : fmtPct(payload[0]?.value)}
      </p>
      {pru && displayMode === 'price' && price != null && (
        <p className={`mt-0.5 ${price >= pru ? 'text-emerald-600' : 'text-red-500'}`}>
          vs PRU : {fmtPct(((price - pru) / pru) * 100)}
        </p>
      )}
      {latentPv != null && (
        <p className={`mt-0.5 font-semibold ${latentPv >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          PV latente : {fmtPrice(latentPv, 'EUR')}
        </p>
      )}
      {marker && (
        <p className={`mt-1 font-semibold ${
          marker.orderType === 'BUY'      ? 'text-indigo-600' :
          marker.orderType === 'SELL'     ? 'text-orange-600' : 'text-emerald-600'}`}>
          {marker.orderType === 'BUY'      ? '▲ Achat' :
           marker.orderType === 'SELL'     ? '▼ Vente' : '★ Revenu'} — {fmtPrice(marker.amountEur, 'EUR')}
          {marker.positions?.length > 1 && ` (${marker.positions.length} positions)`}
        </p>
      )}
    </div>
  )
}

// ── Modal principal ─────────────────────────────────────────────

export default function PriceHistoryModal({ position, onClose }) {
  const { trackEvent } = useAnalytics()
  const instrument = position.instrument
  const currency   = instrument?.currency ?? 'EUR'

  const [periodIdx,   setPeriodIdx]   = useState(() => {
    const saved = sessionStorage.getItem('patrimoine.priceHistory.period')
    return saved != null ? parseInt(saved, 10) : 2
  })
  const [displayMode, setDisplayMode] = useState('price') // 'price' | 'pct'
  const [show, setShow] = useState({ buy: true, sell: true, income: true, pru: true })

  function toggleShow(key) {
    setShow(s => ({ ...s, [key]: !s[key] }))
  }

  function handlePeriodChange(i) {
    setPeriodIdx(i)
    sessionStorage.setItem('patrimoine.priceHistory.period', String(i))
  }
  const [history,     setHistory]     = useState([])
  const [markers,     setMarkers]     = useState([]) // OrderMarkerDto[] agrégés cross-positions
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  // Tracking à l'ouverture
  useEffect(() => {
    trackEvent('FEATURE_USE', 'patrimoine.price_history.open', {
      instrument: instrument?.name,
      category: position.category,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Chargement historique + marqueurs cross-positions
  useEffect(() => {
    if (!instrument?.id) return
    setLoading(true)
    setError(null)

    const months = PERIODS[periodIdx].months
    const to     = new Date().toISOString().slice(0, 10)
    const from   = months
      ? new Date(Date.now() - months * 30.44 * 86400000).toISOString().slice(0, 10)
      : undefined

    Promise.all([
      getInstrumentPriceHistory(instrument.id, from, to),
      getInstrumentOrderMarkers(instrument.id),
    ])
      .then(([hist, orderMarkers]) => {
        setHistory(hist)
        // Regrouper les marqueurs par date (plusieurs positions possible le même jour)
        const byDate = {}
        orderMarkers.forEach(m => {
          if (!byDate[m.date]) byDate[m.date] = { ...m, positions: [m.positionLabel] }
          else {
            byDate[m.date].amountEur = (parseFloat(byDate[m.date].amountEur) + parseFloat(m.amountEur)).toFixed(2)
            byDate[m.date].positions.push(m.positionLabel)
          }
        })
        setMarkers(Object.values(byDate))
      })
      .catch(() => setError('Impossible de charger l\'historique.'))
      .finally(() => setLoading(false))
  }, [instrument?.id, periodIdx])

  // Données brutes du graphique
  const chartData = history.map(p => ({ date: p.date, price: parseFloat(p.price) }))

  // Toggle % — variation depuis le premier point affiché
  const firstPrice = chartData[0]?.price
  const displayData = chartData.map(d => ({
    ...d,
    value: displayMode === 'pct' && firstPrice
      ? ((d.price - firstPrice) / firstPrice) * 100
      : d.price,
  }))

  // Snap d'un ordre à la date de cours la plus proche dans chartData
  // Nécessaire quand l'ordre tombe un week-end ou un jour férié sans cours disponible
  function snapToNearest(targetDate) {
    if (chartData.length === 0) return null
    const t = new Date(targetDate).getTime()
    return chartData.reduce((best, d) => {
      const diff = Math.abs(new Date(d.date).getTime() - t)
      return diff < Math.abs(new Date(best.date).getTime() - t) ? d : best
    }, chartData[0]).date
  }

  // Marqueurs snappés à la fenêtre affichée (garde la date réelle pour le tooltip)
  const visibleMarkers = markers
    .filter(m => {
      const mTime = new Date(m.date).getTime()
      const first = new Date(chartData[0]?.date).getTime()
      const last  = new Date(chartData[chartData.length - 1]?.date).getTime()
      return chartData.length > 0 && mTime >= first && mTime <= last
    })
    .map(m => ({ ...m, displayDate: snapToNearest(m.date) }))

  const buyMarkers    = visibleMarkers.filter(m => m.orderType === 'BUY')
  const sellMarkers   = visibleMarkers.filter(m => m.orderType === 'SELL')
  const incomeMarkers = visibleMarkers.filter(m =>
    m.orderType === 'DIVIDEND' || m.orderType === 'INTEREST')

  // Stats min / max / moyenne sur la période affichée
  const stats = chartData.length > 0 ? (() => {
    const minEntry = chartData.reduce((m, d) => d.price < m.price ? d : m, chartData[0])
    const maxEntry = chartData.reduce((m, d) => d.price > m.price ? d : m, chartData[0])
    const avg      = chartData.reduce((s, d) => s + d.price, 0) / chartData.length
    return { minEntry, maxEntry, avg }
  })() : null

  // KPIs
  const lastPoint  = chartData[chartData.length - 1]
  const variation  = firstPrice && lastPoint ? ((lastPoint.price - firstPrice) / firstPrice) * 100 : null
  const c          = position.computed ?? {}
  const units      = parseFloat(c.units ?? 0)
  const invested   = parseFloat(c.investedAmountEur ?? 0)
  const pru        = units > 0 && invested > 0 ? invested / units : null
  const current    = instrument?.lastPrice ? parseFloat(instrument.lastPrice) : lastPoint?.price
  const variFromPru = pru && current ? ((current - pru) / pru) * 100 : null
  const latentPvTotal = pru && current && units > 0 ? (current - pru) * units : null

  const hasData      = chartData.length > 0
  const tooFewPoints = chartData.length < 5

  const isPositive = variation == null || variation >= 0
  const lineColor  = isPositive ? '#4f46e5' : '#ef4444'

  const minVal = displayData.length ? Math.min(...displayData.map(d => d.value)) * 0.95 : 0
  const maxVal = displayData.length ? Math.max(...displayData.map(d => d.value)) * 1.05 : 1

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-4xl max-h-[90vh] flex flex-col">

        {/* En-tête */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{instrument?.name ?? position.label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {instrument?.isin ?? instrument?.ticker ?? '—'} · {currency}
              {markers.length > 0 && (
                <span className="ml-2 text-indigo-500">
                  · {markers.filter(m => m.orderType === 'BUY').length} achat(s) ·{' '}
                  {markers.filter(m => m.orderType === 'SELL').length} vente(s)
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Cours actuel',     value: fmtPrice(current, currency), color: 'text-gray-900' },
              { label: 'Variation période', value: fmtPct(variation),
                color: variation == null ? 'text-gray-400' : variation >= 0 ? 'text-emerald-600' : 'text-red-600' },
              { label: 'PRU (coût moyen)', value: pru ? fmtPrice(pru, currency) : '—', color: 'text-gray-900' },
              { label: 'PV latente totale',
                value: latentPvTotal != null ? fmtPrice(latentPvTotal, 'EUR') : '—',
                color: latentPvTotal == null ? 'text-gray-400' : latentPvTotal >= 0 ? 'text-emerald-600' : 'text-red-600',
                sub: variFromPru != null ? fmtPct(variFromPru) + ' vs PRU' : null },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
                {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Contrôles : période + toggle prix/% */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {PERIODS.map((p, i) => (
                <button key={p.label} onClick={() => handlePeriodChange(i)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition
                    ${i === periodIdx ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {[['price', currency], ['pct', '%']].map(([mode, label]) => (
                <button key={mode} onClick={() => setDisplayMode(mode)}
                  className={`px-3 py-1 font-semibold transition
                    ${displayMode === mode ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtres marqueurs — visibles uniquement si des marqueurs existent */}
          {visibleMarkers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'buy',    label: 'Achats',   count: buyMarkers.length,    color: 'bg-indigo-100 text-indigo-700 border-indigo-300',    dot: 'bg-indigo-500' },
                { key: 'sell',   label: 'Ventes',   count: sellMarkers.length,   color: 'bg-orange-100 text-orange-700 border-orange-300',    dot: 'bg-orange-400' },
                { key: 'income', label: 'Revenus',  count: incomeMarkers.length, color: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
              ].filter(f => f.count > 0).map(({ key, label, count, color, dot }) => (
                <button key={key} onClick={() => toggleShow(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition
                    ${show[key] ? color : 'bg-gray-100 text-gray-400 border-gray-200 line-through'}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${show[key] ? dot : 'bg-gray-300'}`} />
                  {label} ({count})
                </button>
              ))}
              {pru && displayMode === 'price' && (
                <button onClick={() => toggleShow('pru')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition
                    ${show.pru ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-gray-100 text-gray-400 border-gray-200 line-through'}`}>
                  <span className={`w-4 border-t-2 border-dashed shrink-0 ${show.pru ? 'border-violet-500' : 'border-gray-300'}`} />
                  PRU
                </button>
              )}
            </div>
          )}

          {/* Graphique */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16 text-gray-400 text-sm">Chargement…</div>
          ) : error ? (
            <p className="text-sm text-red-600 text-center py-8">{error}</p>
          ) : !hasData ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm font-medium">Aucune donnée historique</p>
              <p className="text-xs mt-1">Lancez un backfill depuis Administration → Instruments.</p>
            </div>
          ) : tooFewPoints ? (
            <div className="text-center py-8 text-amber-600 bg-amber-50 rounded-xl text-sm">
              Données insuffisantes ({chartData.length} point{chartData.length > 1 ? 's' : ''}) — essayez une période plus longue.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={lineColor} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tickFormatter={fmtDateShort}
                    tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                    interval="preserveStartEnd" />
                  <YAxis
                    tickFormatter={v => displayMode === 'pct'
                      ? (v >= 0 ? '+' : '') + v.toFixed(1) + ' %'
                      : fmtPrice(v, currency, 0)}
                    tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                    width={displayMode === 'pct' ? 56 : 80}
                    domain={[minVal, maxVal]} />

                  <Tooltip
                    content={
                      <CustomTooltip
                        currency={currency}
                        displayMode={displayMode}
                        pru={pru}
                        units={units}
                        markers={visibleMarkers}
                      />
                    }
                  />

                  {/* Ligne PRU (mode prix uniquement) */}
                  {pru && displayMode === 'price' && show.pru && (
                    <ReferenceLine y={pru} stroke="#7c3aed" strokeDasharray="4 4" strokeWidth={1.5}
                      label={{ value: 'PRU', position: 'insideTopRight', fontSize: 10, fill: '#7c3aed' }} />
                  )}

                  {/* Marqueurs achats — indigo */}
                  {show.buy && buyMarkers.map(m => (
                    <ReferenceLine key={`buy-${m.date}`} x={m.displayDate}
                      stroke="#4f46e5" strokeDasharray="3 3" strokeWidth={1.5} strokeOpacity={0.7} />
                  ))}

                  {/* Marqueurs ventes — orange */}
                  {show.sell && sellMarkers.map(m => (
                    <ReferenceLine key={`sell-${m.date}`} x={m.displayDate}
                      stroke="#f97316" strokeDasharray="3 3" strokeWidth={1.5} strokeOpacity={0.7} />
                  ))}

                  {/* Marqueurs dividendes / intérêts — vert */}
                  {show.income && incomeMarkers.map(m => (
                    <ReferenceLine key={`income-${m.date}`} x={m.displayDate}
                      stroke="#10b981" strokeDasharray="2 4" strokeWidth={1.5} strokeOpacity={0.8} />
                  ))}

                  <Area type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2}
                    fill="url(#phGradient)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />

                  {/* Brush de zoom */}
                  <Brush dataKey="date" height={18} stroke="#e5e7eb" fill="#f9fafb"
                    travellerWidth={6} tickFormatter={fmtDateShort}
                    travellerStyle={{ fill: '#6366f1', stroke: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stats min / max / moyenne */}
          {stats && !tooFewPoints && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: 'Min', entry: stats.minEntry, color: 'text-red-500' },
                { label: 'Moy', price: stats.avg,     color: 'text-gray-600' },
                { label: 'Max', entry: stats.maxEntry, color: 'text-emerald-600' },
              ].map(({ label, entry, price, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-gray-400 mb-0.5">{label}</p>
                  <p className={`font-semibold ${color}`}>
                    {fmtPrice(entry?.price ?? price, currency, 0)}
                  </p>
                  {entry && <p className="text-gray-400 text-[10px]">{fmtDate(entry.date)}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Plage et densité des données */}
          {hasData && !tooFewPoints && (
            <p className="text-xs text-gray-400 text-right">
              {fmtDate(chartData[0]?.date)} → {fmtDate(lastPoint?.date)} · {chartData.length} pts
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
