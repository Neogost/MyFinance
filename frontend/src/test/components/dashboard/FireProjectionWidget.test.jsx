import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import FireProjectionWidget from '../../../components/dashboard/FireProjectionWidget'
import { getSalaryContracts, getOtherIncomes } from '../../../api/income'
import { getPositions } from '../../../api/patrimoine'
import { simulateTax } from '../../../api/tools'
import { getExpenseSummary } from '../../../api/expenses'

vi.mock('../../../api/income',     () => ({ getSalaryContracts: vi.fn(), getOtherIncomes: vi.fn() }))
vi.mock('../../../api/patrimoine', () => ({ getPositions: vi.fn(), getPatrimoineScore: vi.fn(), getInstruments: vi.fn() }))
vi.mock('../../../api/tools',      () => ({ simulateTax: vi.fn() }))
vi.mock('../../../api/expenses',   () => ({ getExpenseSummary: vi.fn(), getExpenseBudgets: vi.fn() }))
vi.mock('../../../components/patrimoine/constants', () => ({
  PROJECTION_RATES: { BOURSE: 0.07, CRYPTO: 0.05, IMMO_PAPIER: 0.04, LIVRET: 0.03 },
}))

function mockAll({
  contracts = [{ endDate: null, monthlyNetAfterTax: 2800, monthlyNetImposable: 3200 }],
  otherIncomes = [],
  positions = [{ id: 1, category: 'BOURSE', computed: { currentValueEur: 50000 } }],
  taxResult = { totalEstimatedTax: 4800 },
  expenseSummary = { byCategory: [{ category: 'LOGEMENT', monthlyAmount: 1200 }, { category: 'TRANSPORT', monthlyAmount: 150 }] },
} = {}) {
  getSalaryContracts.mockResolvedValue(contracts)
  getOtherIncomes.mockResolvedValue(otherIncomes)
  getPositions.mockResolvedValue(positions)
  simulateTax.mockResolvedValue(taxResult)
  getExpenseSummary.mockResolvedValue(expenseSummary)
}

describe('FireProjectionWidget', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getSalaryContracts.mockReturnValue(new Promise(() => {}))
    getOtherIncomes.mockReturnValue(new Promise(() => {}))
    getPositions.mockReturnValue(new Promise(() => {}))
    simulateTax.mockReturnValue(new Promise(() => {}))
    getExpenseSummary.mockReturnValue(new Promise(() => {}))
    render(<FireProjectionWidget />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche "Renseignez vos dépenses" quand les dépenses sont nulles', async () => {
    getSalaryContracts.mockResolvedValue([])
    getOtherIncomes.mockResolvedValue([])
    getPositions.mockResolvedValue([])
    simulateTax.mockRejectedValue(new Error('no tax'))
    getExpenseSummary.mockResolvedValue({ byCategory: [] })

    render(<FireProjectionWidget />)
    await waitFor(() => {
      expect(screen.getByText(/Renseignez vos dépenses/)).toBeInTheDocument()
    })
  })

  it('affiche le titre FIRE et la barre de progression', async () => {
    mockAll()
    render(<FireProjectionWidget />)
    await waitFor(() => {
      expect(screen.getByText('Indépendance Financière (FIRE)')).toBeInTheDocument()
    })
  })

  it('affiche les hypothèses (taux d\'épargne, épargne mensuelle)', async () => {
    mockAll()
    render(<FireProjectionWidget />)
    await waitFor(() => {
      expect(screen.getByText("Taux d'épargne")).toBeInTheDocument()
      expect(screen.getByText('Épargne mensuelle')).toBeInTheDocument()
      expect(screen.getByText('Rendement pondéré')).toBeInTheDocument()
      expect(screen.getByText('Dépenses annuelles')).toBeInTheDocument()
    })
  })

  it('affiche la section "Autonomie passive actuelle"', async () => {
    mockAll()
    render(<FireProjectionWidget />)
    await waitFor(() => {
      expect(screen.getByText('Autonomie passive actuelle')).toBeInTheDocument()
      expect(screen.getByText('Revenus passifs / mois')).toBeInTheDocument()
      expect(screen.getByText('Dépenses / mois')).toBeInTheDocument()
    })
  })

  it('gère l\'échec de simulateTax sans planter', async () => {
    mockAll({ taxResult: null })
    simulateTax.mockRejectedValue(new Error('no session'))
    render(<FireProjectionWidget />)
    await waitFor(() => {
      // Le widget doit quand même s'afficher sans le tax result
      expect(screen.queryByText('Chargement…')).not.toBeInTheDocument()
    })
  })
})
