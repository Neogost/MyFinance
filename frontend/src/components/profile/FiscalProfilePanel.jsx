import { useState, useEffect, useCallback } from 'react'
import { updateFiscalProfile, getBaremeKilometrique } from '../../api/auth'
import { getSalaryContracts } from '../../api/income'

const inputCls = 'px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition'

const HOME_MEAL_REF   = 5.20
const TELEWORK_DAILY  = 2.50
const FLAT_RATE       = 0.10
const FLAT_MIN        = 504
const FLAT_MAX        = 13522
const WORKING_DAYS    = 218  // référence jours travaillés/an pour estimation km/jour

function AmountInput({ value, onChange, placeholder = 'ex : 500' }) {
  return (
    <div className="relative w-36">
      <input type="number" min="0" step="50" value={value} onChange={onChange}
        placeholder={placeholder} className={`${inputCls} w-full pr-6`} />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
    </div>
  )
}

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

function ExpenseRow({ label, hint, amount, children }) {
  return (
    <div className="flex flex-col gap-2 py-4 border-b border-gray-100 last:border-0 last:pb-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700">{label}</div>
          {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
        </div>
        {amount !== undefined && (
          <div className="text-sm font-mono font-semibold text-indigo-700 min-w-[80px] text-right shrink-0">
            {amount > 0 ? `${Math.round(amount).toLocaleString('fr-FR')} €` : '—'}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function computeKmAllowance(km, cv, electric, bareme) {
  if (!km || !cv || !bareme?.voitures) return 0
  const kmNum = parseFloat(km) || 0
  if (kmNum <= 0) return 0
  const cvNum = parseInt(cv) || 5
  const voiture = bareme.voitures.find(v => cvNum <= v.cvMax) ?? bareme.voitures[bareme.voitures.length - 1]
  const tranche = voiture.tranches.find(t => t.kmMax === null || kmNum <= t.kmMax)
  if (!tranche) return 0
  let amount = kmNum * tranche.taux + tranche.forfait
  if (electric) amount *= bareme.multiplicateurElectrique
  return Math.round(amount)
}

export default function FiscalProfilePanel({ user, onUpdate }) {
  const [fiscalParts, setFiscalParts] = useState(user.fiscalParts ?? '')
  const [flatRate,    setFlatRate]    = useState(user.useFlatRateDeduction ?? true)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)
  const [bareme,  setBareme]  = useState(null)
  const [salaryNetImposable, setSalaryNetImposable] = useState('')

  const [expenses, setExpenses] = useState({
    transportKm:              user.realExpensesTransportKm              ?? '',
    transportCv:              user.realExpensesTransportCv              ?? 5,
    transportElectric:        user.realExpensesTransportElectric        ?? false,
    publicTransport:          user.realExpensesPublicTransport          ?? '',
    meals:                    user.realExpensesMeals                    ?? '',
    mealAvgPrice:             '',
    mealCount:                '',
    teleworkDays:             user.realExpensesTeleworkDays             ?? '',
    teleworkEmployerDaily:    user.realExpensesTeleworkEmployerDaily    ?? '',
    clothing:                 user.realExpensesClothing                 ?? '',
    training:                 user.realExpensesTraining                 ?? '',
    equipment:                user.realExpensesEquipment                ?? '',
    phone:                    user.realExpensesPhone                    ?? '',
    doubleResidence:          user.realExpensesDoubleResidence          ?? '',
    other:                    user.realExpensesOther                    ?? '',
  })

  useEffect(() => {
    if (!flatRate && !bareme) {
      getBaremeKilometrique().then(setBareme).catch(() => {})
    }
  }, [flatRate, bareme])

  useEffect(() => {
    if (!flatRate) {
      getSalaryContracts()
        .then(contracts => {
          const active = contracts.find(c => !c.endDate)
          if (active?.annualNetImposable != null) {
            setSalaryNetImposable(String(Math.round(active.annualNetImposable)))
          }
        })
        .catch(() => {})
    }
  }, [flatRate])

  const setExp = useCallback((key, value) => {
    setExpenses(e => ({ ...e, [key]: value }))
    setSuccess(false)
  }, [])

  // ── Calculs ──────────────────────────────────────────────────

  const kmAllowance = computeKmAllowance(
    expenses.transportKm, expenses.transportCv, expenses.transportElectric, bareme
  )

  // Avertissement km > 40 km aller
  const estOnewayKm = expenses.transportKm > 0 ? (parseFloat(expenses.transportKm) || 0) / WORKING_DAYS / 2 : 0
  const showKmWarning = estOnewayKm > 40

  const mealAvgPriceNum = parseFloat(expenses.mealAvgPrice) || 0
  const mealCountNum    = parseInt(expenses.mealCount) || 0
  const mealAmount = mealAvgPriceNum > 0 && mealCountNum > 0
    ? Math.max(0, Math.round((mealAvgPriceNum - HOME_MEAL_REF) * mealCountNum))
    : (parseFloat(expenses.meals) || 0)

  const teleworkDaysNum     = parseInt(expenses.teleworkDays) || 0
  const teleworkEmployerNum = parseFloat(expenses.teleworkEmployerDaily) || 0
  const teleworkAmount      = teleworkDaysNum > 0
    ? Math.round(teleworkDaysNum * Math.max(0, TELEWORK_DAILY - teleworkEmployerNum))
    : 0

  const total = flatRate ? 0 : (
    kmAllowance
    + (parseFloat(expenses.publicTransport) || 0)
    + mealAmount
    + teleworkAmount
    + (parseFloat(expenses.clothing)        || 0)
    + (parseFloat(expenses.training)        || 0)
    + (parseFloat(expenses.equipment)       || 0)
    + (parseFloat(expenses.phone)           || 0)
    + (parseFloat(expenses.doubleResidence) || 0)
    + (parseFloat(expenses.other)           || 0)
  )

  // Comparaison forfait 10 % vs frais réels
  const salaryNum = parseFloat(salaryNetImposable) || 0
  const forfaitDeduction = salaryNum > 0
    ? Math.round(Math.min(Math.max(salaryNum * FLAT_RATE, FLAT_MIN), FLAT_MAX))
    : null
  const comparisonDiff = forfaitDeduction !== null ? total - forfaitDeduction : null

  // ── Sauvegarde ───────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const payload = {
        fiscalParts: fiscalParts !== '' ? parseFloat(fiscalParts) : null,
        useFlatRateDeduction: flatRate,
      }
      if (!flatRate) {
        payload.realExpensesTransportKm            = expenses.transportKm !== '' ? parseInt(expenses.transportKm) : null
        payload.realExpensesTransportCv            = parseInt(expenses.transportCv) || null
        payload.realExpensesTransportElectric      = expenses.transportElectric || false
        payload.realExpensesPublicTransport        = expenses.publicTransport !== '' ? parseFloat(expenses.publicTransport) : null
        payload.realExpensesMeals                  = mealAmount > 0 ? mealAmount : null
        payload.realExpensesTeleworkDays           = expenses.teleworkDays !== '' ? parseInt(expenses.teleworkDays) : null
        payload.realExpensesTeleworkEmployerDaily  = expenses.teleworkEmployerDaily !== '' ? parseFloat(expenses.teleworkEmployerDaily) : null
        payload.realExpensesClothing               = expenses.clothing !== '' ? parseFloat(expenses.clothing) : null
        payload.realExpensesTraining               = expenses.training !== '' ? parseFloat(expenses.training) : null
        payload.realExpensesEquipment              = expenses.equipment !== '' ? parseFloat(expenses.equipment) : null
        payload.realExpensesPhone                  = expenses.phone !== '' ? parseFloat(expenses.phone) : null
        payload.realExpensesDoubleResidence        = expenses.doubleResidence !== '' ? parseFloat(expenses.doubleResidence) : null
        payload.realExpensesOther                  = expenses.other !== '' ? parseFloat(expenses.other) : null
      }
      const updated = await updateFiscalProfile(payload)
      onUpdate?.(updated)
      setSuccess(true)
    } catch {
      setError("Impossible d'enregistrer le profil fiscal.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-8">
      <h3 className="text-base font-semibold text-gray-800 mb-1">Profil fiscal</h3>
      <p className="text-sm text-gray-500 mb-6">
        Utilisé pour le simulateur d'impôts et le calcul du net d'impôt sur vos contrats.
      </p>

      {/* Parts fiscales */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          Nombre de parts fiscales
          <FieldTooltip text="Utilisé par le simulateur d'impôts et les projections de contrat salarial pour calculer votre impôt via le quotient familial. Influe sur le net d'impôt affiché dans le bilan financier, la déclaration de patrimoine et le score patrimonial (axe Capacité d'épargne)." />
        </label>
        <div className="relative w-40">
          <input type="number" min="1" max="10" step="0.25" value={fiscalParts}
            onChange={e => { setFiscalParts(e.target.value); setSuccess(false) }}
            placeholder="ex : 1.0" className={`${inputCls} w-full pr-16`} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">parts</span>
        </div>
        <p className="text-xs text-gray-400">1 part = célibataire, 2 = couple, +0,5 par enfant à charge</p>
      </div>

      {/* Mode de déduction */}
      <div className="flex flex-col gap-2 mb-6">
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          Déduction professionnelle
          <FieldTooltip text="Réduit le revenu imposable avant application du barème. L'abattement forfaitaire 10 % est appliqué automatiquement ; les frais réels remplacent ce forfait si leur total est supérieur. Le choix impacte le net d'impôt sur vos contrats, le simulateur d'impôts et le bilan financier." />
        </label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="radio" checked={flatRate === true}
              onChange={() => { setFlatRate(true); setSuccess(false) }}
              className="accent-indigo-600" />
            <span className="text-sm text-gray-700">Abattement forfaitaire 10 %</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="radio" checked={flatRate === false}
              onChange={() => { setFlatRate(false); setSuccess(false) }}
              className="accent-indigo-600" />
            <span className="text-sm text-gray-700">Frais réels</span>
          </label>
        </div>
      </div>

      {/* ── Détail frais réels ───────────────────────────────── */}
      {!flatRate && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">Détail des frais réels</h4>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Case 1AK (déclarant 1) · 1BK (déclarant 2)
            </span>
          </div>

          {bareme && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              ⚠ {bareme.avertissement}
            </p>
          )}

          <div className="border border-gray-200 rounded-xl p-4 flex flex-col">

            {/* Transport véhicule */}
            <ExpenseRow
              label="Transport domicile-travail — Véhicule personnel"
              hint="Barème kilométrique fiscal (aller-retour annuel, tous jours travaillés)"
              amount={kmAllowance}
            >
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Km annuels</span>
                  <div className="relative w-32">
                    <input type="number" min="0" step="100" value={expenses.transportKm}
                      onChange={e => setExp('transportKm', e.target.value)}
                      placeholder="ex : 12 000" className={`${inputCls} w-full pr-8`} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">km</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">CV fiscal</span>
                  <select value={expenses.transportCv}
                    onChange={e => setExp('transportCv', e.target.value)}
                    className={`${inputCls} w-32`}>
                    <option value={3}>3 CV et −</option>
                    <option value={4}>4 CV</option>
                    <option value={5}>5 CV</option>
                    <option value={6}>6 CV</option>
                    <option value={7}>7 CV et +</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                  <input type="checkbox" checked={expenses.transportElectric}
                    onChange={e => setExp('transportElectric', e.target.checked)}
                    className="accent-indigo-600 w-4 h-4" />
                  <span className="text-xs text-gray-600">Véhicule électrique (×1,20)</span>
                </label>
              </div>
              {showKmWarning && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
                  ⚠ Distance estimée &gt; 40 km aller — l'administration peut demander à justifier la contrainte géographique (absence de transports en commun, contraintes familiales ou professionnelles).
                </p>
              )}
            </ExpenseRow>

            {/* Transport en commun */}
            <ExpenseRow
              label="Transport en commun"
              hint="Montant annuel net après déduction de la prise en charge employeur (50 % légal). Ex : Navigo 1 006 €/an → saisir 503 €"
              amount={parseFloat(expenses.publicTransport) || 0}
            >
              <AmountInput value={expenses.publicTransport} onChange={e => setExp('publicTransport', e.target.value)} />
            </ExpenseRow>

            {/* Repas */}
            <ExpenseRow
              label="Frais de repas"
              hint="Saisir le prix net payé par repas (après tickets-restaurant). Déductible = (prix net − 5,20 €) × nombre de repas/an. Souvent nul si tickets-restaurant bien pris en charge."
              amount={mealAmount}
            >
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Prix moyen du repas</span>
                  <div className="relative w-32">
                    <input type="number" min="0" step="0.5" value={expenses.mealAvgPrice}
                      onChange={e => setExp('mealAvgPrice', e.target.value)}
                      placeholder="ex : 12" className={`${inputCls} w-full pr-6`} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Repas par an</span>
                  <div className="relative w-28">
                    <input type="number" min="0" step="1" value={expenses.mealCount}
                      onChange={e => setExp('mealCount', e.target.value)}
                      placeholder="ex : 220" className={`${inputCls} w-full pr-12`} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">repas</span>
                  </div>
                </div>
              </div>
              {mealAvgPriceNum > 0 && mealCountNum > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">
                  ({mealAvgPriceNum.toFixed(2)} − 5,20) × {mealCountNum} = <span className="font-medium text-indigo-600">{mealAmount.toLocaleString('fr-FR')} €</span>
                </p>
              )}
            </ExpenseRow>

            {/* Télétravail */}
            <ExpenseRow
              label="Télétravail"
              hint="Estimation : 2,50 €/jour pour les frais liés au domicile (électricité, internet, loyer prorata). Si votre employeur verse une allocation télétravail, déduisez-la du tarif journalier."
              amount={teleworkAmount}
            >
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Jours de télétravail/an</span>
                  <div className="relative w-28">
                    <input type="number" min="0" step="1" value={expenses.teleworkDays}
                      onChange={e => setExp('teleworkDays', e.target.value)}
                      placeholder="ex : 100" className={`${inputCls} w-full pr-8`} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">j</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Allocation employeur/jour</span>
                  <div className="relative w-32">
                    <input type="number" min="0" step="0.1" value={expenses.teleworkEmployerDaily}
                      onChange={e => setExp('teleworkEmployerDaily', e.target.value)}
                      placeholder="ex : 2.50" className={`${inputCls} w-full pr-6`} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">€/j</span>
                  </div>
                </div>
              </div>
              {teleworkDaysNum > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">
                  {teleworkDaysNum} j × ({TELEWORK_DAILY.toFixed(2)} − {teleworkEmployerNum.toFixed(2)}) = <span className="font-medium text-indigo-600">{teleworkAmount.toLocaleString('fr-FR')} €</span>
                  {teleworkEmployerNum >= TELEWORK_DAILY && (
                    <span className="ml-1 text-amber-600">— allocation employeur couvre intégralement les frais</span>
                  )}
                </p>
              )}
            </ExpenseRow>

            {/* Vêtements */}
            <ExpenseRow
              label="Vêtements professionnels spécifiques"
              hint="Tenues imposées (uniforme, EPI…) — hors vêtements courants non déductibles"
              amount={parseFloat(expenses.clothing) || 0}
            >
              <AmountInput value={expenses.clothing} onChange={e => setExp('clothing', e.target.value)} />
            </ExpenseRow>

            {/* Formation */}
            <ExpenseRow
              label="Formation professionnelle"
              hint="Frais de formation non remboursés par l'employeur"
              amount={parseFloat(expenses.training) || 0}
            >
              <AmountInput value={expenses.training} onChange={e => setExp('training', e.target.value)} />
            </ExpenseRow>

            {/* Matériel */}
            <ExpenseRow
              label="Matériel et fournitures professionnelles"
              hint="Ordinateur, logiciels, livres, abonnements pro — au prorata si usage mixte"
              amount={parseFloat(expenses.equipment) || 0}
            >
              <AmountInput value={expenses.equipment} onChange={e => setExp('equipment', e.target.value)} />
            </ExpenseRow>

            {/* Téléphone / Internet */}
            <ExpenseRow
              label="Téléphone / Internet (part professionnelle)"
              hint="% d'utilisation pro × coût annuel de l'abonnement"
              amount={parseFloat(expenses.phone) || 0}
            >
              <AmountInput value={expenses.phone} onChange={e => setExp('phone', e.target.value)} />
            </ExpenseRow>

            {/* Double résidence */}
            <ExpenseRow
              label="Double résidence"
              hint="Loyer + frais si vous êtes contraint de vivre hors du domicile familial pour votre emploi"
              amount={parseFloat(expenses.doubleResidence) || 0}
            >
              <AmountInput value={expenses.doubleResidence} onChange={e => setExp('doubleResidence', e.target.value)} />
            </ExpenseRow>

            {/* Autres */}
            <ExpenseRow
              label="Autres frais justifiés"
              hint="Tout frais professionnel réel, justifié par pièces et lié directement à l'activité"
              amount={parseFloat(expenses.other) || 0}
            >
              <AmountInput value={expenses.other} onChange={e => setExp('other', e.target.value)} />
            </ExpenseRow>

          </div>

          {/* Total */}
          <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3">
            <div>
              <span className="text-sm font-semibold text-indigo-900">Total frais réels</span>
              <span className="ml-2 text-xs text-indigo-500">→ case 1AK / 1BK de votre formulaire 2042</span>
            </div>
            <span className="text-lg font-bold text-indigo-700">
              {total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
            </span>
          </div>

          {/* ── Comparaison forfait vs frais réels ───────────── */}
          <div className="mt-4 border border-gray-200 rounded-xl p-4">
            <h5 className="text-sm font-semibold text-gray-700 mb-3">Forfait 10 % vs Frais réels</h5>
            <div className="flex flex-col gap-1.5 mb-3">
              <label className="text-xs text-gray-500">Salaire net imposable annuel</label>
              <div className="relative w-44">
                <input type="number" min="0" step="100" value={salaryNetImposable}
                  onChange={e => setSalaryNetImposable(e.target.value)}
                  placeholder="ex : 32 000" className={`${inputCls} w-full pr-6`} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
              </div>
              <p className="text-xs text-gray-400">Pré-rempli depuis votre contrat actif si disponible</p>
            </div>

            {forfaitDeduction !== null ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Abattement forfaitaire 10 %</span>
                  <span className="font-mono font-medium text-gray-700">{forfaitDeduction.toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Vos frais réels</span>
                  <span className="font-mono font-medium text-indigo-700">{total.toLocaleString('fr-FR')} €</span>
                </div>
                <div className={`mt-1 flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold
                  ${comparisonDiff >= 0
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'}`}>
                  {comparisonDiff >= 0 ? (
                    <>
                      <span>✓ Frais réels avantageux</span>
                      <span>+{comparisonDiff.toLocaleString('fr-FR')} € de déduction</span>
                    </>
                  ) : (
                    <>
                      <span>✗ Reste sur le forfait 10 %</span>
                      <span>{Math.abs(comparisonDiff).toLocaleString('fr-FR')} € de déduction en moins</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Saisissez votre salaire net imposable pour voir la comparaison.</p>
            )}
          </div>
        </div>
      )}

      {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-5">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-5">Profil fiscal enregistré.</p>}

      <button onClick={handleSave} disabled={saving}
        className="mt-5 py-2.5 px-6 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}
