import DonationResultCard from './DonationResultCard'

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

export default function JointDonationResultCard({ result, recipientName }) {
  if (!result) return null

  const totalDroits     = parseFloat(result.totalDroitsEur ?? 0)
  const totalAmount     = parseFloat(result.totalAmountGivenEur ?? 0)
  const valueTransmit1  = parseFloat(result.donor1?.valueTransmitted ?? 0)
  const valueTransmit2  = parseFloat(result.donor2?.valueTransmitted ?? 0)
  const totalTransmit   = valueTransmit1 + valueTransmit2
  // En démembrement, la valeur fiscale transmise (NP) est inférieure au montant en pleine propriété
  const isDismembered   = result.donor1?.npRatio != null

  return (
    <div className="flex flex-col gap-4">
      {/* Bandeau résumé */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-1">
          Donation conjointe — résumé
        </p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400">{result.abattementSummary}</p>
      </div>

      {/* Deux colonnes individuelles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {result.donor1Name}
          </p>
          <DonationResultCard result={result.donor1} recipientName={recipientName} hideNotary />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {result.donor2Name}
          </p>
          <DonationResultCard result={result.donor2} recipientName={recipientName} hideNotary />
        </div>
      </div>

      {/* Total consolidé */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">Total — donation des deux donateurs</p>
        </div>
        <div className="px-4 py-2 space-y-0">

          {/* En démembrement : afficher la valeur en PP ET la valeur fiscale (NP) */}
          {isDismembered ? (
            <>
              <Row label="Valeur en pleine propriété (à terme)"
                value={`${fmt(totalAmount)} €`} color="text-gray-700" />
              <Row label="Valeur fiscale transmise aujourd'hui (NP)"
                value={`${fmt(totalTransmit)} €`} color="text-gray-700" bold />
            </>
          ) : (
            <Row label="Montant total transmis" value={`${fmt(totalAmount)} €`} color="text-gray-800" bold />
          )}

          <Row label="Droits totaux (donateur 1 + donateur 2)"
            value={`${fmt(result.totalDroitsEur)} €`}
            color={totalDroits > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} />

          <Row label="Frais de notaire (1 seul acte)"
            value={`≈ ${fmt(result.notaryFeesEur)} €`}
            color="text-orange-600 dark:text-orange-400" />

          <div className="flex justify-between items-baseline py-2 border-t-2 border-gray-200">
            <span className="text-sm font-bold text-gray-700">Coût total à débourser (droits + notaire)</span>
            <span className="text-base font-bold text-red-600 dark:text-red-400">≈ {fmt(result.totalCostEur)} €</span>
          </div>
        </div>

        {/* Bénéficiaire reçoit */}
        <div className={`px-4 py-3 border-t-2 border-gray-300 ${totalDroits > 0 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
          {isDismembered ? (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">
                  {recipientName ?? 'Le bénéficiaire'} reçoit aujourd'hui
                </span>
                <span className="text-base font-semibold text-emerald-700 dark:text-emerald-300">
                  Nue-propriété ≈ {fmt(totalTransmit)} €
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Au décès du dernier donateur, plein propriétaire de</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalAmount)} €</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-700">{recipientName ?? 'Le bénéficiaire'} reçoit net</span>
              <span className={`text-xl font-bold ${totalDroits > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {fmt(result.netReceived)} €
              </span>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 bg-gray-50 space-y-0.5">
          {isDismembered && (
            <p>
              <strong>En démembrement :</strong> {recipientName ?? 'le bénéficiaire'} reçoit la nue-propriété
              maintenant (ne peut pas vendre/utiliser librement). Au décès du dernier donateur,
              il devient automatiquement plein propriétaire <strong>sans droits supplémentaires</strong>.
            </p>
          )}
          <p>Les droits de chaque donateur sont calculés indépendamment sur leur abattement propre.</p>
          <p>Frais de notaire calculés une seule fois (un seul acte couvre les deux donations).</p>
          <p>Les frais de notaire sont à payer maintenant (généralement par le donataire, mais ça peut être convenu autrement).</p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color, bold = false }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-gray-100 last:border-0">
      <span className={`text-sm ${bold ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}
