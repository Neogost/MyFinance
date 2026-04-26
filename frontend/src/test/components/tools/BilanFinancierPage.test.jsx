import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BilanFinancierPage from '../../../components/tools/BilanFinancierPage'
import { getSalaryContracts, getOtherIncomes } from '../../../api/income'
import { getPositions } from '../../../api/patrimoine'
import { simulateTax } from '../../../api/tools'
import { getExpenseSummary } from '../../../api/expenses'
import { getPossessionsSummary } from '../../../api/possessions'
import { getDebtsSummary } from '../../../api/debts'

// ── Mocks API ──────────────────────────────────────────────────────────────────

vi.mock('../../../api/income', () => ({
  getSalaryContracts: vi.fn(),
  getOtherIncomes:    vi.fn(),
}))
vi.mock('../../../api/patrimoine', () => ({
  getPositions:       vi.fn(),
  getPatrimoineScore: vi.fn(),
  getInstruments:     vi.fn(),
}))
vi.mock('../../../api/tools',       () => ({ simulateTax: vi.fn() }))
vi.mock('../../../api/expenses',    () => ({ getExpenseSummary: vi.fn() }))
vi.mock('../../../api/possessions', () => ({ getPossessionsSummary: vi.fn() }))
vi.mock('../../../api/debts',       () => ({ getDebtsSummary: vi.fn() }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER = { id: 1, firstName: 'Jean', safetyNetMode: 'FIXED_AMOUNT', safetyNetMonths: 3 }

const CONTRACT = {
  id: 1, endDate: null,
  monthlyNetAfterTax: 2800,
  annualNetAfterTax: 33600,
}

const EXPENSE_SUMMARY = {
  totalMonthlyAmount: 1500,
  totalAnnualAmount:  18000,
  savingsCapacity: 1300,
  byCategory: [{ category: 'LOGEMENT', monthlyAmount: 900 }],
}

const POSSESSION_SUMMARY = {
  totalCurrentValue: 15000,
  totalPurchasePrice: 20000,
}

const DEBTS_SUMMARY = {
  totalRemainingCapital: 120000,
  totalMonthlyPayment: 800,
}

const TAX_RESULT = {
  totalEstimatedTax: 3600,
  salaryIncome: 33600,
}

function mockAll() {
  getSalaryContracts.mockResolvedValue([CONTRACT])
  getOtherIncomes.mockResolvedValue([])
  getPositions.mockResolvedValue([])
  simulateTax.mockResolvedValue(TAX_RESULT)
  getExpenseSummary.mockResolvedValue(EXPENSE_SUMMARY)
  getPossessionsSummary.mockResolvedValue(POSSESSION_SUMMARY)
  getDebtsSummary.mockResolvedValue(DEBTS_SUMMARY)
}

describe('BilanFinancierPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Chargement / erreur ───────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getSalaryContracts.mockReturnValue(new Promise(() => {}))
    getOtherIncomes.mockResolvedValue([])
    getPositions.mockResolvedValue([])
    simulateTax.mockResolvedValue(TAX_RESULT)
    getExpenseSummary.mockResolvedValue(EXPENSE_SUMMARY)
    getPossessionsSummary.mockResolvedValue(POSSESSION_SUMMARY)
    getDebtsSummary.mockResolvedValue(DEBTS_SUMMARY)
    render(<BilanFinancierPage user={USER} />)
    expect(screen.getByText('Chargement du bilan…')).toBeInTheDocument()
  })

  it('affiche un message d\'erreur si un appel API échoue', async () => {
    getSalaryContracts.mockRejectedValue(new Error('Network error'))
    getOtherIncomes.mockResolvedValue([])
    getPositions.mockResolvedValue([])
    simulateTax.mockResolvedValue(null)
    getExpenseSummary.mockResolvedValue(null)
    getPossessionsSummary.mockResolvedValue(null)
    getDebtsSummary.mockResolvedValue(null)
    render(<BilanFinancierPage user={USER} />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/i)).toBeInTheDocument()
    })
  })

  // ── Structure de la page ──────────────────────────────────

  it('affiche le titre "Bilan financier"', async () => {
    mockAll()
    render(<BilanFinancierPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement du bilan…')).not.toBeInTheDocument())
    expect(screen.getByText('Bilan financier personnel')).toBeInTheDocument()
  })

  it('affiche les sections Revenus et Dépenses', async () => {
    mockAll()
    render(<BilanFinancierPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement du bilan…')).not.toBeInTheDocument())
    expect(screen.getByText('Revenus')).toBeInTheDocument()
    expect(screen.getByText('Dépenses')).toBeInTheDocument()
  })

  it('affiche les sections Actif et Passif', async () => {
    mockAll()
    render(<BilanFinancierPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement du bilan…')).not.toBeInTheDocument())
    expect(screen.getByText('Actif')).toBeInTheDocument()
    expect(screen.getByText('Passif')).toBeInTheDocument()
  })

  // ── Toggle Mensuel / Annuel ───────────────────────────────

  it('affiche le toggle Mensuel / Annuel', async () => {
    mockAll()
    render(<BilanFinancierPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement du bilan…')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Mensuel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuel' })).toBeInTheDocument()
  })

  it('bascule en mode annuel au clic sur "Annuel"', async () => {
    mockAll()
    render(<BilanFinancierPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement du bilan…')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Annuel' }))
    expect(screen.getByRole('button', { name: 'Annuel' })).toHaveClass('bg-indigo-600')
  })

  // ── Données salaire ───────────────────────────────────────

  it('affiche le salaire net mensuel du contrat actif', async () => {
    mockAll()
    render(<BilanFinancierPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement du bilan…')).not.toBeInTheDocument())
    // Vérifie la présence de la ligne "Salaire" dans les revenus
    expect(screen.getByText('Salaire')).toBeInTheDocument()
  })
})
