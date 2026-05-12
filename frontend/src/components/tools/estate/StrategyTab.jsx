import { useState, useEffect } from 'react'
import { simulateStrategy } from '../../../api/estate'
import { Tooltip } from '../../patrimoine/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, Legend, LabelList,
} from 'recharts'

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

function Row({ label, value, color = 'text-gray-800', bold = false, indent = false }) {
  return (
    <div className={`flex justify-between items-baseline py-1.5 ${indent ? 'pl-4' : ''} border-b border-gray-100 last:border-0`}>
      <span className={`text-sm ${indent ? 'text-gray-500' : bold ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}

// Barème ligne directe (art. 777 CGI)
function baremeProgressif(taxable) {
  const tranches = [
    { limite: 8072,     taux: 0.05 },
    { limite: 12109,    taux: 0.10 },
    { limite: 15932,    taux: 0.15 },
    { limite: 552324,   taux: 0.20 },
    { limite: 902838,   taux: 0.30 },
    { limite: 1805677,  taux: 0.40 },
    { limite: Infinity, taux: 0.45 },
  ]
  let droits = 0, prev = 0
  for (const { limite, taux } of tranches) {
    if (taxable <= prev) break
    droits += (Math.min(taxable, limite) - prev) * taux
    prev = limite
  }
  return Math.round(droits)
}

// Droits AV (art. 990 I CGI) — primes versées avant 70 ans
function calcDroitsAV(montant, nbBenef) {
  if (nbBenef === 0 || montant <= 0) return 0
  const taxablePerBenef = Math.max(0, montant / nbBenef - 152500)
  const droitsPerBenef = taxablePerBenef <= 700000
    ? taxablePerBenef * 0.20
    : 700000 * 0.20 + (taxablePerBenef - 700000) * 0.3125
  return Math.round(droitsPerBenef * nbBenef)
}

// Droits succession classique sur ce même montant (pour comparaison)
function calcDroitsSuccession(montant, nbBenef) {
  if (nbBenef === 0 || montant <= 0) return 0
  const taxable = Math.max(0, montant / nbBenef - 100000)
  return baremeProgressif(taxable) * nbBenef
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey}>
          {p.dataKey === 'net' ? 'Transmis aux héritiers' : 'Droits perdus'} : <strong>{fmt(p.value)} €</strong>
        </p>
      ))}
    </div>
  )
}

export default function StrategyTab() {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [showBareme,  setShowBareme]  = useState(false)
  const [showAV,      setShowAV]      = useState(false)
  const [montantAV,   setMontantAV]   = useState('')
  const [avNbBenef,   setAvNbBenef]   = useState(1)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true); setError(null)
      const res = await simulateStrategy()
      setData(res)
    } catch {
      setError('Impossible de calculer la stratégie.')
    } finally { setLoading(false) }
  }

  if (loading) return <p className="text-sm text-gray-400">Calcul de la stratégie en cours…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
  if (!data)   return null

  const cumulPP          = parseFloat(data.totalAvecDonationsPP ?? 0)
  const cumulNP          = parseFloat(data.totalAvecDonationsNP ?? 0)
  const droitsSans       = parseFloat(data.droitsSansAnticipationEur ?? 0)
  const patrimoineNet    = parseFloat(data.patrimoineNetEur ?? 0)
  const partParEnfant    = data.nbHeirs > 0 ? patrimoineNet / data.nbHeirs : 0
  const taxableParEnfant = Math.max(0, partParEnfant - 100000)
  const droitsParEnfant  = data.nbHeirs > 0 ? droitsSans / data.nbHeirs : 0

  // Chart comparatif
  const chartData = [
    { scenario: 'Sans anticipation', net: Math.max(0, patrimoineNet - droitsSans), droits: droitsSans },
    { scenario: 'Donations PP',      net: cumulPP, droits: 0 },
    { scenario: '+ Démembrement',    net: cumulNP, droits: 0 },
  ]

  // Assurance-vie
  const avMontant       = parseFloat(montantAV) || 0
  const avBenef         = Math.max(1, avNbBenef)
  const avAbattTotal    = 152500 * avBenef
  const avTaxable       = Math.max(0, avMontant - avAbattTotal)
  const avDroits        = calcDroitsAV(avMontant, avBenef)
  const avDroitsClassiq = calcDroitsSuccession(avMontant, avBenef)
  const avEconomie      = Math.max(0, avDroitsClassiq - avDroits)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── Colonne gauche : contexte + recommandations ── */}
      <div className="flex flex-col gap-4">
        {/* Contexte */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-1">
            Stratégie 15 ans
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">
            Les abattements de donation se renouvellent tous les 15 ans (art. 784 CGI). Anticiper plusieurs cycles permet de transmettre des sommes importantes <strong>sans aucun droit</strong>.
          </p>
        </div>

        {/* Données utilisées */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">Hypothèses de calcul</p>
          </div>
          <div className="px-4 py-2">
            <div className="flex justify-between items-baseline py-1.5 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700 flex items-center">
                Votre âge actuel
                <Tooltip>Lu depuis votre profil (date de naissance). Si non renseigné, on utilise 50 ans par défaut.</Tooltip>
              </span>
              <span className="text-sm font-semibold">{data.userAge} ans</span>
            </div>
            <div className="flex justify-between items-baseline py-1.5 border-b border-gray-100">
              <span className="text-sm text-gray-600 flex items-center">
                Nombre de donateurs
                <Tooltip>2 si la cellule familiale contient un conjoint marié ou pacsé (chacun a ses propres abattements). 1 sinon. Le concubin n'est pas compté.</Tooltip>
              </span>
              <span className="text-sm font-semibold">{data.nbDonors === 2 ? '2 (couple marié/PACS)' : '1 (solo)'}</span>
            </div>
            <div className="flex justify-between items-baseline py-1.5 border-b border-gray-100">
              <span className="text-sm text-gray-600 flex items-center">
                Nombre d'enfants héritiers
                <Tooltip>Compté depuis la cellule familiale (relation = ENFANT, non décédés). Chaque enfant a un abattement de 100 000 € par parent et par cycle.</Tooltip>
              </span>
              <span className="text-sm font-semibold">{data.nbHeirs}</span>
            </div>
            <div className="flex justify-between items-baseline py-1.5">
              <span className="text-sm font-semibold text-gray-700 flex items-center">
                Patrimoine net actuel
                <Tooltip>Calcul automatique : Σ valeurs des positions actives (Bourse, Crypto, Livrets, Liquidités) + Σ valeurs des possessions (immo, voitures…) − Σ dettes en cours.</Tooltip>
              </span>
              <span className="text-sm font-semibold">{fmt(data.patrimoineNetEur)} €</span>
            </div>
          </div>
        </div>

        {/* Recommandations */}
        {data.recommendations?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
            <p className="font-semibold mb-1">💡 Recommandations</p>
            {data.recommendations.map((r, i) => <p key={i}>• {r}</p>)}
          </div>
        )}
      </div>

      {/* ── Colonne centre : timeline des cycles ── */}
      <div className="flex flex-col gap-4 lg:col-span-2">

        {/* Comparaison scénarios */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide font-semibold mb-1 flex items-center justify-center">
              Sans anticipation
              <Tooltip>
                Si vous ne faites rien, tout le patrimoine est transmis à votre décès et les droits
                de succession s'appliquent en une seule fois, sans abattements renouvelés.
                <br/><br/>
                <strong>Détail du calcul :</strong><br/>
                {fmt(patrimoineNet)} € ÷ {data.nbHeirs} enfant{data.nbHeirs > 1 ? 's' : ''} = <strong>{fmt(partParEnfant)} €</strong> / enfant<br/>
                − 100 000 € abattement → taxable : <strong>{fmt(taxableParEnfant)} €</strong><br/>
                × barème 5–45 % → droits / enfant : <strong>{fmt(droitsParEnfant)} €</strong><br/>
                <br/>
                Total : {data.nbHeirs} × {fmt(droitsParEnfant)} € = <strong>{fmt(droitsSans)} €</strong>
              </Tooltip>
            </p>
            <p className="text-xl font-bold text-red-700 dark:text-red-400">{fmt(droitsSans)} €</p>
            <p className="text-xs text-gray-500 mt-1">de droits au décès</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-semibold mb-1 flex items-center justify-center">
              Donations PP cumulées
              <Tooltip>
                Somme des abattements maximums utilisables sur tous les cycles, en pleine propriété.
                Formule par cycle : nb_donateurs × abattement_par_enfant × nb_enfants ({data.nbDonors} × 100 000 € × {data.nbHeirs} = {fmt(data.nbDonors * 100000 * data.nbHeirs)} €).
                Total cumulé sur {data.cycles?.length} cycle{data.cycles?.length > 1 ? 's' : ''} = {fmt(cumulPP)} €.
                C'est le montant exact transmissible sans payer 1 € de droits.
              </Tooltip>
            </p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(cumulPP)} €</p>
            <p className="text-xs text-gray-500 mt-1">transmis sans droits</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wide font-semibold mb-1 flex items-center justify-center">
              + Démembrement
              <Tooltip>
                Pour un bien immobilier transmis en nue-propriété (NP), seule la valeur NP est fiscalisée
                (selon l'âge — art. 669 CGI). Donc avec X € d'abattement on peut transmettre X / ratio_NP
                en valeur pleine propriété. Exemple : à 50 ans, NP = 40 % → 100 k€ d'abattement permet de
                transmettre 250 k€ d'immobilier (vous gardez l'usufruit). Au décès, le nu-propriétaire
                devient plein propriétaire sans droits supplémentaires.
              </Tooltip>
            </p>
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{fmt(cumulNP)} €</p>
            <p className="text-xs text-gray-500 mt-1">de PP transmissible</p>
          </div>
        </div>

        {/* Bar chart comparatif */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Comparaison des scénarios</p>
          <p className="text-xs text-gray-400 mb-4">Patrimoine transmis aux héritiers (vert) vs droits perdus (rouge)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <XAxis dataKey="scenario" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${fmt(v / 1000)} k`} tick={{ fontSize: 11 }} width={60} />
              <RTooltip content={<ChartTooltip />} />
              <Legend
                formatter={v => v === 'net' ? 'Transmis aux héritiers' : 'Droits perdus'}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="net" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="net">
                <LabelList
                  dataKey="net"
                  position="inside"
                  formatter={v => v > 0 ? `${fmt(v / 1000)} k€` : ''}
                  style={{ fill: '#fff', fontSize: 10, fontWeight: 600 }}
                />
              </Bar>
              <Bar dataKey="droits" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="droits">
                <LabelList
                  dataKey="droits"
                  position="top"
                  formatter={v => v > 0 ? `${fmt(v / 1000)} k€` : ''}
                  style={{ fill: '#ef4444', fontSize: 10, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline des cycles */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">
              Frise chronologique — {data.cycles.length} cycle{data.cycles.length > 1 ? 's' : ''} de donation possibles
            </p>
          </div>

          {data.cycles.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Aucun cycle calculable.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.cycles.map((cycle, idx) => {
                const isFirst = idx === 0
                const npPct = Math.round(parseFloat(cycle.npRatio) * 100)
                return (
                  <div key={cycle.cycleNumber} className="px-4 py-4">
                    <div className="flex items-start gap-4">
                      {/* Marqueur visuel */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          isFirst ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 dark:text-indigo-300'
                        }`}>
                          #{cycle.cycleNumber}
                        </div>
                        {idx < data.cycles.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-200 mt-1" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2 mb-2">
                          <p className="text-sm font-bold text-gray-800">
                            Cycle {cycle.cycleNumber} — {cycle.year}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center">
                            (vous aurez {cycle.donorAge} ans · NP = {npPct} %
                            <Tooltip>
                              Barème art. 669 CGI : la valeur de la nue-propriété dépend de l'âge de
                              l'usufruitier (vous) au moment de la donation. À {cycle.donorAge} ans, votre nue-propriété
                              représente {npPct} % de la valeur du bien. Tranches : &lt;21 ans = 10 %, 21-30 = 20 %,
                              31-40 = 30 %, 41-50 = 40 %, 51-60 = 50 %, 61-70 = 60 %, 71-80 = 70 %, 81-90 = 80 %, ≥91 = 90 %.
                            </Tooltip>
                            )
                          </p>
                        </div>

                        {/* Liste héritiers */}
                        <div className="space-y-0.5 text-xs text-gray-600 mb-2">
                          {cycle.heirs.map(h => (
                            <p key={h.heirId}>
                              • <strong>{h.firstName}</strong> :
                              {' '}{fmt(h.totalAbattementEur)} €
                              {h.nbDonors > 1 && (
                                <span className="text-gray-400">
                                  {' '}({h.nbDonors} × {fmt(h.abattementPerDonor)} €)
                                </span>
                              )}
                            </p>
                          ))}
                        </div>

                        {/* Totaux par scénario */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="bg-emerald-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-500 mb-0.5 flex items-center">
                              En pleine propriété
                              <Tooltip>
                                Somme des abattements de chaque enfant pour ce cycle.
                                Ici : {data.nbHeirs} enfant{data.nbHeirs > 1 ? 's' : ''} × {data.nbDonors} donateur{data.nbDonors > 1 ? 's' : ''} × 100 000 € = {fmt(cycle.maxTransmissibleSansDroits)} €.
                                C'est le maximum donnable en cash/titres/meubles sans payer 1 € de droits.
                              </Tooltip>
                            </p>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              {fmt(cycle.maxTransmissibleSansDroits)} €
                            </p>
                          </div>
                          <div className="bg-indigo-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-500 mb-0.5 flex items-center">
                              Avec démembrement (immo)
                              <Tooltip>
                                Si le bien transmis est un immobilier, on ne donne que la nue-propriété
                                (valeur fiscale = NP × valeur PP). Donc on peut transmettre une valeur PP
                                bien plus grande pour le même abattement.
                                Calcul : {fmt(cycle.maxTransmissibleSansDroits)} € / {npPct} % = {fmt(cycle.maxTransmissibleAvecDemembrement)} €.
                                Vous gardez l'usufruit (loyers, usage). À votre décès, le nu-propriétaire devient plein propriétaire sans droits supplémentaires.
                              </Tooltip>
                            </p>
                            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                              {fmt(cycle.maxTransmissibleAvecDemembrement)} €
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Économie totale */}
        {parseFloat(data.economieMaxEur) > 0 && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl px-5 py-4 text-center">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 uppercase tracking-wide font-semibold mb-1 flex items-center justify-center">
              Économie maximale (vs ne rien faire)
              <Tooltip>
                Différence entre les droits estimés en succession (sans rien faire) et 0 € de droits
                (si vous appliquez la stratégie complète et que les donations restent dans les abattements).
                Cela représente l'argent qui reste dans la famille au lieu d'aller au Trésor.
              </Tooltip>
            </p>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              ≈ {fmt(data.economieMaxEur)} €
            </p>
            <p className="text-xs text-gray-600 mt-1">
              de droits de succession évités si vous appliquez la stratégie complète
            </p>
          </div>
        )}

        {/* Assurance-vie */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500">
          <button
            onClick={() => setShowAV(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition w-full text-left"
          >
            <span className="text-base">{showAV ? '▼' : '▶'}</span>
            Assurance-vie — simulation complémentaire
            <span className="ml-auto text-xs font-normal text-gray-400">abattement 152 500 € / bénéficiaire</span>
          </button>
          {showAV && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-3">
                L'assurance-vie est <strong>hors succession civile</strong> (art. 990 I CGI). Chaque bénéficiaire
                bénéficie de 152 500 € d'abattement sur les primes versées avant vos 70 ans, puis d'un taux
                forfaitaire de 20 % (31,25 % au-delà de 700 000 €) — bien plus avantageux que le barème successoral.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Montant du contrat AV (€)
                    </label>
                    <input
                      type="number" min="0" step="1000"
                      value={montantAV}
                      onChange={e => setMontantAV(e.target.value)}
                      placeholder="ex : 200000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Nombre de bénéficiaires
                    </label>
                    <input
                      type="number" min="1" max="10" step="1"
                      value={avNbBenef}
                      onChange={e => setAvNbBenef(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                {/* Résultats */}
                {avMontant > 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 space-y-0">
                    <Row label={`Abattement (${avBenef} × 152 500 €)`} value={`${fmt(avAbattTotal)} €`} />
                    <Row label="Part taxable" value={`${fmt(avTaxable)} €`}
                      color={avTaxable > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} />
                    <Row label="Droits AV (20 % / 31,25 %)" value={`${fmt(avDroits)} €`}
                      bold color={avDroits > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
                    <Row label="Droits si succession classique" value={`${fmt(avDroitsClassiq)} €`}
                      color="text-gray-500" />
                    <div className="border-t-2 border-emerald-200 mt-1 pt-1">
                      <Row label="Économie via AV" value={`≈ ${fmt(avEconomie)} €`}
                        bold color="text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-gray-400 text-xs italic">
                    Saisissez un montant pour voir la simulation
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Barème ligne directe */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500">
          <button
            onClick={() => setShowBareme(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition w-full text-left"
          >
            <span className="text-base">{showBareme ? '▼' : '▶'}</span>
            Barème des droits de succession — ligne directe (art. 777 CGI)
          </button>
          {showBareme && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="text-left px-3 py-1.5 font-semibold rounded-tl">Fraction taxable (par héritier)</th>
                    <th className="text-right px-3 py-1.5 font-semibold rounded-tr">Taux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    ["Jusqu’à 8 072 €",                 '5 %'],
                    ["De 8 072 à 12 109 €",            '10 %'],
                    ["De 12 109 à 15 932 €",           '15 %'],
                    ["De 15 932 à 552 324 €",          '20 %'],
                    ["De 552 324 à 902 838 €",         '30 %'],
                    ["De 902 838 à 1 805 677 €", '40 %'],
                    ["Au-delà de 1 805 677 €",        '45 %'],
                  ].map(([tranche, taux]) => (
                    <tr key={tranche} className="hover:bg-gray-100">
                      <td className="px-3 py-1.5 text-gray-600">{tranche}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-gray-700">{taux}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-gray-400">
                Abattement : <strong className="text-gray-500">100 000 €</strong> par enfant et par parent (renouvelable tous les 15 ans, art. 779 CGI).
                Barème en vigueur — loi de finances 2025.
              </p>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-0.5">
          <p><strong>Hypothèses simplifiées :</strong></p>
          <p>• Les montants donnés à chaque cycle sont les <strong>maximums</strong> permis par les abattements (jamais de droits)</p>
          <p>• Le démembrement suppose un bien immobilier transmis en nue-propriété — vous gardez l'usufruit</p>
          <p>• La fiscalité peut évoluer chaque année (loi de finances). Plan à réviser régulièrement.</p>
          <p>• L'estimation des droits "sans anticipation" suppose une succession au décès, sans testament spécifique.</p>
        </div>
      </div>
    </div>
  )
}
