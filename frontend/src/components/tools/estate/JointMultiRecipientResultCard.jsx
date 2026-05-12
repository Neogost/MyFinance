const RELATION_LABELS = {
  CONJOINT: 'Conjoint / PACS', ENFANT: 'Enfant', PETIT_ENFANT: 'Petit-enfant',
  ARRIERE_PETIT_ENFANT: 'Arrière-petit-enfant', FRERE_SOEUR: 'Frère/Sœur',
  NEVEU_NIECE: 'Neveu/Nièce', AUTRE: 'Autre',
}

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

function Row({ label, value, indent = false, bold = false, color = 'text-gray-800' }) {
  return (
    <div className={`flex justify-between items-baseline py-1.5 ${indent ? 'pl-4' : ''} border-b border-gray-100 last:border-0`}>
      <span className={`text-sm ${indent ? 'text-gray-500' : bold ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}

export default function JointMultiRecipientResultCard({ result }) {
  if (!result) return null

  const totalDroits = parseFloat(result.totalDroitsEur ?? 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Bandeau résumé */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-1">
          Donation conjointe à {result.recipients?.length ?? 0} bénéficiaire{result.recipients?.length > 1 ? 's' : ''}
        </p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400">
          {result.donor1Name} + {result.donor2Name} → {result.abattementSummary}
        </p>
      </div>

      {/* Cards par bénéficiaire */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.recipients.map(r => {
          const droits = parseFloat(r.totalDroitsEur ?? 0)
          return (
            <div key={r.recipientId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <p className="text-sm font-bold text-gray-800">
                  {r.firstName} <span className="font-normal text-gray-500 text-xs">— {RELATION_LABELS[r.relation]}</span>
                </p>
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  {Math.round(parseFloat(r.share) * 100)} %
                </span>
              </div>

              <div className="px-4 py-2">
                <Row label="Part totale reçue" value={`${fmt(r.totalAllocatedEur)} €`} bold />
                <Row label={`↳ contribution ${result.donor1Name}`}
                  value={`${fmt(r.donor1ContributionEur)} €`} indent />
                <Row label={`↳ contribution ${result.donor2Name}`}
                  value={`${fmt(r.donor2ContributionEur)} €`} indent />

                <Row label="Abattements cumulés (les 2 donateurs)"
                  value={`${fmt(r.totalAbattementBaseEur)} €`} bold />
                {parseFloat(r.totalAbattementUsedEur ?? 0) > 0 && (
                  <Row label="Déjà utilisés (donations < 15 ans)"
                    value={`− ${fmt(r.totalAbattementUsedEur)} €`}
                    indent color="text-amber-600 dark:text-amber-400" />
                )}
                <Row label="Abattements disponibles"
                  value={`${fmt(r.totalAbattementResiduelEur)} €`}
                  indent color="text-emerald-600 dark:text-emerald-400" />

                <Row label="Part taxable" value={`${fmt(r.totalTaxableEur)} €`}
                  bold color={droits > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800'} />
                <Row label="Droits totaux" value={`${fmt(r.totalDroitsEur)} €`}
                  bold color={droits > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
                {droits > 0 && (
                  <>
                    <Row label={`↳ droits sur part ${result.donor1Name}`}
                      value={`${fmt(r.donor1DroitsEur)} €`} indent
                      color={parseFloat(r.donor1DroitsEur) > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500'} />
                    <Row label={`↳ droits sur part ${result.donor2Name}`}
                      value={`${fmt(r.donor2DroitsEur)} €`} indent
                      color={parseFloat(r.donor2DroitsEur) > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500'} />
                  </>
                )}
              </div>

              <div className={`px-4 py-3 border-t-2 border-gray-300 flex justify-between items-center ${droits > 0 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
                <span className="text-sm font-bold text-gray-700">Reçoit net</span>
                <span className={`text-lg font-bold ${droits > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {fmt(r.netReceivedEur)} €
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Total consolidé */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">
            Total — donation conjointe à {result.recipients?.length ?? 0} bénéficiaire{result.recipients?.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="px-4 py-2">
          <Row label="Montant total transmis"
            value={`${fmt(result.totalAmountGivenEur)} €`} bold color="text-gray-800" />
          <Row label="Droits totaux cumulés"
            value={`${fmt(result.totalDroitsEur)} €`}
            color={totalDroits > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />
          <Row label="Frais de notaire (1 seul acte)"
            value={`≈ ${fmt(result.notaryFeesEur)} €`}
            color="text-orange-600 dark:text-orange-400" />
          <div className="flex justify-between items-baseline py-2 border-t-2 border-gray-200">
            <span className="text-sm font-bold text-gray-700">Coût total à débourser</span>
            <span className="text-base font-bold text-red-600 dark:text-red-400">≈ {fmt(result.totalCostEur)} €</span>
          </div>
        </div>

        <div className={`px-4 py-3 border-t-2 border-gray-300 flex justify-between items-center ${totalDroits > 0 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
          <span className="text-sm font-bold text-gray-700">Total reçu net (tous bénéficiaires)</span>
          <span className={`text-xl font-bold ${totalDroits > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {fmt(result.totalNetReceivedEur)} €
          </span>
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 bg-gray-50 space-y-0.5">
          {result.warnings?.map((w, i) => <p key={i}>• {w}</p>)}
          <p>Chaque pair (donateur, bénéficiaire) bénéficie de son propre abattement (cumulables).</p>
          <p>Calcul indicatif — consultez un notaire avant toute donation.</p>
        </div>
      </div>
    </div>
  )
}
