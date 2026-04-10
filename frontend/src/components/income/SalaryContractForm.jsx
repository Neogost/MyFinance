import { useState, useEffect } from 'react'

const EMPTY = {
  startDate: '', endDate: '', annualGrossSalary: '',
  paidMonthsPerYear: '12', weeklyHours: '35',
  mealVoucherAmount: '0', mealVoucherEmployeeRate: '50',
  isCadre: false, employeePrevoyanceRate: '',
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

export default function SalaryContractForm({ contract, onSubmit, onCancel }) {
  const isEdit = Boolean(contract)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (contract) {
      setForm({
        startDate:               contract.startDate             ?? '',
        endDate:                 contract.endDate               ?? '',
        annualGrossSalary:       contract.annualGrossSalary     ?? '',
        paidMonthsPerYear:       contract.paidMonthsPerYear     ?? '12',
        weeklyHours:             contract.weeklyHours           ?? '35',
        mealVoucherAmount:       contract.mealVoucherAmount     ?? '0',
        mealVoucherEmployeeRate: contract.mealVoucherEmployeeRate ?? '50',
        isCadre:                 contract.isCadre               ?? false,
        employeePrevoyanceRate:  contract.employeePrevoyanceRate != null
          ? (contract.employeePrevoyanceRate * 100).toFixed(2)
          : '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [contract])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        startDate:               form.startDate   || null,
        endDate:                 form.endDate     || null,
        annualGrossSalary:       parseFloat(form.annualGrossSalary),
        paidMonthsPerYear:       parseInt(form.paidMonthsPerYear, 10),
        weeklyHours:             parseFloat(form.weeklyHours),
        mealVoucherAmount:       parseFloat(form.mealVoucherAmount),
        mealVoucherEmployeeRate: parseFloat(form.mealVoucherEmployeeRate),
        isCadre:                 form.isCadre,
        employeePrevoyanceRate:  form.employeePrevoyanceRate !== ''
          ? parseFloat(form.employeePrevoyanceRate) / 100
          : null,
      })
    } catch (err) {
      const status = err.response?.status
      setError(status === 409
        ? 'Un contrat actif existe déjà. Clôturez-le avant d\'en créer un nouveau.'
        : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier le contrat' : 'Nouveau contrat salarial'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date de début *</label>
              <input name="startDate" type="date" value={form.startDate} onChange={handleChange} required className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date de fin <span className="text-gray-400 font-normal">(vide = actif)</span></label>
              <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Salaire brut annuel (€) *</label>
            <input name="annualGrossSalary" type="number" min="0" step="100" value={form.annualGrossSalary} onChange={handleChange} required placeholder="45000" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Mois de paie / an *</label>
              <select name="paidMonthsPerYear" value={form.paidMonthsPerYear} onChange={handleChange} className={inputCls}>
                <option value="12">12 mois</option>
                <option value="13">13 mois</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Heures / semaine *</label>
              <input name="weeklyHours" type="number" min="1" max="60" step="0.5" value={form.weeklyHours} onChange={handleChange} required className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Ticket restaurant (€)</label>
              <input name="mealVoucherAmount" type="number" min="0" step="0.01" value={form.mealVoucherAmount} onChange={handleChange} placeholder="9.50" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Part salarié (%)</label>
              <input name="mealVoucherEmployeeRate" type="number" min="0" max="100" step="1" value={form.mealVoucherEmployeeRate} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          {/* ── Statut cadre + prévoyance ─────────────────────── */}
          <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cotisations salariales</p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox" name="isCadre"
                checked={form.isCadre}
                onChange={handleChange}
                className="accent-indigo-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">Statut cadre <span className="text-gray-400 font-normal">(APEC applicable)</span></span>
            </label>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                Prévoyance / mutuelle salarié (%)
                <span className="text-gray-400 font-normal ml-1">— optionnel</span>
              </label>
              <input
                name="employeePrevoyanceRate" type="number"
                min="0" max="10" step="0.01"
                value={form.employeePrevoyanceRate}
                onChange={handleChange}
                placeholder="1.50"
                className={inputCls}
              />
              <p className="text-xs text-gray-400">Taux en % (ex : 1.5 = 1,5% du brut). Varie selon votre convention collective.</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
