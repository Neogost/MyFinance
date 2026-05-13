import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { getPriceHistory, upsertPriceHistory, deletePriceHistory } from '../../api/patrimoine'
import DateRangeInput from '../ui/DateRangeInput'
import DateInput from '../ui/DateInput'

// ── Helpers ───────────────────────────────────────────────────────────────────

const GAP_DAYS = 7

function toIso(date) { return date.toISOString().slice(0, 10) }

function defaultRange() {
  const to   = new Date()
  const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  return { from: toIso(from), to: toIso(to) }
}

function detectGaps(entries) {
  const gaps = []
  for (let i = 1; i < entries.length; i++) {
    const prev = new Date(entries[i - 1].priceDate)
    const curr = new Date(entries[i].priceDate)
    const days = Math.round((curr - prev) / 86400000)
    if (days > GAP_DAYS) gaps.push({ from: entries[i - 1].priceDate, to: entries[i].priceDate, days })
  }
  return gaps
}

function fmtPrice(val, currency = 'EUR') {
  if (val == null) return '—'
  const sym = currency === 'EUR' ? ' €' : ` ${currency}`
  return parseFloat(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + sym
}

const SOURCE_COLORS = {
  BOURSORAMA: 'bg-indigo-100 text-indigo-700',
  COINGECKO:  'bg-orange-100 text-orange-700',
  MANUAL_CSV: 'bg-teal-100 text-teal-700',
  MANUAL:     'bg-violet-100 text-violet-700',
}

// ── Tooltip du graphique ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null
  const { priceDate, price } = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{priceDate}</p>
      <p className="text-indigo-700 font-bold">{fmtPrice(price, currency)}</p>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function PriceHistoryModal({ instrument, onClose }) {
  const def = defaultRange()
  const [from,    setFrom]    = useState(def.from)
  const [to,      setTo]      = useState(def.to)
  const [pending, setPending] = useState({ from: def.from, to: def.to })

  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [dirty,    setDirty]    = useState(false)

  // Inline edit
  const [editDate,  setEditDate]  = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [saving,    setSaving]    = useState(false)

  // Add form
  const [newDate,  setNewDate]  = useState('')
  const [newPrice, setNewPrice] = useState('')

  const load = useCallback(async (f, t) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPriceHistory(instrument.id, f, t)
      setEntries(data)
    } catch {
      setError('Impossible de charger l\'historique.')
    } finally {
      setLoading(false)
    }
  }, [instrument.id])

  useEffect(() => { load(from, to) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const gaps = useMemo(() => detectGaps(entries), [entries])

  // ── Graphique ───────────────────────────────────────────────────────────────

  const chartData = useMemo(() => entries.map(e => ({
    priceDate: e.priceDate,
    price:     parseFloat(e.price),
  })), [entries])

  const n = chartData.length
  const tickInterval = n > 300 ? Math.floor(n / 20) : n > 100 ? Math.floor(n / 12) : n > 30 ? 7 : 1
  const ticks = chartData.filter((_, i) => i % tickInterval === 0 || i === n - 1).map(p => p.priceDate)

  // ── Actions ─────────────────────────────────────────────────────────────────

  function startEdit(entry) {
    setEditDate(entry.priceDate)
    setEditPrice(parseFloat(entry.price).toString())
  }

  async function confirmEdit() {
    if (!editPrice || isNaN(parseFloat(editPrice))) return
    setSaving(true)
    try {
      const updated = await upsertPriceHistory(instrument.id, editDate, parseFloat(editPrice))
      setEntries(es => es.map(e => e.priceDate === editDate ? updated : e))
      setDirty(true)
      setEditDate(null)
    } finally { setSaving(false) }
  }

  async function handleDelete(date) {
    if (!window.confirm(`Supprimer le cours du ${date} ?`)) return
    await deletePriceHistory(instrument.id, date)
    setEntries(es => es.filter(e => e.priceDate !== date))
    setDirty(true)
  }

  async function handleAdd() {
    if (!newDate || !newPrice || isNaN(parseFloat(newPrice))) return
    setSaving(true)
    try {
      const added = await upsertPriceHistory(instrument.id, newDate, parseFloat(newPrice))
      setEntries(es => [...es, added].sort((a, b) => a.priceDate.localeCompare(b.priceDate)))
      setNewDate(''); setNewPrice('')
      setDirty(true)
    } finally { setSaving(false) }
  }

  function handleLoad() {
    setFrom(pending.from)
    setTo(pending.to)
    load(pending.from, pending.to)
  }

  // Entrées en ordre décroissant pour le tableau
  const tableEntries = useMemo(() => [...entries].reverse(), [entries])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Historique des cours</h2>
            <p className="text-sm text-gray-500 mt-0.5">{instrument.name}
              {instrument.currency && instrument.currency !== 'EUR' && (
                <span className="ml-1.5 text-xs font-mono text-gray-400">{instrument.currency}</span>
              )}
            </p>
          </div>
          <button onClick={() => onClose(dirty)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── Sélecteur de plage ── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[260px]">
              <DateRangeInput
                from={pending.from}
                to={pending.to}
                onFromChange={v => setPending(p => ({ ...p, from: v }))}
                onToChange={v => setPending(p => ({ ...p, to: v }))}
                placeholder="Sélectionner une période…"
                maxDate={new Date()}
              />
            </div>
            <button onClick={handleLoad} disabled={loading}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition shrink-0">
              {loading ? '…' : 'Charger'}
            </button>
            {!loading && (
              <p className="text-xs text-gray-400">
                {entries.length} entrée{entries.length !== 1 ? 's' : ''}
                {entries.length > 0 && ` · ${entries[0].priceDate} → ${entries[entries.length - 1].priceDate}`}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {/* ── Trous détectés ── */}
          {!loading && gaps.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs">
              <p className="font-semibold text-amber-800 mb-1.5">
                {gaps.length} trou{gaps.length > 1 ? 's' : ''} détecté{gaps.length > 1 ? 's' : ''} (&gt; {GAP_DAYS} j)
              </p>
              <ul className="space-y-0.5 text-amber-700">
                {gaps.slice(0, 8).map((g, i) => (
                  <li key={i}>• {g.from} → {g.to} ({g.days} jours)</li>
                ))}
                {gaps.length > 8 && <li className="italic">… et {gaps.length - 8} autres</li>}
              </ul>
            </div>
          )}

          {/* ── Graphique ── */}
          {!loading && chartData.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="priceDate" ticks={ticks}
                    tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                    width={55} tickFormatter={v => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} />
                  <Tooltip content={<ChartTooltip currency={instrument.currency} />} />
                  <Line type="monotone" dataKey="price"
                    stroke="#4f46e5" strokeWidth={1.5} dot={false}
                    activeDot={{ r: 3, fill: '#4f46e5' }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Formulaire d'ajout ── */}
          <div className="flex flex-wrap items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <DateInput value={newDate} onChange={setNewDate} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Prix {instrument.currency && instrument.currency !== 'EUR' ? `(${instrument.currency})` : '(€)'}
              </label>
              <input type="number" step="0.0001" min="0" placeholder="0.00" value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={handleAdd} disabled={saving || !newDate || !newPrice}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
              + Ajouter
            </button>
          </div>

          {/* ── Tableau ── */}
          {!loading && (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              {tableEntries.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Aucune entrée sur cette période</p>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-right py-2 px-3 font-medium">Prix</th>
                      <th className="text-center py-2 px-3 font-medium">Source</th>
                      <th className="py-2 px-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {tableEntries.map(entry => (
                      <tr key={entry.priceDate} className="border-t border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-2 px-3 font-mono text-gray-700">{entry.priceDate}</td>

                        {/* Prix — inline edit ou affichage */}
                        <td className="py-2 px-3 text-right">
                          {editDate === entry.priceDate ? (
                            <input
                              type="number" step="0.0001" min="0"
                              value={editPrice}
                              onChange={e => setEditPrice(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmEdit()
                                if (e.key === 'Escape') setEditDate(null)
                              }}
                              autoFocus
                              className="border border-indigo-400 rounded px-2 py-0.5 w-28 text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 text-xs"
                            />
                          ) : (
                            <span className="font-semibold text-gray-900 tabular-nums">
                              {fmtPrice(entry.price, instrument.currency)}
                            </span>
                          )}
                        </td>

                        {/* Source badge */}
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${SOURCE_COLORS[entry.source] ?? 'bg-gray-100 text-gray-600'}`}>
                            {entry.source}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3">
                          {editDate === entry.priceDate ? (
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={confirmEdit} disabled={saving}
                                className="text-emerald-600 hover:text-emerald-700 font-bold px-1">✓</button>
                              <button onClick={() => setEditDate(null)}
                                className="text-gray-400 hover:text-gray-600 px-1">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 justify-end">
                              <button onClick={() => startEdit(entry)} title="Modifier"
                                className="text-gray-400 hover:text-indigo-600 transition">✏</button>
                              <button onClick={() => handleDelete(entry.priceDate)} title="Supprimer"
                                className="text-gray-300 hover:text-red-500 transition">🗑</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
