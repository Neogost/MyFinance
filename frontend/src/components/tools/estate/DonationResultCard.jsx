function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

function Row({ label, value, indent = false, bold = false, color = 'text-gray-800' }) {
  return (
    <div className={`flex justify-between items-baseline py-1.5 ${indent ? 'pl-4' : ''} border-b border-gray-100 last:border-0`}>
      <span className={`text-sm ${indent ? 'text-gray-500' : bold ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}

export default function DonationResultCard({ result, recipientName, hideNotary = false }) {
  if (!result) return null

  const hasDismemberment   = result.npRatio != null
  const droitsPositifs     = parseFloat(result.droits ?? 0) > 0
  const isPartialOwnership = parseFloat(result.ownershipShare ?? 1) < 1
  const isCustomAmount     = result.customAmountEur != null
    || (result.amountGivenEur && result.donorShareEur
        && parseFloat(result.amountGivenEur) < parseFloat(result.donorShareEur) - 0.01)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-700">
          Résultat de la simulation{recipientName ? ` — ${recipientName}` : ''}
        </p>
      </div>

      <div className="px-4 py-2">

        {/* Valeur du bien + co-propriété */}
        <Row label="Valeur totale du bien" value={`${fmt(result.assetValue)} €`} />

        {isPartialOwnership && (
          <>
            <Row
              label={`Quote-part du donateur (${Math.round(parseFloat(result.ownershipShare) * 100)} %)`}
              value={`${fmt(result.donorShareEur)} €`}
              indent
            />
          </>
        )}

        {isCustomAmount && (
          <Row
            label="Montant choisi à donner"
            value={`${fmt(result.amountGivenEur)} €`}
            indent
            bold
            color="text-indigo-700 dark:text-indigo-300"
          />
        )}

        {hasDismemberment && (
          <>
            <Row
              label={`Ratio nue-propriété (art. 669 CGI)`}
              value={`${Math.round(parseFloat(result.npRatio) * 100)} %`}
              indent
            />
            <Row
              label="Valeur fiscale transmise (NP)"
              value={`${fmt(result.valueTransmitted)} €`}
              indent bold
            />
          </>
        )}

        {/* Si ni co-propriété ni démembrement ni montant partiel : afficher la valeur transmise simplement */}
        {!isPartialOwnership && !hasDismemberment && !isCustomAmount && (
          <Row label="Montant transmis" value={`${fmt(result.amountGivenEur)} €`} bold />
        )}

        <Row label="Abattement légal" value={`${fmt(result.abattementBase)} €`} bold />
        {parseFloat(result.abattementUsed ?? 0) > 0 && (
          <Row
            label="Déjà utilisé dans les 15 ans"
            value={`− ${fmt(result.abattementUsed)} €`}
            indent color="text-amber-600 dark:text-amber-400"
          />
        )}
        <Row
          label="Abattement disponible"
          value={`${fmt(result.abattementResiduel)} €`}
          indent color="text-emerald-600 dark:text-emerald-400"
        />

        <Row
          label="Part taxable"
          value={`${fmt(result.taxable)} €`}
          bold
          color={droitsPositifs ? 'text-red-600 dark:text-red-400' : 'text-gray-800'}
        />
        <Row
          label="Droits à payer (estimation)"
          value={`${fmt(result.droits)} €`}
          bold
          color={droitsPositifs ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
        />

        {!hideNotary && (
          <>
            {/* Détail des frais de notaire */}
            <div className="pt-2">
              <Row label="Émoluments du notaire (TTC)" value={`≈ ${fmt(result.emolumentsTtcEur)} €`}
                indent color="text-gray-600" />
              {parseFloat(result.taxePubliciteFonciereEur ?? 0) > 0 && (
                <Row label="Taxe de publicité foncière (0,60 %)"
                  value={`+ ${fmt(result.taxePubliciteFonciereEur)} €`}
                  indent color="text-gray-600" />
              )}
              {parseFloat(result.contributionSecuriteImmoEur ?? 0) > 0 && (
                <Row label="Contribution sécurité immobilière (0,10 %)"
                  value={`+ ${fmt(result.contributionSecuriteImmoEur)} €`}
                  indent color="text-gray-600" />
              )}
              <Row label="Frais de formalités (forfait)"
                value={`+ ${fmt(result.fraisFormalitesEur)} €`}
                indent color="text-gray-600" />
              <Row label="Frais de notaire totaux"
                value={`≈ ${fmt(result.notaryFeesEur)} €`}
                bold color="text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex justify-between items-baseline py-2 border-t-2 border-gray-200 mt-1">
              <span className="text-sm font-bold text-gray-700">Coût total (droits + notaire)</span>
              <span className="text-base font-bold text-red-600 dark:text-red-400">
                ≈ {fmt(result.totalCostEur)} €
              </span>
            </div>
          </>
        )}
      </div>

      {/* Résultat net — affichage différencié pour le démembrement */}
      <div className={`px-4 py-3 border-t-2 border-gray-300 ${droitsPositifs ? 'bg-orange-50' : 'bg-emerald-50'}`}>
        {hasDismemberment ? (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-700">
                {recipientName ?? 'Le bénéficiaire'} reçoit aujourd'hui
              </span>
              <span className="text-base font-semibold text-emerald-700 dark:text-emerald-300">
                Nue-propriété ≈ {fmt(result.valueTransmitted)} €
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Au décès du donateur, plein propriétaire de</span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                {fmt(result.amountGivenEur)} €
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-700">
              {recipientName ?? 'Le bénéficiaire'} reçoit net
            </span>
            <span className={`text-xl font-bold ${droitsPositifs ? 'text-orange-700 dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {fmt(result.netReceived)} €
            </span>
          </div>
        )}
      </div>

      {/* Avertissement / astuce */}
      {result.warning && (
        <div className={`px-4 py-3 border-t border-gray-200 text-xs leading-relaxed ${
          result.warning.startsWith('💡')
            ? 'bg-indigo-50 text-indigo-700 dark:text-indigo-300'
            : 'bg-amber-50 text-amber-800 dark:text-amber-300'
        }`}>
          {result.warning}
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 bg-gray-50 space-y-0.5">
        <p>Frais calculés sur la valeur fiscale transmise (réduite si démembrement).</p>
        <p>Le notaire peut demander une provision supplémentaire (refundable après l'acte).</p>
        <p className="pt-0.5">Calcul indicatif — consultez un notaire avant toute donation.</p>
      </div>
    </div>
  )
}
