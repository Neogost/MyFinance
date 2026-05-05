/**
 * Calcule l'objectif du matelas de sécurité selon le mode configuré.
 * @param {object} user            - Objet utilisateur (safetyNetMode / safetyNetMonths / safetyNetAmount)
 * @param {object} expensesSummary - Résultat de getExpenseSummary() (champ totalMonthlyExpenses)
 * @param {object} activeContract  - Contrat salarial actif (champ monthlyNetAfterTax)
 * @returns {number|null}          - Objectif en € ou null si les données manquent
 */
/**
 * Estime le revenu mensuel net de référence pour le mode MONTHS_SALARY.
 * Inclut le salaire net après impôt + les primes mensuelles actives (MENSUELLE),
 * converties en net via le ratio net/brut du contrat.
 */
export function computeMonthlyReferenceNet(activeContract) {
  const salary = activeContract?.monthlyNetAfterTax ?? 0
  const bonusGross = activeContract?.monthlyActiveMensuelleGross ?? 0
  if (bonusGross === 0) return salary

  // Ratio net/brut du contrat — fallback 0.75 si données absentes
  const gross = activeContract?.monthlyGrossSalary
  const netRatio = gross > 0 && salary > 0 ? salary / gross : 0.75
  return salary + bonusGross * netRatio
}

export function computeSafetyNetTarget(user, expensesSummary, activeContract) {
  if (!user?.safetyNetMode) return null
  if (user.safetyNetMode === 'FIXED_AMOUNT') return user.safetyNetAmount ?? null
  if (user.safetyNetMode === 'MONTHS_EXPENSES') {
    const total = expensesSummary?.totalMonthlyExpenses
    return total > 0 && user.safetyNetMonths > 0 ? user.safetyNetMonths * total : null
  }
  if (user.safetyNetMode === 'MONTHS_SALARY') {
    const reference = computeMonthlyReferenceNet(activeContract)
    return reference > 0 && user.safetyNetMonths > 0 ? user.safetyNetMonths * reference : null
  }
  return null
}
