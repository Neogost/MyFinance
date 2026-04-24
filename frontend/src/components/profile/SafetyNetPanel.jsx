import { useState, useEffect } from 'react'
import { updateSafetyNet } from '../../api/auth'
import { getExpenseSummary } from '../../api/expenses'
import { getSalaryContracts } from '../../api/income'
import { computeSafetyNetTarget } from '../../utils/safetyNet'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const MODES = [
  { value: 'MONTHS_EXPENSES', label: 'Mois de dépenses', hint: 'Couvre N mois de charges récurrentes' },
  { value: 'MONTHS_SALARY',   label: 'Mois de salaire',  hint: 'Couvre N mois de salaire net' },
  { value: 'FIXED_AMOUNT',    label: 'Montant fixe',     hint: 'Seuil défini librement en €' },
]

export default function SafetyNetPanel({ user, onUpdate }) {
  const [mode,    setMode]    = useState(user.safetyNetMode ?? '')
  const [months,  setMonths]  = useState(user.safetyNetMonths ?? '')
  const [amount,  setAmount]  = useState(user.safetyNetAmount ?? '')
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  const [expensesSummary, setExpensesSummary] = useState(null)
  const [activeContract,  setActiveContract]  = useState(null)
  const [contractsLoaded, setContractsLoaded] = useState(false)

  useEffect(() => {
    getExpenseSummary().then(setExpensesSummary).catch(() => {})
    getSalaryContracts().then(contracts => {
      setActiveContract(contracts.find(c => c.endDate == null) ?? null)
      setContractsLoaded(true)
    }).catch(() => { setContractsLoaded(true) })
  }, [])

  const previewUser = {
    safetyNetMode:   mode || null,
    safetyNetMonths: parseFloat(months) || 0,
    safetyNetAmount: parseFloat(amount) || 0,
  }
  const previewTarget = computeSafetyNetTarget(previewUser, expensesSummary, activeContract)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const payload = {
        safetyNetMode:   mode || null,
        safetyNetMonths: (mode === 'MONTHS_EXPENSES' || mode === 'MONTHS_SALARY') ? (parseFloat(months) || null) : null,
        safetyNetAmount: mode === 'FIXED_AMOUNT' ? (parseFloat(amount) || null) : null,
      }
      const updated = await updateSafetyNet(payload)
      onUpdate?.(updated)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Impossible d\'enregistrer les paramètres.')
    } finally {
      setSaving(false)
    }
  }

  // Message d'avertissement quand l'aperçu ne peut pas être calculé
  const warningMessage = (() => {
    if (!mode || previewTarget != null) return null
    if (mode === 'MONTHS_EXPENSES') {
      const hasMonths = parseFloat(months) > 0
      if (!hasMonths) return null // l'utilisateur n'a pas encore saisi les mois
      return 'Aucune dépense récurrente saisie — renseignez vos charges pour calculer l\'objectif.'
    }
    if (mode === 'MONTHS_SALARY') {
      const hasMonths = parseFloat(months) > 0
      if (!hasMonths || !contractsLoaded) return null
      if (!activeContract) return 'Aucun contrat salarial actif — renseignez votre contrat pour calculer l\'objectif.'
      return 'Profil fiscal incomplet — renseignez votre profil fiscal pour calculer l\'objectif net d\'impôt.'
    }
    if (mode === 'FIXED_AMOUNT') {
      return parseFloat(amount) > 0 ? null : 'Saisissez un montant cible pour voir l\'aperçu.'
    }
    return null
  })()

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-8">
      <h3 className="text-base font-semibold text-gray-800 mb-1">Matelas de sécurité</h3>
      <p className="text-sm text-gray-500 mb-6">
        Définissez votre objectif de réserve de liquidités. Il sera comparé à la somme de vos Livrets et Liquidités.
      </p>

      {/* Sélecteur de mode */}
      <div className="flex flex-col gap-2 mb-5">
        <label className="text-sm font-semibold text-gray-700">Mode de calcul</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MODES.map(m => (
            <button key={m.value}
              onClick={() => { setMode(m.value); setSuccess(false) }}
              className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition ${
                mode === m.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}>
              <span className="text-xs font-semibold">{m.label}</span>
              <span className="text-xs text-gray-400 mt-0.5 leading-tight">{m.hint}</span>
            </button>
          ))}
        </div>
        {mode && (
          <button onClick={() => { setMode(''); setSuccess(false) }}
            className="text-xs text-gray-400 hover:text-gray-600 self-start mt-1">
            Supprimer la configuration
          </button>
        )}
      </div>

      {/* Champ conditionnel */}
      {(mode === 'MONTHS_EXPENSES' || mode === 'MONTHS_SALARY') && (
        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-sm font-semibold text-gray-700">Nombre de mois</label>
          <div className="relative w-40">
            <input
              type="number" min="1" step="0.5"
              value={months}
              onChange={e => { setMonths(e.target.value); setSuccess(false) }}
              placeholder="ex : 3"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">mois</span>
          </div>
        </div>
      )}

      {mode === 'FIXED_AMOUNT' && (
        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-sm font-semibold text-gray-700">Montant cible</label>
          <div className="relative w-52">
            <input
              type="number" min="0" step="500"
              value={amount}
              onChange={e => { setAmount(e.target.value); setSuccess(false) }}
              placeholder="ex : 10000"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
          </div>
        </div>
      )}

      {/* Aperçu */}
      {mode && previewTarget != null && (
        <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-lg mb-5">
          <span className="text-lg">🎯</span>
          <div>
            <p className="text-sm font-semibold text-indigo-800">Objectif calculé : {fmtEur.format(previewTarget)}</p>
            <p className="text-xs text-indigo-500 mt-0.5">
              {mode === 'MONTHS_EXPENSES' && `${months} mois × ${fmtEur.format(expensesSummary?.totalMonthlyExpenses ?? 0)} de dépenses/mois`}
              {mode === 'MONTHS_SALARY'   && `${months} mois × ${fmtEur.format(activeContract?.monthlyNetAfterTax ?? 0)} de salaire net/mois`}
              {mode === 'FIXED_AMOUNT'    && 'Montant fixe défini manuellement'}
            </p>
          </div>
        </div>
      )}

      {warningMessage && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5">
          {warningMessage}
        </p>
      )}

      {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">Paramètres enregistrés.</p>}

      <button onClick={handleSave} disabled={saving}
        className="py-2.5 px-6 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}
