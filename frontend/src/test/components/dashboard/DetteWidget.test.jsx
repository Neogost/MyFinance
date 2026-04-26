import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DetteWidget from '../../../components/dashboard/DetteWidget'
import { getDebts, getDebtsSummary } from '../../../api/debts'
import { getPositions } from '../../../api/patrimoine'
import { getSalaryContracts } from '../../../api/income'

vi.mock('../../../api/debts',      () => ({ getDebts: vi.fn(), getDebtsSummary: vi.fn() }))
vi.mock('../../../api/patrimoine', () => ({ getPositions: vi.fn(), getPatrimoineScore: vi.fn(), getInstruments: vi.fn() }))
vi.mock('../../../api/income',     () => ({
  getSalaryContracts: vi.fn(),
  getOtherIncomes: vi.fn(),
}))

const SUMMARY = {
  totalCount: 2,
  totalRemainingCapital: 160000,
  totalMonthlyPayment: 1050,
  totalMonthlyInsurance: 60,
  totalMonthlyCost: 1110,
  byType: [{ type: 'IMMOBILIER', totalRemainingCapital: 150000 }],
}

const DEBTS = [
  {
    id: 1,
    type: 'IMMOBILIER',
    label: 'Crédit appart',
    initialCapital: 200000,
    remainingCapital: 150000,
    monthlyPayment: 950,
    endDate: '2045-01-01',
    projectionMode: true,
    repaymentProgress: 25,
  },
  {
    id: 2,
    type: 'VEHICULE',
    label: 'Crédit voiture',
    initialCapital: 15000,
    remainingCapital: 10000,
    monthlyPayment: 280,
    endDate: '2027-06-01',
    projectionMode: true,
    repaymentProgress: 33,
  },
]

const POSITIONS_BRUT = [
  { id: 1, status: 'ACTIVE', computed: { currentValueEur: 300000 } },
]

function mockAll(debts = DEBTS, summary = SUMMARY) {
  getDebts.mockResolvedValue(debts)
  getDebtsSummary.mockResolvedValue(summary)
  getPositions.mockResolvedValue(POSITIONS_BRUT)
  getSalaryContracts.mockResolvedValue([{ endDate: null, monthlyNetAfterTax: 3000 }])
}

describe('DetteWidget', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne null quand il n\'y a aucune dette', async () => {
    getDebts.mockResolvedValue([])
    getDebtsSummary.mockResolvedValue({ ...SUMMARY, totalCount: 0 })
    getPositions.mockResolvedValue([])
    getSalaryContracts.mockResolvedValue([])

    const { container } = render(<DetteWidget />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('affiche le widget quand des dettes existent', async () => {
    mockAll()
    render(<DetteWidget />)
    await waitFor(() => {
      expect(screen.getByText('Endettement')).toBeInTheDocument()
    })
  })

  it('affiche le capital restant total', async () => {
    mockAll()
    render(<DetteWidget />)
    await waitFor(() => {
      expect(screen.getByText(/160.*000/)).toBeInTheDocument()
    })
  })

  it('affiche le nombre de crédits en cours', async () => {
    mockAll()
    render(<DetteWidget />)
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('affiche "Capital restant dû"', async () => {
    mockAll()
    render(<DetteWidget />)
    await waitFor(() => {
      expect(screen.getByText('Capital restant dû')).toBeInTheDocument()
    })
  })

  it('affiche "Mensualité totale"', async () => {
    mockAll()
    render(<DetteWidget />)
    await waitFor(() => {
      expect(screen.getByText('Mensualité totale')).toBeInTheDocument()
    })
  })

  it('affiche la progression globale de remboursement', async () => {
    mockAll()
    render(<DetteWidget />)
    await waitFor(() => {
      expect(screen.getByText('Avancement global')).toBeInTheDocument()
    })
  })

  it('affiche la progression par type de crédit', async () => {
    mockAll()
    render(<DetteWidget />)
    await waitFor(() => {
      expect(screen.getByText('Par type de crédit')).toBeInTheDocument()
      expect(screen.getByText('Immobilier')).toBeInTheDocument()
      expect(screen.getByText('Véhicule')).toBeInTheDocument()
    })
  })

  it("affiche l'année de libération des dettes", async () => {
    mockAll()
    render(<DetteWidget />)
    await waitFor(() => {
      expect(screen.getByText(/Libre en 2045/)).toBeInTheDocument()
    })
  })
})
