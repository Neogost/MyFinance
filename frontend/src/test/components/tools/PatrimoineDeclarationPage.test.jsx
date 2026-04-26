import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PatrimoineDeclarationPage from '../../../components/tools/PatrimoineDeclarationPage'
import { getPositions } from '../../../api/patrimoine'
import { getSalaryContracts } from '../../../api/income'
import { getExpenseSummary } from '../../../api/expenses'
import { getPossessions } from '../../../api/possessions'
import { getDebts } from '../../../api/debts'
import { simulateTax } from '../../../api/tools'

// ── Mocks API ──────────────────────────────────────────────────────────────────

vi.mock('../../../api/patrimoine', () => ({
  getPositions:       vi.fn(),
  getPatrimoineScore: vi.fn(),
  getInstruments:     vi.fn(),
}))
vi.mock('../../../api/income',      () => ({ getSalaryContracts: vi.fn() }))
vi.mock('../../../api/expenses',    () => ({ getExpenseSummary: vi.fn() }))
vi.mock('../../../api/possessions', () => ({ getPossessions: vi.fn(), getPossessionsSummary: vi.fn() }))
vi.mock('../../../api/debts',       () => ({ getDebts: vi.fn(), getDebtsSummary: vi.fn() }))
vi.mock('../../../api/tools',       () => ({ simulateTax: vi.fn() }))

vi.mock('../../../components/patrimoine/constants', () => ({
  FISCAL_ENVELOPE_LABELS: {
    NONE: { label: 'Hors enveloppe' },
    PEA:  { label: 'PEA' },
    CTO:  { label: 'CTO' },
    AV:   { label: 'AV' },
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER = {
  id: 1, firstName: 'Jean', lastName: 'Dupont',
  birthDate: '1985-06-15', role: 'USER',
  personalDeclarationInfo: 'Déclarant principal',
}

const POSITIONS = [
  {
    id: 1, label: 'ETF World', category: 'BOURSE', status: 'ACTIVE',
    instrument: { isin: 'LU1234567890', name: 'ETF World' },
    fiscalEnvelope: 'PEA',
    computed: { currentValueEur: 25000, capitalGainEur: 3000, investedAmountEur: 22000 },
  },
]

const CONTRACT = {
  id: 1, endDate: null,
  monthlyNetAfterTax: 2800, annualNetAfterTax: 33600,
  annualNetImposable: 36000,
}

const TAX_RESULT = { totalEstimatedTax: 3600, effectiveTaxRate: 10 }

const EXPENSE_SUMMARY = { totalMonthlyAmount: 1500 }

function mockAll() {
  getPositions.mockResolvedValue(POSITIONS)
  getSalaryContracts.mockResolvedValue([CONTRACT])
  getExpenseSummary.mockResolvedValue(EXPENSE_SUMMARY)
  getPossessions.mockResolvedValue([])
  getDebts.mockResolvedValue([])
  simulateTax.mockResolvedValue(TAX_RESULT)
}

describe('PatrimoineDeclarationPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Chargement / erreur ───────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getPositions.mockReturnValue(new Promise(() => {}))
    getSalaryContracts.mockResolvedValue([])
    getExpenseSummary.mockResolvedValue(null)
    getPossessions.mockResolvedValue([])
    getDebts.mockResolvedValue([])
    simulateTax.mockResolvedValue(null)
    render(<PatrimoineDeclarationPage user={USER} onNavigate={vi.fn()} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche un message d\'erreur si le fetch échoue', async () => {
    getPositions.mockRejectedValue(new Error('Network error'))
    getSalaryContracts.mockResolvedValue([])
    getExpenseSummary.mockResolvedValue(null)
    getPossessions.mockResolvedValue([])
    getDebts.mockResolvedValue([])
    simulateTax.mockResolvedValue(null)
    render(<PatrimoineDeclarationPage user={USER} onNavigate={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/i)).toBeInTheDocument()
    })
  })

  // ── Contenu du document ───────────────────────────────────

  it('affiche le nom de l\'utilisateur (ordre lastName firstName)', async () => {
    mockAll()
    render(<PatrimoineDeclarationPage user={USER} onNavigate={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    // Le composant affiche {user.lastName} {user.firstName} → "Dupont Jean"
    expect(screen.getByText(/Dupont/)).toBeInTheDocument()
  })

  it('affiche le titre "Déclaration de patrimoine"', async () => {
    mockAll()
    render(<PatrimoineDeclarationPage user={USER} onNavigate={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Déclaration de patrimoine')).toBeInTheDocument()
  })

  it('affiche la section Revenus mensuels', async () => {
    mockAll()
    render(<PatrimoineDeclarationPage user={USER} onNavigate={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Revenus mensuels')).toBeInTheDocument()
  })

  it('affiche la section Détail des actifs', async () => {
    mockAll()
    render(<PatrimoineDeclarationPage user={USER} onNavigate={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Détail des actifs')).toBeInTheDocument()
  })

  it('affiche les positions BOURSE avec leur libellé', async () => {
    mockAll()
    render(<PatrimoineDeclarationPage user={USER} onNavigate={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('ETF World')).toBeInTheDocument()
  })

  it('affiche l\'impôt estimé', async () => {
    mockAll()
    render(<PatrimoineDeclarationPage user={USER} onNavigate={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Impôt estimé')).toBeInTheDocument()
  })

  // ── Bouton d'export ───────────────────────────────────────

  it('affiche le bouton d\'export PDF', async () => {
    mockAll()
    render(<PatrimoineDeclarationPage user={USER} onNavigate={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText(/Exporter en PDF/i)).toBeInTheDocument()
  })
})
