import { useState, useEffect } from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import { updateSafetyNet } from '../../api/auth'
import { getExpenseSummary } from '../../api/expenses'
import { getSalaryContracts } from '../../api/income'
import { computeSafetyNetTarget, computeMonthlyReferenceNet } from '../../utils/safetyNet'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function FieldTooltip({ text }) {
  return (
    <span className="relative group ml-1.5 cursor-help inline-flex items-center">
      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 text-xs text-white bg-gray-800 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-lg leading-relaxed">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </span>
    </span>
  )
}

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
  const { trackEvent } = useAnalytics()
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
      trackEvent('FORM_SUBMIT', 'auth.profile.update_safety_net')
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
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          Mode de calcul
          <FieldTooltip text="Détermine comment l'objectif de matelas est calculé. Il est comparé à la somme de vos Livrets et Liquidités dans le widget Matelas de sécurité (tableau de bord), le simulateur de crise et le score patrimonial (axe Matelas)." />
        </label>
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
          <label className="text-sm font-semibold text-gray-700 flex items-center">
            Nombre de mois
            <FieldTooltip text="Multiplié par votre référence mensuelle (dépenses ou salaire net) pour calculer l'objectif. La règle courante est 3 à 6 mois. Affiché dans le widget Matelas de sécurité et le simulateur de crise." />
          </label>
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
          <label className="text-sm font-semibold text-gray-700 flex items-center">
            Montant cible
            <FieldTooltip text="Seuil fixe comparé à la somme de vos Livrets + Liquidités. Affiché dans le widget Matelas de sécurité (tableau de bord) et utilisé dans le simulateur de crise pour évaluer votre résilience financière." />
          </label>
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
              {mode === 'MONTHS_SALARY'   && (() => {
                const ref        = computeMonthlyReferenceNet(activeContract)
                const salary     = activeContract?.monthlyNetAfterTax ?? 0
                const bonusGross = activeContract?.monthlyActiveMensuelleGross ?? 0
                const gross      = activeContract?.monthlyGrossSalary
                const netRatio   = gross > 0 && salary > 0 ? salary / gross : 0.75
                const bonusNet   = bonusGross * netRatio
                return bonusGross > 0
                  ? `${months} mois × ${fmtEur.format(ref)} (${fmtEur.format(salary)} salaire + ${fmtEur.format(bonusNet)} primes)`
                  : `${months} mois × ${fmtEur.format(ref)} de salaire net/mois`
              })()}
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
