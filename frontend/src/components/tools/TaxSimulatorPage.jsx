import { useState, useEffect } from 'react'
import { getOtherIncomes } from '../../api/income'
import { simulateTax } from '../../api/tools'
import { inputCls } from '../../components/common/formStyles.js'
import { useAnalytics } from '../../hooks/useAnalytics'

const CURRENT_YEAR = new Date().getFullYear()

const SOURCE_OPTIONS = [
  { value: 'PROJECTION_CONTRAT', label: 'Projection du contrat salarial' },
  { value: 'BULLETINS_REELS',    label: 'Bulletins de paie réels' },
]

function fmt(amount) {
  if (amount == null) return '—'
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function ResultRow({ label, value, highlight, valueClass }) {
  return (
    <tr className={highlight ? 'bg-indigo-50 font-semibold' : 'border-t border-gray-100'}>
      <td className="py-2.5 pr-6 pl-1 text-sm text-gray-600">{label}</td>
      <td className={`py-2.5 pr-1 text-right text-sm amount ${valueClass ?? 'text-gray-900'}`}>{value}</td>
    </tr>
  )
}

export default function TaxSimulatorPage() {
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('tools.tax_simulator') }, [])
  const [year, setYear]               = useState(CURRENT_YEAR)
  const [salarySource, setSalarySource] = useState('PROJECTION_CONTRAT')
  const [allIncomes, setAllIncomes]   = useState([])
  const [checkedIds, setCheckedIds]   = useState(new Set())
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)

  // Revenus complémentaires imposables pour l'année sélectionnée
  const taxableIncomes = allIncomes.filter(i =>
    i.isTaxable !== false && i.date?.startsWith(String(year))
  )

  useEffect(() => {
    getOtherIncomes().then(setAllIncomes).catch(() => {})
  }, [])

  // Tout cocher par défaut quand l'année ou les revenus changent
  useEffect(() => {
    setCheckedIds(new Set(taxableIncomes.map(i => i.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, allIncomes])

  function toggleIncome(id) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSimulate() {
    setError(null)
    setLoading(true)
    setResult(null)
    try {
      const includedIncomes = [...checkedIds]
      const res = await simulateTax({ year, salarySource, includedIncomes })
      setResult(res)
      trackEvent('FEATURE_USE', 'tools.tax_simulator.simulate')
    } catch (err) {
      setError(err.response?.data?.message ?? 'Une erreur est survenue. Vérifiez que votre contrat ou vos bulletins sont renseignés.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Simulateur des impôts</h2>

      {/* ── Paramètres ── */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-5">Paramètres de simulation</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Année */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Année fiscale</label>
            <input
              type="number" min="2020" max={CURRENT_YEAR}
              value={year}
              onChange={e => { setYear(parseInt(e.target.value, 10)); setResult(null) }}
              className={inputCls}
            />
          </div>

          {/* Source salariale */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Source des revenus salariaux</label>
            {SOURCE_OPTIONS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio" name="salarySource" value={value}
                  checked={salarySource === value}
                  onChange={() => { setSalarySource(value); setResult(null) }}
                  className="accent-indigo-600"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Revenus complémentaires à inclure */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            Revenus complémentaires imposables ({year})
          </label>
          {taxableIncomes.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">
              Aucun revenu complémentaire imposable pour {year}.
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {taxableIncomes.map(income => (
                <label key={income.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(income.id)}
                    onChange={() => toggleIncome(income.id)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700 flex-1">{income.label}</span>
                  {income.specificTaxRate != null && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:text-orange-300">
                      Taux fixe {income.specificTaxRate}%
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-900 tabular-nums amount">
                    {income.amount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleSimulate}
          disabled={loading}
          className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Calcul en cours…' : 'Simuler mon imposition'}
        </button>
      </div>

      {/* ── Résultats ── */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-5">
            Résultats — Année {result.year}
          </h3>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div className="bg-indigo-50 rounded-xl p-3 md:p-5 text-center">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1 leading-tight">Impôt annuel</p>
              <p className="text-lg md:text-2xl font-bold text-indigo-700 amount">{fmt(result.totalEstimatedTax)}</p>
            </div>
            <div className="bg-indigo-100 rounded-xl p-3 md:p-5 text-center">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1 leading-tight">Impôt mensuel</p>
              <p className="text-lg md:text-2xl font-bold text-indigo-800 amount">{fmt(result.totalEstimatedTax / 12)}</p>
              <p className="hidden md:block text-xs text-indigo-400 mt-1">÷ 12 mois</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 md:p-5 text-center">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1 leading-tight">Taux effectif</p>
              <p className="text-lg md:text-2xl font-bold text-indigo-700 amount">{result.effectiveTaxRate?.toFixed(2)} %</p>
            </div>
          </div>

          {/* Détail du calcul */}
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              <ResultRow
                label="Source salariale"
                value={SOURCE_OPTIONS.find(o => o.value === result.salaryIncomeSource)?.label ?? result.salaryIncomeSource}
              />
              <ResultRow label="Revenus salariaux" value={fmt(result.salaryIncome)} />
              <ResultRow label="Revenus complémentaires (barème)" value={fmt(result.otherIncomeInBareme)} />
              <ResultRow label="Revenus à taux fixe" value={fmt(result.otherIncomeSeparatelyTaxed)} />
              <ResultRow label="Revenu brut imposable" value={fmt(result.grossTaxableIncome)} highlight />
              <ResultRow
                label={`Abattement (${result.deductionType === 'FORFAITAIRE_10_POURCENT' ? 'forfaitaire 10%' : 'frais réels'})`}
                value={`− ${fmt(result.professionalDeduction)}`}
              />
              <ResultRow label="Revenu net imposable (barème)" value={fmt(result.netTaxableIncome)} highlight />
              <ResultRow label="Quotient familial (parts)" value={result.fiscalParts} />
              <ResultRow label="Impôt au barème progressif" value={fmt(result.baremeEstimatedTax)} />
              {result.decoteAmount > 0 && (
                <ResultRow
                  label="Décote appliquée (bas revenus)"
                  value={`− ${fmt(result.decoteAmount)}`}
                  valueClass="text-emerald-600 font-semibold"
                />
              )}
              <ResultRow label="Impôt à taux fixe" value={fmt(result.separateTaxAmount)} />
              <ResultRow label="Impôt total estimé (annuel)" value={fmt(result.totalEstimatedTax)} highlight />
              <ResultRow label="Impôt mensuel estimé" value={fmt(result.totalEstimatedTax / 12)} highlight />
              <ResultRow label="Taux effectif d'imposition" value={`${result.effectiveTaxRate?.toFixed(2)} %`} highlight />
            </tbody>
          </table>
          </div>

          <p className="text-xs text-gray-400 mt-5 leading-relaxed">
            Simulation non contractuelle basée sur le barème {result.year}.
            Ne prend pas en compte les réductions, crédits d'impôt ou prélèvements sociaux.
          </p>
        </div>
      )}
      <TaxExplainer />
    </div>
  )
}

function TaxExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-10 border-t border-gray-200 pt-6">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition w-full text-left">
        <span className="text-base">{open ? '▲' : '▼'}</span>
        Comment ça marche ? Comprendre l'impôt sur le revenu
      </button>
      {open && (
        <div className="mt-6 space-y-6 text-sm text-gray-700">

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <p className="font-bold text-blue-800 dark:text-blue-300 text-base mb-3">💡 L'idée en une phrase</p>
            <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
              En France, on ne paye pas le même pourcentage sur tout son salaire. Plus tu gagnes,
              plus le <strong>taux augmente</strong> — mais seulement sur la partie qui dépasse chaque seuil.
              C'est l'<strong>impôt progressif</strong>.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-4">📖 L'erreur que tout le monde fait</p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Imaginons que tu gagnes <strong>30 000 € par an</strong>. Beaucoup de gens pensent :
              "Je suis dans la tranche à 30 %, donc je paie 30 % de 30 000 € = 9 000 €."
              C'est <strong>faux</strong>. Voici ce qui se passe vraiment :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              {[
                { tranche: '0 → 11 294 €', taux: '0 %',  impot: '0 €',      bg: 'bg-gray-50' },
                { tranche: '11 294 → 28 797 €', taux: '11 %', impot: '1 925 €', bg: 'bg-yellow-50' },
                { tranche: '28 797 → 30 000 €', taux: '30 %', impot: '361 €',  bg: 'bg-orange-50' },
                { tranche: 'Total',          taux: '',     impot: '2 286 €', bg: 'bg-emerald-50' },
              ].map(({ tranche, taux, impot, bg }) => (
                <div key={tranche} className={`${bg} rounded-lg p-3 text-center`}>
                  <p className="text-xs text-gray-500 mb-1">{tranche}</p>
                  {taux && <p className="text-xs font-semibold text-gray-600 mb-1">× {taux}</p>}
                  <p className="text-base font-bold text-gray-800">{impot}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
              Ton <strong>taux effectif</strong> réel est de 7,6 % (2 286 € / 30 000 €) — bien loin du 30 % !
              La tranche à 30 % ne s'applique qu'aux <em>derniers</em> 1 203 € gagnés.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">👨‍👩‍👧 Les parts fiscales : avoir des enfants réduit l'impôt</p>
            <p className="text-gray-600 leading-relaxed">
              Chaque enfant à charge ajoute <strong>0,5 part</strong> (1 part à partir du 3e).
              Le revenu est divisé par le nombre de parts avant d'appliquer le barème, puis multiplié.
              Résultat : les tranches élevées sont moins atteintes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {[
                { label: 'Célibataire', parts: '1 part',   impot: '2 286 €' },
                { label: '2 adultes',   parts: '2 parts',  impot: '0 €ˣ' },
                { label: '+ 2 enfants', parts: '3 parts',  impot: '0 €ˣ' },
              ].map(({ label, parts, impot }) => (
                <div key={label} className="border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold text-gray-600">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{parts}</p>
                  <p className="text-base font-bold text-emerald-600 mt-1">{impot}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">ˣ Pour 30 000 € de revenu net imposable à 2 adultes.</p>
          </div>

        </div>
      )}
    </div>
  )
}
