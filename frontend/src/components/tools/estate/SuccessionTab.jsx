import { useState, useEffect } from 'react'
import { simulateSuccession } from '../../../api/estate'
import { Tooltip } from '../../patrimoine/utils'

const RELATION_LABELS = {
  CONJOINT: 'Conjoint / PACS', ENFANT: 'Enfant', PETIT_ENFANT: 'Petit-enfant',
  ARRIERE_PETIT_ENFANT: 'Arrière-petit-enfant', FRERE_SOEUR: 'Frère/Sœur',
  NEVEU_NIECE: 'Neveu/Nièce', AUTRE: 'Autre',
}

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

function fmtRatio(r) {
  if (r == null) return '—'
  const v = parseFloat(r)
  if (v === 0.5)   return '1/2'
  if (Math.abs(v - 0.6667) < 0.001) return '2/3'
  if (v === 0.75)  return '3/4'
  return `${(v * 100).toFixed(0)} %`
}

function Row({ label, value, color = 'text-gray-800', bold = false, indent = false, big = false }) {
  return (
    <div className={`flex justify-between items-baseline py-2 ${indent ? 'pl-4' : ''} border-b border-gray-100 last:border-0`}>
      <span className={`text-sm ${indent ? 'text-gray-500' : bold ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>
        {label}
      </span>
      <span className={`${big ? 'text-base font-bold' : 'text-sm font-semibold'} ${color}`}>{value}</span>
    </div>
  )
}

export default function SuccessionTab() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true); setError(null)
      const res = await simulateSuccession()
      setData(res)
    } catch {
      setError('Impossible de calculer la simulation de succession.')
    } finally { setLoading(false) }
  }

  if (loading) return <p className="text-sm text-gray-400">Calcul de la succession en cours…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
  if (!data)   return null

  const totalDroits = parseFloat(data.totalDroitsEur ?? 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ── Colonne gauche : composition du patrimoine ── */}
      <div className="flex flex-col gap-4">

        {/* Bandeau date */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-1">
            Simulation de succession
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">
            Au {data.simulationDate} — état du patrimoine et de la cellule familiale aujourd'hui
          </p>
        </div>

        {/* Composition du patrimoine */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">Patrimoine au décès</p>
          </div>
          <div className="px-4 py-2">
            <Row label="Positions financières (Bourse, Crypto, Livret, Liquidités)" value={`${fmt(data.positionsValueEur)} €`} />
            <Row label="Possessions (immobilier, voitures, autres)" value={`${fmt(data.possessionsValueEur)} €`} />
            <Row label="Dettes en cours" value={`− ${fmt(data.debtsRemainingEur)} €`}
              color="text-red-600 dark:text-red-400" />
            <Row
              label={
                <span className="inline-flex items-center">
                  Patrimoine net
                  <Tooltip>
                    <strong>Patrimoine net</strong> = positions financières + possessions − dettes en cours.
                    C'est l'assiette de départ avant application du régime matrimonial et avant rapport des donations passées.
                  </Tooltip>
                </span>
              }
              value={`${fmt(data.patrimoineNetEur)} €`} bold color="text-gray-800" />
            {parseFloat(data.partRegimeMatrimonialEur ?? 0) > 0 && (
              <Row
                label={
                  <span className="inline-flex items-center">
                    − Part du conjoint (régime communauté : 50 %)
                    <Tooltip>
                      <strong>Régime de la communauté légale</strong> : la moitié du patrimoine appartient
                      <em> de plein droit</em> au conjoint survivant et n'entre pas dans la succession.
                      <br/><br/>
                      Calcul : patrimoine net × 50 % = {fmt(data.patrimoineNetEur)} × 0,5 = <strong>{fmt(data.partRegimeMatrimonialEur)} €</strong>.
                    </Tooltip>
                  </span>
                }
                value={`− ${fmt(data.partRegimeMatrimonialEur)} €`}
                indent color="text-blue-600 dark:text-blue-400" />
            )}
            {parseFloat(data.donationsRapporteesEur ?? 0) > 0 && (
              <Row
                label={
                  <span className="inline-flex items-center">
                    + Donations rapportées (15 dernières années)
                    <Tooltip>
                      <strong>Rappel fiscal des 15 ans</strong> (art. 784 CGI) : les donations effectuées dans les 15 ans
                      précédant le décès sont rapportées à la masse successorale pour le calcul des droits.
                      Cela évite de fractionner artificiellement le patrimoine pour échapper à l'imposition.
                    </Tooltip>
                  </span>
                }
                value={`+ ${fmt(data.donationsRapporteesEur)} €`}
                indent color="text-amber-600 dark:text-amber-400" />
            )}
            <div className="flex justify-between items-baseline py-2 border-t-2 border-gray-200 mt-1">
              <span className="text-sm font-bold text-gray-700 inline-flex items-center">
                Masse successorale
                <Tooltip>
                  <strong>Masse successorale</strong> = patrimoine net
                  {parseFloat(data.partRegimeMatrimonialEur ?? 0) > 0 && ' − part du conjoint (régime matrimonial)'}
                  {parseFloat(data.donationsRapporteesEur ?? 0) > 0 && ' + donations rapportées (&lt; 15 ans)'}.
                  <br/><br/>
                  C'est sur cette base que sont calculées la réserve héréditaire, la quotité disponible
                  et la part attribuée à chaque héritier.
                </Tooltip>
              </span>
              <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                {fmt(data.masseSuccessoraleEur)} €
              </span>
            </div>
          </div>
        </div>

        {/* Composition familiale */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">Cellule familiale</p>
          </div>
          <div className="px-4 py-3 space-y-1.5 text-sm">
            {data.hasConjoint && (
              <p className="text-gray-700">
                {data.unionType === 'MARIAGE' ? '💍' : data.unionType === 'PACS' ? '📝' : '👫'}{' '}
                <strong>{data.conjointName}</strong>
                {data.unionType === 'MARIAGE' && (
                  <span className="text-gray-500 text-xs"> — marié(e)
                    {data.matrimonialRegime === 'COMMUNAUTE' ? ' (communauté légale)' : ' (séparation de biens)'}
                    , exonéré
                  </span>
                )}
                {data.unionType === 'PACS' && (
                  <span className="text-amber-600 dark:text-amber-400 text-xs"> — pacsé(e), exonéré mais pas héritier sans testament</span>
                )}
                {data.unionType === 'CONCUBINAGE' && (
                  <span className="text-red-600 dark:text-red-400 text-xs"> — concubin(e), pas d'héritage par défaut + 60 % de droits</span>
                )}
              </p>
            )}
            <p className="text-gray-700">
              👶 <strong>Enfants :</strong> {data.nbEnfants} {data.nbEnfants > 1 ? 'descendants' : 'descendant'}
            </p>
            {!data.hasConjoint && data.nbEnfants === 0 && (
              <p className="text-amber-600 dark:text-amber-400 text-xs">
                ⚠ Aucun héritier identifié dans la cellule familiale.
              </p>
            )}
          </div>
        </div>

        {/* Répartition légale */}
        {data.nbEnfants > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-700">Répartition légale (art. 913 Code civil)</p>
            </div>
            <div className="px-4 py-2">
              <Row
                label={
                  <span className="inline-flex items-center">
                    Réserve héréditaire ({fmtRatio(data.reserveRatio)} pour {data.nbEnfants} enfant{data.nbEnfants > 1 ? 's' : ''})
                    <Tooltip>
                      <strong>Réserve héréditaire</strong> (art. 913 Code civil) : part du patrimoine qui revient
                      <em> obligatoirement</em> aux enfants, même contre la volonté du défunt.
                      <br/><br/>
                      • 1 enfant → 1/2 de la masse<br/>
                      • 2 enfants → 2/3 de la masse<br/>
                      • 3 enfants ou plus → 3/4 de la masse<br/><br/>
                      Calcul : {fmt(data.masseSuccessoraleEur)} × {fmtRatio(data.reserveRatio)} = <strong>{fmt(data.reserveHereditaireEur)} €</strong>.
                    </Tooltip>
                  </span>
                }
                value={`${fmt(data.reserveHereditaireEur)} €`}
                color="text-emerald-700 dark:text-emerald-300" bold />
              <Row
                label={
                  <span className="inline-flex items-center">
                    Quotité disponible (libre attribution par testament)
                    <Tooltip>
                      <strong>Quotité disponible</strong> = masse successorale − réserve héréditaire.
                      <br/><br/>
                      C'est la part dont vous pouvez disposer librement par testament : conjoint au-delà de sa part légale,
                      tiers, association, etc. Sans testament, elle est répartie entre les héritiers selon les règles légales
                      (par défaut : conjoint 1/4 PP + enfants partagent le reste).
                      <br/><br/>
                      Calcul : {fmt(data.masseSuccessoraleEur)} − {fmt(data.reserveHereditaireEur)} = <strong>{fmt(data.quotiteDisponibleEur)} €</strong>.
                    </Tooltip>
                  </span>
                }
                value={`${fmt(data.quotiteDisponibleEur)} €`}
                color="text-blue-700 dark:text-blue-300" bold />
            </div>
          </div>
        )}
      </div>

      {/* ── Colonne droite : héritiers et droits ── */}
      <div className="flex flex-col gap-4">
        {data.heirs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">⚠️</p>
            <p className="text-sm">Aucun héritier identifié.</p>
            <p className="text-xs mt-1">Ajoutez vos proches via "Gérer la famille".</p>
          </div>
        ) : (
          <>
            {data.heirs.map(heir => {
              const partRegime = parseFloat(data.partRegimeMatrimonialEur ?? 0)
              const isConjoint = heir.relation === 'CONJOINT'
              const partTotal = parseFloat(heir.partEur ?? 0)
              const partSuccessorale = isConjoint ? Math.max(0, partTotal - partRegime) : partTotal
              const masseSucc = parseFloat(data.masseSuccessoraleEur ?? 0)
              const successoralRatio = masseSucc > 0 ? (partSuccessorale / masseSucc) : 0
              return (
              <div key={heir.memberId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className={`px-4 py-3 border-b border-gray-200 ${heir.exonere ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-bold text-gray-800">
                    {heir.firstName} <span className="font-normal text-gray-500 text-xs">— {RELATION_LABELS[heir.relation]}</span>
                  </p>
                </div>
                <div className="px-4 py-2">
                  <Row
                    label={
                      <span className="inline-flex items-center">
                        Part attribuée
                        {isConjoint && partRegime > 0 ? (
                          <Tooltip>
                            <strong>Part totale du conjoint</strong> = part au titre du régime matrimonial
                            + part successorale. Le détail est affiché ci-dessous.
                          </Tooltip>
                        ) : isConjoint ? (
                          <Tooltip>
                            Part attribuée au conjoint sur la masse successorale.
                            {data.unionType === 'MARIAGE' && data.nbEnfants > 0 && ' Par défaut : 1/4 en pleine propriété (option légale).'}
                            {data.unionType === 'MARIAGE' && data.nbEnfants === 0 && ' En l\'absence d\'enfants, le conjoint hérite de la totalité (sauf parents survivants).'}
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            Part attribuée à cet héritier après application de la réserve héréditaire
                            et de la quotité disponible (répartie à parts égales entre les enfants par défaut).
                          </Tooltip>
                        )}
                      </span>
                    }
                    value={`${fmt(heir.partEur)} €`} bold color="text-gray-800" />
                  {isConjoint && partRegime > 0 && (
                    <>
                      <Row
                        label={
                          <span className="inline-flex items-center text-xs">
                            ↳ Part régime matrimonial (50 % du patrimoine)
                            <Tooltip>
                              <strong>Communauté légale</strong> : la moitié du patrimoine net appartient déjà
                              au conjoint avant tout calcul successoral. Ce n'est pas un héritage,
                              c'est la liquidation du régime matrimonial.
                              <br/><br/>
                              Calcul : {fmt(data.patrimoineNetEur)} × 50 % = <strong>{fmt(partRegime)} €</strong>.
                            </Tooltip>
                          </span>
                        }
                        value={`${fmt(partRegime)} €`}
                        indent color="text-blue-600 dark:text-blue-400" />
                      <Row
                        label={
                          <span className="inline-flex items-center text-xs">
                            ↳ Part successorale ({(successoralRatio * 100).toFixed(0)} % de la masse)
                            <Tooltip>
                              <strong>Part successorale du conjoint</strong>
                              {data.unionType === 'MARIAGE' && data.nbEnfants > 0
                                && ' : 1/4 en pleine propriété de la masse successorale (option légale par défaut, art. 757 CC).'}
                              {data.unionType === 'MARIAGE' && data.nbEnfants === 0
                                && ' : la totalité de la masse successorale en l\'absence d\'enfants.'}
                              <br/><br/>
                              Calcul : {fmt(masseSucc)} × {(successoralRatio * 100).toFixed(0)} % = <strong>{fmt(partSuccessorale)} €</strong>.
                            </Tooltip>
                          </span>
                        }
                        value={`${fmt(partSuccessorale)} €`}
                        indent color="text-indigo-600 dark:text-indigo-400" />
                    </>
                  )}
                  {isConjoint && partRegime === 0 && partSuccessorale > 0 && (
                    <Row
                      label={
                        <span className="inline-flex items-center text-xs text-gray-500">
                          ↳ {(successoralRatio * 100).toFixed(0)} % de la masse successorale
                        </span>
                      }
                      value={`${fmt(masseSucc)} × ${(successoralRatio * 100).toFixed(0)} %`}
                      indent color="text-gray-500" />
                  )}
                  {!heir.exonere && (
                    <>
                      <Row label="Abattement légal" value={`${fmt(heir.abattementBaseEur)} €`} indent />
                      {parseFloat(heir.abattementUsedEur ?? 0) > 0 && (
                        <Row label="Déjà utilisé (donations < 15 ans)"
                          value={`− ${fmt(heir.abattementUsedEur)} €`}
                          indent color="text-amber-600 dark:text-amber-400" />
                      )}
                      <Row label="Abattement disponible"
                        value={`${fmt(heir.abattementResiduelEur)} €`}
                        indent color="text-emerald-600 dark:text-emerald-400" />
                      <Row label="Part taxable" value={`${fmt(heir.taxableEur)} €`}
                        bold color={parseFloat(heir.droitsEur) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800'} />
                      <Row label="Droits de succession" value={`${fmt(heir.droitsEur)} €`}
                        bold color={parseFloat(heir.droitsEur) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
                    </>
                  )}
                </div>
                <div className={`px-4 py-3 border-t-2 border-gray-300 flex justify-between items-center ${heir.exonere ? 'bg-emerald-50' : parseFloat(heir.droitsEur) > 0 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
                  <span className="text-sm font-bold text-gray-700">Reçoit net</span>
                  <span className={`text-lg font-bold ${heir.exonere || parseFloat(heir.droitsEur) === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'}`}>
                    {fmt(heir.netReceivedEur)} €
                  </span>
                </div>
                {heir.note && (
                  <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 bg-gray-50">
                    {heir.note}
                  </div>
                )}
              </div>
              )
            })}

            {/* Total */}
            <div className="bg-white rounded-xl shadow-sm border-2 border-indigo-200 overflow-hidden">
              <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-200">
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Total succession</p>
              </div>
              <div className="px-4 py-2">
                <Row label="Droits de succession totaux" value={`${fmt(data.totalDroitsEur)} €`}
                  color={totalDroits > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} bold />
                <div className="flex justify-between items-baseline py-2 border-t-2 border-gray-200">
                  <span className="text-sm font-bold text-gray-700">Total reçu net par les héritiers</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                    {fmt(data.totalNetReceivedEur)} €
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Avertissements */}
        {data.warnings && data.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold mb-1">À noter</p>
            {data.warnings.map((w, i) => <p key={i}>• {w}</p>)}
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
          <p><strong>Hypothèses simplifiées :</strong></p>
          <p>• Conjoint exonéré de droits de succession (loi TEPA 2007)</p>
          <p>• Distribution par défaut : conjoint 1/4 PP + enfants se partagent les 3/4 (modifiable par testament)</p>
          <p>• Assurance-vie traitée séparément (hors succession civile, art. 990 I CGI)</p>
          <p>• Calcul indicatif — consultez un notaire pour planifier votre succession.</p>
        </div>
      </div>
    </div>
  )
}
