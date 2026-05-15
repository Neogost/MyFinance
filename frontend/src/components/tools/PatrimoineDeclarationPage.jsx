import { useState, useEffect } from 'react'
import { getPositions } from '../../api/patrimoine'
import { FISCAL_ENVELOPE_LABELS } from '../patrimoine/constants'
import { getSalaryContracts } from '../../api/income'
import { getExpenseSummary } from '../../api/expenses'
import { getPossessions } from '../../api/possessions'
import { getDebts } from '../../api/debts'
import { simulateTax } from '../../api/tools'
import { useAnalytics } from '../../hooks/useAnalytics'

const fmtEur = (n) => n == null ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
const fmtDate = (d) => {
  if (!d) return null
  const date = new Date(d)
  return isNaN(date) ? null : date.toLocaleDateString('fr-FR')
}

const CATEGORY_ORDER  = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']
const CATEGORY_LABELS = {
  LIQUIDITE:     'Liquidités',
  LIVRET:        'Livrets',
  BOURSE:        'Bourse',
  CRYPTO:        'Crypto-monnaies',
  IMMO_PAPIER:   'Immobilier papier',
  IMMO_PHYSIQUE: 'Immobilier physique',
}
const OWNERSHIP_LABELS = {
  PLEINE_PROPRIETE: 'Pleine propriété',
  NUE_PROPRIETE:    'Nue-propriété',
  USUFRUIT:         'Usufruit',
  INDIVISION:       'Indivision',
}
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
const DETTE_TYPE_LABELS = {
  IMMOBILIER:   'Emprunt immobilier',
  ETUDIANT:     'Prêt étudiant',
  VEHICULE:     'Crédit véhicule',
  CONSOMMATION: 'Crédit consommation',
  AUTRE:        'Autre dette',
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

function groupByPartner(positions) {
  const groups = {}
  positions.forEach(p => {
    const key = p.partner || p.label
    groups[key] = (groups[key] ?? 0) + parseFloat(p.computed?.currentValueEur ?? 0)
  })
  return Object.entries(groups).sort(([, a], [, b]) => b - a)
}

function groupByPartnerWithEnvelope(positions) {
  const groups = {}
  positions.forEach(p => {
    const partner = p.partner || p.label
    const env     = p.fiscalEnvelope && p.fiscalEnvelope !== 'NONE' ? p.fiscalEnvelope : null
    const key     = `${partner}|||${env ?? ''}`
    if (!groups[key]) groups[key] = { partner, env, value: 0 }
    groups[key].value += parseFloat(p.computed?.currentValueEur ?? 0)
  })
  return Object.values(groups)
    .sort((a, b) => b.value - a.value)
    .map(({ partner, env, value }) => [partner, value, env ? (FISCAL_ENVELOPE_LABELS[env]?.label ?? env) : null])
}

function groupByTicker(positions) {
  const groups = {}
  positions.forEach(p => {
    const key = p.instrument?.ticker || p.label
    groups[key] = (groups[key] ?? 0) + parseFloat(p.computed?.currentValueEur ?? 0)
  })
  return Object.entries(groups).sort(([, a], [, b]) => b - a)
}

function MissingField({ children }) {
  return <span className="text-red-400 italic text-sm">{children}</span>
}

function CategoryTable({ title, rows, totalLabel }) {
  const total    = rows.reduce((s, [, v]) => s + v, 0)
  const hasExtra = rows.some(r => r[2] != null)
  if (total === 0) return null
  return (
    <div className="mb-6 declaration-section">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
        {title}
      </h3>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([key, value, extra]) => (
            <tr key={key} className="border-b border-gray-100">
              <td className="py-1.5 text-gray-700">{key}</td>
              {hasExtra && <td className="py-1.5 text-gray-400 text-xs px-4">{extra ?? ''}</td>}
              <td className="py-1.5 text-right font-medium text-gray-900 amount">{fmtEur(value)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-400">
            <td className="py-1.5 font-bold text-gray-800" colSpan={hasExtra ? 2 : 1}>{totalLabel}</td>
            <td className="py-1.5 text-right font-bold text-gray-900 amount">{fmtEur(total)}</td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  )
}

export default function PatrimoineDeclarationPage({ user, onNavigate }) {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('tools.patrimoine_declaration') }, [])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)
  const [positions,        setPositions]        = useState([])
  const [activeContract,   setActiveContract]   = useState(null)
  const [expenseSummary,   setExpenseSummary]   = useState(null)
  const [possessions,      setPossessions]      = useState([])
  const [taxResult,        setTaxResult]        = useState(null)
  const [debts,            setDebts]            = useState([])

  useEffect(() => {
    Promise.all([
      getPositions({ status: 'ACTIVE' }),
      getSalaryContracts(),
      getExpenseSummary(),
      getPossessions(),
      simulateTax().catch(() => null),
      getDebts().catch(() => []),
    ]).then(([pos, contracts, exp, poss, tax, dts]) => {
      setPositions(pos)
      setActiveContract(contracts.find(c => c.endDate == null) ?? null)
      setExpenseSummary(exp)
      setPossessions(poss)
      setTaxResult(tax)
      setDebts(dts)
    }).catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500 text-sm">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  // ── Identité ─────────────────────────────────────────────────
  const missingFields = []
  if (!user.birthDate)       missingFields.push('date de naissance')
  if (!user.birthPlace)      missingFields.push('commune de naissance')
  if (!user.birthPostalCode) missingFields.push('code postal de naissance')
  if (!user.jobTitle)        missingFields.push('poste actuel')

  // ── Patrimoine brut / net ─────────────────────────────────────
  const active             = positions.filter(p => p.status === 'ACTIVE')
  const patrimoineBrut     = active.reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
  const patrimoineFinancier = active
    .filter(p => p.category !== 'IMMO_PHYSIQUE')
    .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
  const totalPlusValue     = active.reduce((s, p) => s + parseFloat(p.computed?.capitalGainEur ?? 0), 0)
  const totalPassifPossessions = possessions.reduce((s, p) => s + parseFloat(p.effectiveValue ?? p.purchasePrice ?? 0), 0)
  const totalDettes            = debts.reduce((s, d) => s + parseFloat(d.remainingCapital ?? 0), 0)
  const totalPassif            = totalPassifPossessions + totalDettes
  const patrimoineNet          = patrimoineBrut - totalPassif

  const dettesByType = debts.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + parseFloat(d.remainingCapital ?? 0)
    return acc
  }, {})

  // ── Revenus mensuels ─────────────────────────────────────────
  const monthlySalary     = activeContract?.monthlyNetImposable ?? null
  const monthlyBonuses    = activeContract?.monthlyActiveMensuelleGross > 0
    ? activeContract.monthlyActiveMensuelleGross * 0.72
    : null
  const monthlyTax        = taxResult?.totalEstimatedTax != null ? taxResult.totalEstimatedTax / 12 : null
  const totalRevenus      = (monthlySalary ?? 0) + (monthlyBonuses ?? 0)

  // ── Dépenses mensuelles ───────────────────────────────────────
  const expensesByCategory = expenseSummary?.byCategory ?? []
  const totalDepenses      = expensesByCategory.reduce((s, e) => s + (e.monthlyAmount ?? 0), 0)
  const capaciteEpargne    = totalRevenus - totalDepenses - (monthlyTax ?? 0)

  // ── Détail actifs par catégorie ───────────────────────────────
  const byCategory = {}
  CATEGORY_ORDER.forEach(cat => {
    byCategory[cat] = active.filter(p => p.category === cat)
  })

  // ── Détail passifs par catégorie ──────────────────────────────
  const possessionsByCategory = {}
  possessions.forEach(p => {
    const cat = p.category
    if (!possessionsByCategory[cat]) possessionsByCategory[cat] = []
    possessionsByCategory[cat].push(p)
  })

  return (
    <div className="max-w-3xl mx-auto">

      {/* Alertes champs manquants — masquées à l'impression */}
      {missingFields.length > 0 && (
        <div className="no-print mb-6 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <span className="mt-0.5">⚠️</span>
          <div>
            <p className="font-semibold">Informations manquantes dans le document</p>
            <p className="mt-0.5 text-amber-700">
              {missingFields.join(', ')} —{' '}
              <button onClick={() => onNavigate?.('profile')}
                className="underline hover:text-amber-900 font-medium">
                compléter mon profil
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Bouton export — masqué à l'impression */}
      <div className="no-print flex justify-end mb-6">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
          </svg>
          Exporter en PDF
        </button>
      </div>

      {/* ══ DOCUMENT ══════════════════════════════════════════════ */}
      <div className="declaration-document bg-white rounded-xl shadow-sm border border-gray-200 p-10">

        {/* En-tête identité */}
        <div className="border-b-2 border-gray-800 pb-6 mb-8">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Déclaration de patrimoine</p>
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide mb-1">
            {user.lastName} {user.firstName}
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            {(user.birthDate || user.birthPlace || user.birthPostalCode) ? (
              <>
                Né(e){user.birthDate ? ` le ${fmtDate(user.birthDate)}` : ''}
                {user.birthPlace ? ` à ${user.birthPlace}` : ''}
                {user.birthPostalCode ? ` (${user.birthPostalCode})` : ''}
                {!user.birthDate && <MissingField> [date de naissance manquante]</MissingField>}
                {!user.birthPlace && <MissingField> [commune manquante]</MissingField>}
                {!user.birthPostalCode && <MissingField> [code postal manquant]</MissingField>}
              </>
            ) : (
              <MissingField>[État civil incomplet — compléter le profil]</MissingField>
            )}
          </p>
          {(activeContract || user.jobTitle) && (
            <p className="text-sm text-gray-600 mt-1">
              {activeContract?.companyName ?? <MissingField>[entreprise manquante]</MissingField>}
              {(activeContract?.companyName && user.jobTitle) && ' — '}
              {user.jobTitle ?? <MissingField> [poste manquant]</MissingField>}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-4">
            Établi le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Synthèse 2 colonnes ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">

          {/* Colonne Patrimoine */}
          <div className="overflow-x-auto">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Patrimoine</h2>
            <table className="w-full text-sm">
                            <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Patrimoine brut</td>
                  <td className="py-1.5 text-right font-semibold text-gray-900 amount">{fmtEur(patrimoineBrut)}</td>
                </tr>
                {totalPassif > 0 && (
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-600">Passifs & dettes</td>
                    <td className="py-1.5 text-right text-gray-700 amount">{fmtEur(totalPassif)}</td>
                  </tr>
                )}
                {Object.entries(possessionsByCategory).map(([cat, items]) => {
                  const total = items.reduce((s, p) => s + parseFloat(p.effectiveValue ?? p.purchasePrice ?? 0), 0)
                  return (
                    <tr key={cat} className="border-b border-gray-100">
                      <td className="py-1 text-gray-400 text-xs pl-3">{POSSESSION_LABELS[cat] ?? cat}</td>
                      <td className="py-1 text-right text-gray-500 text-xs amount">{fmtEur(total)}</td>
                    </tr>
                  )
                })}
                {Object.entries(dettesByType).map(([type, total]) => (
                  <tr key={type} className="border-b border-gray-100">
                    <td className="py-1 text-red-400 text-xs pl-3">{DETTE_TYPE_LABELS[type] ?? type}</td>
                    <td className="py-1 text-right text-red-500 text-xs amount">{fmtEur(total)}</td>
                  </tr>
                ))}
                <tr className="border-b border-gray-200">
                  <td className="py-1.5 font-bold text-gray-800">Patrimoine net</td>
                  <td className={`py-1.5 text-right font-bold amount ${patrimoineNet >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {fmtEur(patrimoineNet)}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-400 text-xs pl-3">dont actif financier</td>
                  <td className="py-1.5 text-right text-gray-500 text-xs amount">{fmtEur(patrimoineFinancier)}</td>
                </tr>
                {totalPlusValue !== 0 && (
                  <tr>
                    <td className="py-1.5 text-gray-400 text-xs pl-3">dont plus-values latentes</td>
                    <td className={`py-1.5 text-right text-xs font-medium amount ${totalPlusValue >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {totalPlusValue >= 0 ? '+' : ''}{fmtEur(totalPlusValue)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Colonne Revenus / Dépenses */}
          <div className="overflow-x-auto">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Revenus mensuels</h2>
            <table className="w-full text-sm mb-5">
                            <tbody>
                {monthlySalary != null ? (
                  <>
                    <tr className="border-b border-gray-200">
                      <td className="py-1.5 text-gray-600">
                        Salaire net fiscal{activeContract?.companyName ? ` (${activeContract.companyName})` : ''}
                      </td>
                      <td className="py-1.5 text-right font-bold text-gray-900 amount">{fmtEur(monthlySalary)}</td>
                    </tr>
                    {monthlyBonuses != null && (
                      <tr className="border-b border-gray-200">
                        <td className="py-1.5 text-gray-600">Primes mensuelles (net estimé)</td>
                        <td className="py-1.5 text-right font-bold text-gray-900 amount">{fmtEur(monthlyBonuses)}</td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td className="py-1.5 text-gray-400 text-xs italic" colSpan={2}>Aucun contrat salarial actif</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Dépenses mensuelles</h2>
            <table className="w-full text-sm">
                            <tbody>
                {expensesByCategory.length === 0 ? (
                  <tr>
                    <td className="py-1.5 text-gray-400 text-xs italic" colSpan={2}>Aucune dépense enregistrée</td>
                  </tr>
                ) : expensesByCategory
                  .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
                  .map(e => (
                    <tr key={e.category} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-600">{EXPENSE_LABELS[e.category] ?? e.category}</td>
                      <td className="py-1.5 text-right text-gray-700 amount">{fmtEur(e.monthlyAmount)}</td>
                    </tr>
                  ))
                }
                {monthlyTax != null && (
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-400 text-xs">Impôt estimé</td>
                    <td className="py-1.5 text-right text-gray-500 text-xs amount">{fmtEur(monthlyTax)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-gray-400">
                  <td className="py-1.5 font-bold text-gray-800">Total dépenses</td>
                  <td className="py-1.5 text-right font-bold text-gray-900 amount">
                    {fmtEur(totalDepenses + (monthlyTax ?? 0))}
                  </td>
                </tr>
                {totalRevenus > 0 && (
                  <>
                    <tr>
                      <td className="py-1.5 text-gray-400 text-xs">Capacité d'épargne</td>
                      <td className={`py-1.5 text-right text-xs font-medium amount ${capaciteEpargne >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {capaciteEpargne >= 0 ? '+' : ''}{fmtEur(capaciteEpargne)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-400 text-xs">Taux d'épargne</td>
                      <td className={`py-1 text-right text-xs amount ${capaciteEpargne >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {Math.round((capaciteEpargne / totalRevenus) * 100)} %
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Détail des actifs ───────────────────────────────── */}
        <div className="border-t-2 border-gray-800 pt-6 mb-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Détail des actifs</h2>

          {/* LIQUIDITE — regroupement par partenaire */}
          <CategoryTable
            title="Liquidités — Comptes courants & épargne disponible"
            rows={groupByPartner(byCategory['LIQUIDITE'] ?? [])}
            totalLabel="Total Liquidités"
          />

          {/* LIVRET — regroupement par partenaire */}
          {['LIVRET'].map(cat => (
            <CategoryTable
              key={cat}
              title={CATEGORY_LABELS[cat]}
              rows={groupByPartner(byCategory[cat] ?? [])}
              totalLabel={`Total ${CATEGORY_LABELS[cat]}`}
            />
          ))}

          {/* BOURSE, IMMO_PAPIER — regroupement par partenaire + enveloppe fiscale */}
          {['BOURSE', 'IMMO_PAPIER'].map(cat => (
            <CategoryTable
              key={cat}
              title={CATEGORY_LABELS[cat]}
              rows={groupByPartnerWithEnvelope(byCategory[cat] ?? [])}
              totalLabel={`Total ${CATEGORY_LABELS[cat]}`}
            />
          ))}

          {/* CRYPTO — regroupement par token */}
          <CategoryTable
            title={CATEGORY_LABELS['CRYPTO']}
            rows={groupByTicker(byCategory['CRYPTO'] ?? [])}
            totalLabel="Total Crypto-monnaies"
          />

          {/* IMMO_PHYSIQUE — une ligne par bien */}
          {byCategory['IMMO_PHYSIQUE']?.length > 0 && (
            <div className="mb-6 declaration-section overflow-x-auto">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
                {CATEGORY_LABELS['IMMO_PHYSIQUE']}
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {byCategory['IMMO_PHYSIQUE'].map(p => (
                    <>
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="py-1.5 text-gray-700">{p.address || p.label}</td>
                        <td className="py-1.5 text-gray-400 text-xs px-4">{OWNERSHIP_LABELS[p.ownershipType] ?? ''}</td>
                        <td className="py-1.5 text-right font-medium text-gray-900 amount">
                          {fmtEur(parseFloat(p.computed?.currentValueEur ?? 0))}
                        </td>
                      </tr>
                      {p.acquisitionPrice != null && (
                        <tr key={`${p.id}-acq`} className="border-b border-gray-100">
                          <td className="py-1 text-gray-400 text-xs pl-3">Prix d'acquisition</td>
                          <td />
                          <td className="py-1 text-right text-gray-400 text-xs amount">
                            {fmtEur(parseFloat(p.acquisitionPrice))}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-400">
                    <td className="py-1.5 font-bold text-gray-800" colSpan={2}>Total Immobilier physique</td>
                    <td className="py-1.5 text-right font-bold text-gray-900 amount">
                      {fmtEur(byCategory['IMMO_PHYSIQUE'].reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {active.length === 0 && (
            <p className="text-sm text-gray-400 italic">Aucune position active enregistrée.</p>
          )}
        </div>

        {/* ── Dettes ─────────────────────────────────────── */}
        {debts.length > 0 && (
          <div className="border-t-2 border-gray-800 pt-6 overflow-x-auto">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Dettes</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-1.5 text-left font-semibold text-gray-600 text-xs">Libellé</th>
                  <th className="py-1.5 text-left font-semibold text-gray-600 text-xs px-4">Établissement</th>
                  <th className="py-1.5 text-right font-semibold text-gray-600 text-xs">Capital restant</th>
                  <th className="py-1.5 text-right font-semibold text-gray-600 text-xs pl-4">Mensualité</th>
                </tr>
              </thead>
              <tbody>
                {debts.map(d => (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700">
                      {d.label}
                      <span className="ml-2 text-xs text-gray-400">{DETTE_TYPE_LABELS[d.type] ?? d.type}</span>
                    </td>
                    <td className="py-1.5 text-gray-400 text-xs px-4">{d.lender ?? '—'}</td>
                    <td className="py-1.5 text-right font-medium text-red-600 amount">{fmtEur(parseFloat(d.remainingCapital ?? 0))}</td>
                    <td className="py-1.5 text-right text-gray-600 pl-4 amount">{d.monthlyTotal != null ? fmtEur(d.monthlyTotal) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400">
                  <td className="py-1.5 font-bold text-gray-800" colSpan={2}>Total dettes</td>
                  <td className="py-1.5 text-right font-bold text-red-600 amount">{fmtEur(totalDettes)}</td>
                  <td className="py-1.5 text-right font-bold text-gray-700 pl-4 amount">
                    {fmtEur(debts.reduce((s, d) => s + (d.monthlyTotal ?? 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      </div>
      <PatrimoineExplainer />
    </div>
  )
}

function PatrimoineExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-10 border-t border-gray-200 pt-6">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition w-full text-left">
        <span className="text-base">{open ? '▲' : '▼'}</span>
        Comment ça marche ? Comprendre la déclaration de patrimoine
      </button>
      {open && (
        <div className="mt-6 space-y-6 text-sm text-gray-700">

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <p className="font-bold text-blue-800 dark:text-blue-300 text-base mb-3">💡 L'idée en une phrase</p>
            <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
              La déclaration de patrimoine, c'est faire <strong>l'inventaire complet</strong> de tout ce que tu
              possèdes et de tout ce que tu dois — et le dater. Répété chaque année, c'est le meilleur moyen
              de voir si tu progresses vraiment vers la liberté financière.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-4">📖 À quoi ça sert concrètement ?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { titre: 'Suivre ta progression', desc: "Comparer ton patrimoine net d'une année sur l'autre : est-ce que tu t'enrichis vraiment ?", emoji: '📈' },
                { titre: 'Préparer une succession', desc: "Connaître exactement ce que tu as permet à tes proches d'agir vite, sans chercher pendant des mois.", emoji: '🏛️' },
                { titre: "Détecter l'IFI", desc: "Si ton immobilier net dépasse 1,3 M€, tu dois déclarer l'Impôt sur la Fortune Immobilière.", emoji: '⚖️' },
              ].map(({ titre, desc, emoji }) => (
                <div key={titre} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xl mb-2">{emoji}</p>
                  <p className="font-semibold text-gray-800 mb-1">{titre}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-bold text-gray-800 mb-3">⚖️ L'IFI — Impôt sur la Fortune Immobilière</p>
            <p className="text-gray-600 leading-relaxed mb-3 text-xs">
              Depuis 2018, seule <strong>l'immobilier</strong> entre dans le calcul de la fortune taxable
              (l'ancienne ISF taxait tout). Si la valeur nette de tes biens immobiliers dépasse <strong>1,3 M€</strong>,
              tu es assujetti à l'IFI — avec un barème progressif à partir de 800 000 €.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { tranche: "Jusqu'à 800 k€", taux: '0 %' },
                { tranche: '800 k€ → 1,3 M€', taux: '0,5 %' },
                { tranche: '1,3 M€ → 2,57 M€', taux: '0,7 %' },
                { tranche: 'Au-delà de 2,57 M€', taux: '1,5 %' },
              ].map(({ tranche, taux }) => (
                <div key={tranche} className="border border-gray-200 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">{tranche}</p>
                  <p className="text-sm font-bold text-indigo-600 mt-1">{taux}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">La résidence principale bénéficie d'un abattement de 30 % pour le calcul de l'IFI.</p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
            <p className="font-bold text-amber-800 mb-2">📋 Ce qu'on inclut (et ce qu'on exclut)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-semibold text-emerald-700 mb-1">✅ À inclure dans l'actif</p>
                <ul className="text-gray-600 space-y-0.5">
                  <li>• Immobilier (résidence, investissement, SCPI)</li>
                  <li>• Actions, ETF, fonds en bourse</li>
                  <li>• Livrets, assurance-vie, PEA, PER</li>
                  <li>• Voitures, bateaux, objets de valeur</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-red-600 mb-1">❌ À inclure dans le passif</p>
                <ul className="text-gray-600 space-y-0.5">
                  <li>• Capital restant dû sur les crédits immo</li>
                  <li>• Crédits auto en cours</li>
                  <li>• Dettes personnelles</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
