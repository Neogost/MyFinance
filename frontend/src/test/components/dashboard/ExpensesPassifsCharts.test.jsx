import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ExpensesByCategoryChart from '../../../components/dashboard/ExpensesByCategoryChart'
import PassifsByCategoryChart from '../../../components/dashboard/PassifsByCategoryChart'
import { getExpenseSummary } from '../../../api/expenses'
import { getPossessionsSummary } from '../../../api/possessions'

vi.mock('../../../api/expenses',   () => ({ getExpenseSummary:     vi.fn() }))
vi.mock('../../../api/possessions', () => ({ getPossessionsSummary: vi.fn() }))

// ── ExpensesByCategoryChart ────────────────────────────────────────────────────

describe('ExpensesByCategoryChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getExpenseSummary.mockReturnValue(new Promise(() => {}))
    render(<ExpensesByCategoryChart />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getExpenseSummary.mockRejectedValue(new Error('network'))
    render(<ExpensesByCategoryChart />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  it('appelle onHasData(false) et ne rend rien quand la liste est vide', async () => {
    getExpenseSummary.mockResolvedValue({ byCategory: [], totalMonthlyExpenses: 0, savingsRate: null })
    const onHasData = vi.fn()
    const { container } = render(<ExpensesByCategoryChart onHasData={onHasData} />)
    await waitFor(() => expect(onHasData).toHaveBeenCalledWith(false))
    expect(container.firstChild).toBeNull()
  })

  it('affiche "Total mensuel" et le label de catégorie avec des données', async () => {
    getExpenseSummary.mockResolvedValue({
      byCategory: [{ category: 'LOGEMENT', monthlyAmount: 1200 }],
      totalMonthlyExpenses: 1200,
      savingsRate: 20,
      savingsCapacity: 300,
    })
    render(<ExpensesByCategoryChart />)
    await waitFor(() => {
      expect(screen.getByText('Total mensuel')).toBeInTheDocument()
      expect(screen.getByText('Logement')).toBeInTheDocument()
    })
  })

  it('affiche la capacité d\'épargne quand savingsRate est renseigné', async () => {
    getExpenseSummary.mockResolvedValue({
      byCategory: [{ category: 'TRANSPORT', monthlyAmount: 200 }],
      totalMonthlyExpenses: 200,
      savingsCapacity: 600,
      savingsRate: 35,
    })
    render(<ExpensesByCategoryChart />)
    await waitFor(() => {
      expect(screen.getByText(/Capacité d'épargne/)).toBeInTheDocument()
    })
  })
})

// ── PassifsByCategoryChart ─────────────────────────────────────────────────────

describe('PassifsByCategoryChart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getPossessionsSummary.mockReturnValue(new Promise(() => {}))
    render(<PassifsByCategoryChart />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getPossessionsSummary.mockRejectedValue(new Error('network'))
    render(<PassifsByCategoryChart />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  it('appelle onHasData(false) et ne rend rien quand la liste est vide', async () => {
    getPossessionsSummary.mockResolvedValue({ byCategory: [], totalEffectiveValue: 0, totalDepreciation: 0, globalDepreciationRate: 0 })
    const onHasData = vi.fn()
    const { container } = render(<PassifsByCategoryChart onHasData={onHasData} />)
    await waitFor(() => expect(onHasData).toHaveBeenCalledWith(false))
    expect(container.firstChild).toBeNull()
  })

  it('affiche "Valeur actuelle totale" et le label de catégorie avec des données', async () => {
    getPossessionsSummary.mockResolvedValue({
      byCategory: [{ category: 'VEHICULE', totalEffectiveValue: 9000, totalDepreciation: 6000 }],
      totalEffectiveValue: 9000,
      totalDepreciation: 6000,
      globalDepreciationRate: 40,
    })
    render(<PassifsByCategoryChart />)
    await waitFor(() => {
      expect(screen.getByText('Valeur actuelle totale')).toBeInTheDocument()
      expect(screen.getByText('Véhicule')).toBeInTheDocument()
    })
  })
})
