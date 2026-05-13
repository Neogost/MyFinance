import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { getExchangeRateHistory, upsertExchangeRateHistory, deleteExchangeRateHistory } from '../../api/patrimoine'
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
    const prev = new Date(entries[i - 1].rateDate)
    const curr = new Date(entries[i].rateDate)
    const days = Math.round((curr - prev) / 86400000)
    if (days > GAP_DAYS) gaps.push({ from: entries[i - 1].rateDate, to: entries[i].rateDate, days })
  }
  return gaps
}

function fmtRate(val) {
  if (val == null) return '—'
  return parseFloat(val).toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
}

const SOURCE_COLORS = {
  ECB:         'bg-indigo-100 text-indigo-700',
  FRANKFURTER: 'bg-blue-100 text-blue-700',
  MANUAL:      'bg-violet-100 text-violet-700',
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { rateDate, rate } = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{rateDate}</p>
      <p className="text-indigo-700 font-bold">{fmtRate(rate)}</p>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ExchangeRateHistoryModal({ currency, onClose }) {
  const def = defaultRange()
  const [pending, setPending] = useState({ from: def.from, to: def.to })
  const [from,    setFrom]    = useState(def.from)
  const [to,      setTo]      = useState(def.to)

  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [dirty,    setDirty]    = useState(false)

  const [editDate,  setEditDate]  = useState(null)
  const [editRate,  setEditRate]  = useState('')
  const [saving,    setSaving]    = useState(false)

  const [newDate, setNewDate] = useState('')
  const [newRate, setNewRate] = useState('')

  const load = useCallback(async (f, t) => {
    setLoading(true)
    setError(null)
    try {
      setEntries(await getExchangeRateHistory(currency, f, t))
    } catch {
      setError('Impossible de charger l\'historique.')
    } finally {
      setLoading(false)
    }
  }, [currency])

  useEffect(() => { load(from, to) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const gaps = useMemo(() => detectGaps(entries), [entries])

  // Données graphique : rate converti en float pour Recharts
  const chartData = useMemo(() => entries.map(e => ({
    rateDate: e.rateDate,
    rate:     parseFloat(e.rate),
  })), [entries])

  const n = chartData.length
  const tickInterval = n > 300 ? Math.floor(n / 20) : n > 100 ? Math.floor(n / 12) : n > 30 ? 7 : 1
  const ticks = chartData
    .filter((_, i) => i % tickInterval === 0 || i === n - 1)
    .map(p => p.rateDate)

  // Domaine Y adaptatif avec 10% de marge
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto']
    const rates = chartData.map(d => d.rate)
    const min = Math.min(...rates)
    const max = Math.max(...rates)
    const pad = (max - min) * 0.1 || 0.001
    return [
      parseFloat((min - pad).toFixed(6)),
      parseFloat((max + pad).toFixed(6)),
    ]
  }, [chartData])

  function handleLoad() {
    setFrom(pending.from)
    setTo(pending.to)
    load(pending.from, pending.to)
  }

  async function startEdit(entry) {
    setEditDate(entry.rateDate)
    setEditRate(parseFloat(entry.rate).toString())
  }

  async function confirmEdit() {
    if (!editRate || isNaN(parseFloat(editRate))) return
    setSaving(true)
    try {
      await upsertExchangeRateHistory(currency, editDate, parseFloat(editRate))
      setEntries(es => es.map(e => e.rateDate === editDate
        ? { ...e, rate: parseFloat(editRate), source: 'MANUAL' } : e))
      setDirty(true)
      setEditDate(null)
    } finally { setSaving(false) }
  }

  async function handleDelete(date) {
    if (!window.confirm(`Supprimer le taux du ${date} ?`)) return
    await deleteExchangeRateHistory(currency, date)
    setEntries(es => es.filter(e => e.rateDate !== date))
    setDirty(true)
  }

  async function handleAdd() {
    if (!newDate || !newRate || isNaN(parseFloat(newRate))) return
    setSaving(true)
    try {
      await upsertExchangeRateHistory(currency, newDate, parseFloat(newRate))
      const newEntry = { currency, rateDate: newDate, rate: parseFloat(newRate), source: 'MANUAL' }
      setEntries(es => [...es, newEntry].sort((a, b) => a.rateDate.localeCompare(b.rateDate)))
      setNewDate(''); setNewRate('')
      setDirty(true)
    } finally { setSaving(false) }
  }

  const tableEntries = useMemo(() => [...entries].reverse(), [entries])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Historique des taux</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {currency}/EUR
              <span className="ml-1.5 text-xs text-gray-400">— Convention : 1 EUR = X {currency}</span>
            </p>
          </div>
          <button onClick={() => onClose(dirty)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── Sélecteur de plage ── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Début</label>
                <DateInput value={pending.from} onChange={val => setPending(p => ({ ...p, from: val }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fin</label>
                <DateInput value={pending.to} onChange={val => setPending(p => ({ ...p, to: val }))} />
              </div>
            </div>
            <button onClick={handleLoad} disabled={loading}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition shrink-0">
              {loading ? '…' : 'Charger'}
            </button>
            {!loading && (
              <p className="text-xs text-gray-400">
                {entries.length} entrée{entries.length !== 1 ? 's' : ''}
                {entries.length > 0 && ` · ${entries[0].rateDate} → ${entries[entries.length - 1].rateDate}`}
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
                  <XAxis dataKey="rateDate" ticks={ticks}
                    tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis domain={yDomain}
                    tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                    width={60}
                    tickFormatter={v => parseFloat(v).toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="rate"
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
              <label className="block text-xs text-gray-500 mb-1">Taux (unités/{currency} pour 1 EUR)</label>
              <input type="number" step="any" min="0" placeholder="1.08" value={newRate}
                onChange={e => setNewRate(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={handleAdd} disabled={saving || !newDate || !newRate}
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
                      <th className="text-right py-2 px-3 font-medium">Taux</th>
                      <th className="text-center py-2 px-3 font-medium">Source</th>
                      <th className="py-2 px-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {tableEntries.map(entry => (
                      <tr key={entry.rateDate} className="border-t border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-2 px-3 font-mono text-gray-700">{entry.rateDate}</td>
                        <td className="py-2 px-3 text-right">
                          {editDate === entry.rateDate ? (
                            <input type="number" step="any" min="0" value={editRate}
                              onChange={e => setEditRate(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmEdit()
                                if (e.key === 'Escape') setEditDate(null)
                              }}
                              autoFocus
                              className="border border-indigo-400 rounded px-2 py-0.5 w-28 text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 text-xs" />
                          ) : (
                            <span className="font-semibold text-gray-900 tabular-nums">{fmtRate(entry.rate)}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${SOURCE_COLORS[entry.source] ?? 'bg-gray-100 text-gray-600'}`}>
                            {entry.source}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {editDate === entry.rateDate ? (
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
                              <button onClick={() => handleDelete(entry.rateDate)} title="Supprimer"
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
