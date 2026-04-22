/**
 * Calcule l'objectif du matelas de sécurité selon le mode configuré.
 * @param {object} user            - Objet utilisateur (safetyNetMode / safetyNetMonths / safetyNetAmount)
 * @param {object} expensesSummary - Résultat de getExpenseSummary() (champ totalMonthlyExpenses)
 * @param {object} activeContract  - Contrat salarial actif (champ monthlyNetAfterTax)
 * @returns {number|null}          - Objectif en € ou null si les données manquent
 */
export function computeSafetyNetTarget(user, expensesSummary, activeContract) {
  if (!user?.safetyNetMode) return null
  if (user.safetyNetMode === 'FIXED_AMOUNT') return user.safetyNetAmount ?? null
  if (user.safetyNetMode === 'MONTHS_EXPENSES') {
    const total = expensesSummary?.totalMonthlyExpenses
    return total > 0 && user.safetyNetMonths > 0 ? user.safetyNetMonths * total : null
  }
  if (user.safetyNetMode === 'MONTHS_SALARY') {
    const salary = activeContract?.monthlyNetAfterTax
    return salary != null && salary > 0 && user.safetyNetMonths > 0 ? user.safetyNetMonths * salary : null
  }
  return null
}
