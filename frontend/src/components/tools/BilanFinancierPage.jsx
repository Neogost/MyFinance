import { useState, useEffect } from 'react'
import { getSalaryContracts, getOtherIncomes } from '../../api/income'
import { getPositions } from '../../api/patrimoine'
import { simulateTax } from '../../api/tools'
import { getExpenseSummary } from '../../api/expenses'
import { getPossessionsSummary } from '../../api/possessions'

const ASSET_LABELS = {
  BOURSE:        'Bourse',
  CRYPTO:        'Crypto-monnaie',
  IMMO_PAPIER:   'Immo papier',
  IMMO_PHYSIQUE: 'Immobilier physique',
  LIVRET:        'Livret',
  LIQUIDITE:     'Liquidités',
}

// Catégories pouvant générer un revenu estimé (gain mensuel moyen)
// IMMO_PHYSIQUE exclu : une résidence principale ne génère pas de revenu direct
const INVESTMENT_CATEGORIES = new Set(['BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'LIVRET'])

const EXPENSE_LABELS = {
  LOGEMENT:     'Logement',
  TRANSPORT:    'Transport',
  ALIMENTATION: 'Alimentation',
  ABONNEMENTS:  'Abonnements',
  ASSURANCES:   'Assurances',
  SANTE:        'Santé',
  FAMILLE:      'Famille',
  EPARGNE:      'Épargne',
  AUTRE:        'Autre',
}

const POSSESSION_LABELS = {
  VEHICULE:      'Véhicule',
  INFORMATIQUE:  'Informatique',
  ELECTROMENAGER:'Électroménager',
  MOBILIER:      'Mobilier',
  COLLECTION:    'Collection',
  LOISIRS:       'Loisirs',
  AUTRE:         'Autre',
}

const OTHER_INCOME_LABELS = {
  LOCATIF:      'Revenus locatifs',
  DIVIDENDE:    'Dividendes',
  AIDE_SOCIALE: 'Aides sociales',
}

function fmt(n) {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function BilanRow({ label, amount, badge, dimmed = false }) {
  const isNeg = amount != null && amount < 0
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50 transition">
      <td className={`px-5 py-2.5 text-sm ${dimmed ? 'text-gray-400 italic' : 'text-gray-800'}`}>
        {label}
        {badge && (
          <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
            {badge}
          </span>
        )}
      </td>
      <td className={`px-5 py-2.5 text-sm font-semibold text-right w-36 ${isNeg ? 'text-red-600' : 'text-gray-900'}`}>
        {amount == null ? <span className="text-gray-400 font-normal text-xs">—</span> : `${fmt(amount)} €`}
      </td>
    </tr>
  )
}

function TotalRow({ label, amount, color = 'text-gray-900' }) {
  return (
    <tr className="border-t-2 border-gray-300 bg-gray-50">
      <td className="px-5 py-2.5 text-sm font-bold text-gray-700 text-right">{label}</td>
      <td className={`px-5 py-2.5 text-sm font-bold text-right w-36 ${color}`}>
        {fmt(amount)} €
      </td>
    </tr>
  )
}

export default function BilanFinancierPage() {
  const [period,   setPeriod]   = useState('MONTHLY')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const [contracts,         setContracts]         = useState([])
  const [otherIncomes,      setOtherIncomes]      = useState([])
  const [positions,         setPositions]         = useState([])
  const [taxResult,         setTaxResult]         = useState(null)
  const [expenseSummary,    setExpenseSummary]    = useState(null)
  const [possessionSummary, setPossessionSummary] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      const [c, oi, pos, tax, exp, poss] = await Promise.all([
        getSalaryContracts(),
        getOtherIncomes(),
        getPositions({ status: 'ACTIVE' }),
        simulateTax().catch(() => null),
        getExpenseSummary(),
        getPossessionsSummary(),
      ])
      setContracts(c)
      setOtherIncomes(oi)
      setPositions(pos)
      setTaxResult(tax)
      setExpenseSummary(exp)
      setPossessionSummary(poss)
    } catch {
      setError('Impossible de charger les données du bilan.')
    } finally {
      setLoading(false)
    }
  }

  const mult = period === 'ANNUAL' ? 12 : 1

  // ── Contrat actif ────────────────────────────────────────────────
  const activeContract = contracts.find(c => !c.endDate) ?? contracts[0] ?? null
  const hasFiscalProfile = activeContract?.monthlyNetAfterTax != null
  const monthlySalary = activeContract?.monthlyNetAfterTax
    ?? activeContract?.monthlyNetImposable
    ?? 0

  // ── Revenus complémentaires par type ────────────────────────────
  // OtherIncome.amount est mensuel (aucune notion de fréquence dans le DTO)
  const otherIncomeByType = {}
  for (const oi of otherIncomes) {
    otherIncomeByType[oi.type] = (otherIncomeByType[oi.type] ?? 0) + (oi.amount ?? 0)
  }

  // ── Gains d'investissement par catégorie (capitalGainEur / 12) ──
  // Estimation : gain total ramené à une moyenne mensuelle sur 12 mois
  const investGainByCategory = {}
  for (const pos of positions) {
    const cat = pos.category
    if (!INVESTMENT_CATEGORIES.has(cat)) continue
    const gain = pos.computed?.capitalGainEur ?? 0
    if (gain <= 0) continue
    investGainByCategory[cat] = (investGainByCategory[cat] ?? 0) + gain / 12
  }

  const totalOtherIncome = Object.entries(otherIncomeByType)
    .filter(([type]) => type in OTHER_INCOME_LABELS)
    .reduce((s, [, v]) => s + v, 0)
  const totalInvestIncome  = Object.values(investGainByCategory).reduce((s, v) => s + v, 0)
  const totalRevenues      = monthlySalary + totalOtherIncome + totalInvestIncome

  // ── Dépenses ────────────────────────────────────────────────────
  const expensesByCategory = expenseSummary?.byCategory ?? []
  const monthlyTax         = taxResult?.totalEstimatedTax != null
    ? taxResult.totalEstimatedTax / 12
    : null
  const totalExpensesBase  = expensesByCategory.reduce((s, e) => s + (e.monthlyAmount ?? 0), 0)
  const totalExpenses      = totalExpensesBase + (monthlyTax ?? 0)

  // ── Δ R-D ────────────────────────────────────────────────────────
  const delta = totalRevenues - totalExpenses

  // ── Actif (hors IMMO_PHYSIQUE — traité côté Passif) ───────────────
  const actifByCategory = {}
  let immoPhysiqueValue = 0
  for (const pos of positions) {
    const val = pos.computed?.currentValueEur ?? 0
    if (pos.category === 'IMMO_PHYSIQUE') {
      immoPhysiqueValue += val
    } else {
      actifByCategory[pos.category] = (actifByCategory[pos.category] ?? 0) + val
    }
  }
  const totalActif = Object.values(actifByCategory).reduce((s, v) => s + v, 0)

  // ── Passif (possessions + immobilier physique) ────────────────────
  const passifByCategory = possessionSummary?.byCategory ?? []
  const totalPassif = (possessionSummary?.totalEffectiveValue ?? 0) + immoPhysiqueValue

  if (loading) return <p className="text-gray-500 text-sm">Chargement du bilan…</p>
  if (error)   return (
    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-3">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bilan financier personnel</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Synthèse revenus, dépenses, actif et passif — vue {period === 'MONTHLY' ? 'mensuelle' : 'annuelle'}.
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
          <button
            onClick={() => setPeriod('MONTHLY')}
            className={`px-4 py-1.5 transition ${period === 'MONTHLY' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setPeriod('ANNUAL')}
            className={`px-4 py-1.5 border-l border-gray-300 transition ${period === 'ANNUAL' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Annuel
          </button>
        </div>
      </div>

      {/* Avertissement profil fiscal incomplet */}
      {activeContract && !hasFiscalProfile && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Profil fiscal incomplet — le salaire affiché est le net imposable estimé (avant impôt).
        </div>
      )}

      {/* ── REVENUS ── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-green-600 text-white text-center py-2 font-bold text-sm tracking-widest uppercase">
          Revenus
        </div>
        <table className="w-full border-collapse">
          <tbody>

            {/* Salaire */}
            {activeContract ? (
              <BilanRow
                label={activeContract.companyName ? `Salaire — ${activeContract.companyName}` : 'Salaire'}
                amount={monthlySalary * mult}
                badge={!hasFiscalProfile ? 'net imposable' : undefined}
              />
            ) : (
              <BilanRow label="Salaire" amount={null} dimmed />
            )}

            {/* Revenus complémentaires */}
            {Object.entries(otherIncomeByType)
              .filter(([type, monthly]) => monthly > 0 && type in OTHER_INCOME_LABELS)
              .map(([type, monthly]) => (
                <BilanRow key={type} label={OTHER_INCOME_LABELS[type]} amount={monthly * mult} />
              ))
            }

            {/* Gains mensuels moyens par catégorie d'actif */}
            {Object.entries(investGainByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, monthly]) => (
                <BilanRow
                  key={cat}
                  label={`${ASSET_LABELS[cat] ?? cat} (gains moy. mensuels)`}
                  amount={monthly * mult}
                />
              ))
            }

            {positions.length === 0 && otherIncomes.length === 0 && !activeContract && (
              <tr>
                <td colSpan={2} className="px-5 py-4 text-sm text-gray-400 text-center italic">
                  Aucune donnée de revenu renseignée
                </td>
              </tr>
            )}

            <TotalRow label="TOTAL" amount={totalRevenues * mult} color="text-green-700" />
          </tbody>
        </table>
      </div>

      {/* ── DÉPENSES ── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-amber-500 text-white text-center py-2 font-bold text-sm tracking-widest uppercase">
          Dépenses
        </div>
        <table className="w-full border-collapse">
          <tbody>

            {expensesByCategory.length === 0 && monthlyTax == null && (
              <tr>
                <td colSpan={2} className="px-5 py-4 text-sm text-gray-400 text-center italic">
                  Aucune dépense renseignée
                </td>
              </tr>
            )}

            {expensesByCategory
              .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
              .map(e => (
                <BilanRow
                  key={e.category}
                  label={EXPENSE_LABELS[e.category] ?? e.category}
                  amount={(e.monthlyAmount ?? 0) * mult}
                />
              ))
            }

            {monthlyTax != null && (
              <BilanRow label="Impôt estimé" amount={monthlyTax * mult} badge="estimé" />
            )}

            <TotalRow label="TOTAL" amount={totalExpenses * mult} color="text-amber-700" />
          </tbody>
        </table>
      </div>

      {/* ── ACTIF / PASSIF ── */}
      <div className="grid grid-cols-2 gap-0 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">

        {/* Actif */}
        <div className="flex flex-col border-r border-gray-200">
          <div className="bg-green-600 text-white text-center py-2 font-bold text-sm tracking-widest uppercase">
            Actif
          </div>
          <table className="w-full border-collapse">
            <tbody>
              {Object.keys(actifByCategory).length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-sm text-gray-400 text-center italic">
                    Aucune position active
                  </td>
                </tr>
              )}
              {Object.entries(actifByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, val]) => (
                  <tr key={cat} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-4 py-2.5 text-sm text-gray-800">{ASSET_LABELS[cat] ?? cat}</td>
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">
                      {fmt(val)} €
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
          <div className="mt-auto border-t-2 border-gray-300 bg-gray-50 flex justify-between px-4 py-2.5">
            <span className="text-sm font-bold text-green-700">TOTAL</span>
            <span className="text-sm font-bold text-green-700">{fmt(totalActif)} €</span>
          </div>
        </div>

        {/* Passif */}
        <div className="flex flex-col">
          <div className="bg-amber-500 text-white text-center py-2 font-bold text-sm tracking-widest uppercase">
            Passif
          </div>
          <table className="w-full border-collapse">
            <tbody>
              {passifByCategory.length === 0 && immoPhysiqueValue === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-sm text-gray-400 text-center italic">
                    Aucun passif renseigné
                  </td>
                </tr>
              )}
              {immoPhysiqueValue > 0 && (
                <tr className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-2.5 text-sm text-gray-800">Immobilier physique</td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">
                    {fmt(immoPhysiqueValue)} €
                  </td>
                </tr>
              )}
              {passifByCategory
                .sort((a, b) => b.totalEffectiveValue - a.totalEffectiveValue)
                .map(p => (
                  <tr key={p.category} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-4 py-2.5 text-sm text-gray-800">
                      {POSSESSION_LABELS[p.category] ?? p.category}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">
                      {fmt(p.totalEffectiveValue)} €
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
          <div className="mt-auto border-t-2 border-gray-300 bg-gray-50 flex justify-between px-4 py-2.5">
            <span className="text-sm font-bold text-amber-700">TOTAL</span>
            <span className="text-sm font-bold text-amber-700">{fmt(totalPassif)} €</span>
          </div>
        </div>
      </div>

      {/* ── Δ R-D ── */}
      <div className={`rounded-xl shadow-sm border ${delta >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center justify-between px-6 py-3">
          <div>
            <span className={`text-sm font-bold uppercase tracking-widest ${delta >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              Δ Revenus − Dépenses
            </span>
            {delta < 0 && (
              <p className="text-xs text-red-500 mt-0.5">Capacité d'épargne négative</p>
            )}
          </div>
          <span className={`text-2xl font-bold ${delta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {delta >= 0 ? '+' : ''}{fmt(delta * mult)} €
          </span>
        </div>
      </div>

      {/* Note méthodologique */}
      <p className="text-xs text-gray-400 text-center pb-2">
        Les gains d'actifs (Bourse, Crypto…) sont calculés comme une moyenne mensuelle des plus-values latentes sur 12 mois.
      </p>
    </div>
  )
}
