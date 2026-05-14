import { useState, useEffect } from 'react'
import { getSalaryContracts, getOtherIncomes } from '../api/income'
import { getPositions } from '../api/patrimoine'
import { simulateTax } from '../api/tools'
import { PROJECTION_RATES } from '../components/patrimoine/constants'

/**
 * Calcule la capacité d'épargne mensuelle en suivant la même formule que le widget FIRE :
 *   revenus = salaire net + revenus complémentaires + revenus passifs estimés (positions × taux)
 *   dépenses = totalMonthlyExpenses + impôts mensuels estimés
 *   capacité = revenus - dépenses
 *
 * @param {number|null} totalMonthlyExpenses - total mensuel des dépenses récurrentes (depuis ExpenseSummaryDto)
 */
export function useSavingsCapacity(totalMonthlyExpenses) {
  const [savingsCapacity, setSavingsCapacity] = useState(null)
  const [savingsRate,     setSavingsRate]     = useState(null)
  const [loading,         setLoading]         = useState(false)

  useEffect(() => {
    if (totalMonthlyExpenses == null) return

    setLoading(true)
    Promise.all([
      getSalaryContracts(),
      getOtherIncomes(),
      getPositions({ status: 'ACTIVE' }),
      simulateTax().catch(() => null),
    ]).then(([contracts, otherIncomes, positions, taxResult]) => {
      const activeContract  = contracts.find(c => !c.endDate) ?? contracts[0] ?? null
      const monthlySalary   = activeContract?.monthlyNetAfterTax ?? activeContract?.monthlyNetImposable ?? 0

      const totalOtherIncome = otherIncomes
        .filter(oi => ['LOCATIF', 'DIVIDENDE', 'AIDE_SOCIALE'].includes(oi.type))
        .reduce((s, oi) => s + (oi.amount ?? 0), 0)

      const totalInvestIncome = positions.reduce((s, pos) => {
        if (!['BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'LIVRET'].includes(pos.category)) return s
        return s + ((pos.computed?.currentValueEur ?? 0) * (PROJECTION_RATES[pos.category] ?? 0)) / 12
      }, 0)

      const totalRevenues = monthlySalary + totalOtherIncome + totalInvestIncome
      const monthlyTax    = taxResult?.totalEstimatedTax != null ? taxResult.totalEstimatedTax / 12 : 0
      const totalExpenses = totalMonthlyExpenses + monthlyTax

      const capacity = totalRevenues - totalExpenses
      const rate     = totalRevenues > 0 ? (capacity / totalRevenues) * 100 : null

      setSavingsCapacity(capacity)
      setSavingsRate(rate)
    })
    .catch(() => {})
    .finally(() => setLoading(false))
  }, [totalMonthlyExpenses])

  return { savingsCapacity, savingsRate, loading }
}
