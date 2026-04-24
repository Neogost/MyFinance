import { useState } from 'react'
import { updateInstrumentSectorAllocations } from '../../api/patrimoine'

export default function AdminSectorAllocationModal({ instrument, onSave, onCancel }) {
  const [rows, setRows] = useState(
    instrument.sectorAllocation?.length
      ? instrument.sectorAllocation.map(a => ({ sector: a.sector, percentage: String(a.percentage) }))
      : [{ sector: '', percentage: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const total   = rows.reduce((s, r) => s + (parseFloat(r.percentage) || 0), 0)
  const totalOk = Math.abs(total - 100) < 0.1

  function setRow(i, field, value) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function addRow() {
    setRows(rs => [...rs, { sector: '', percentage: '' }])
  }

  function removeRow(i) {
    setRows(rs => rs.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    const entries = rows
      .filter(r => r.sector.trim())
      .map(r => ({ sector: r.sector.trim(), percentage: parseFloat(r.percentage) || 0 }))

    setSaving(true)
    setError(null)
    try {
      const saved = await updateInstrumentSectorAllocations(instrument.id, entries)
      onSave(instrument.id, saved)
    } catch {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[90vh]">

        {/* En-tête */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Répartition sectorielle</h2>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{instrument.name}</p>
        </div>

        {/* Corps */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {error && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Secteur"
                  value={row.sector}
                  onChange={e => setRow(i, 'sector', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="number"
                  placeholder="%"
                  min="0"
                  max="100"
                  step="0.01"
                  value={row.percentage}
                  onChange={e => setRow(i, 'percentage', e.target.value)}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Ajouter un secteur
          </button>

          <div className={`mt-4 text-sm font-semibold ${totalOk ? 'text-emerald-600' : 'text-orange-500'}`}>
            Total : {total.toFixed(2)} %{!totalOk && ' (devrait être 100 %)'}
          </div>
        </div>

        {/* Pied */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
