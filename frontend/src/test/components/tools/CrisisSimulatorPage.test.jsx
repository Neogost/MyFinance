import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CrisisSimulatorPage from '../../../components/tools/CrisisSimulatorPage'
import { getPositions } from '../../../api/patrimoine'
import { getPossessionsSummary } from '../../../api/possessions'
import { getDebtsSummary } from '../../../api/debts'
import { getExpenseSummary } from '../../../api/expenses'
import { getSalaryContracts } from '../../../api/income'

// ── Mocks API ──────────────────────────────────────────────────────────────────

vi.mock('../../../api/patrimoine', () => ({
  getPositions:       vi.fn(),
  getPatrimoineScore: vi.fn(),
  getInstruments:     vi.fn(),
}))
vi.mock('../../../api/possessions', () => ({ getPossessionsSummary: vi.fn() }))
vi.mock('../../../api/debts',       () => ({ getDebtsSummary: vi.fn() }))
vi.mock('../../../api/expenses',    () => ({ getExpenseSummary: vi.fn() }))
vi.mock('../../../api/income',      () => ({ getSalaryContracts: vi.fn() }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER = { id: 1, firstName: 'Jean', safetyNetMode: 'FIXED_AMOUNT', safetyNetAmount: 10000 }

const POSITIONS = [
  { id: 1, status: 'ACTIVE', category: 'BOURSE',        computed: { currentValueEur: 50000 } },
  { id: 2, status: 'ACTIVE', category: 'IMMO_PHYSIQUE', computed: { currentValueEur: 200000 } },
  { id: 3, status: 'ACTIVE', category: 'LIQUIDITE',     computed: { currentValueEur: 5000 } },
]

function mockAll(positions = POSITIONS) {
  getPositions.mockResolvedValue(positions)
  getPossessionsSummary.mockResolvedValue({ totalCurrentValue: 15000 })
  getDebtsSummary.mockResolvedValue({ totalRemainingCapital: 120000 })
  getExpenseSummary.mockResolvedValue({ totalMonthlyAmount: 2000 })
  getSalaryContracts.mockResolvedValue([{ endDate: null, monthlyNetAfterTax: 3000 }])
}

describe('CrisisSimulatorPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Chargement / erreur ───────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getPositions.mockReturnValue(new Promise(() => {}))
    getPossessionsSummary.mockResolvedValue(null)
    getDebtsSummary.mockResolvedValue(null)
    getExpenseSummary.mockResolvedValue(null)
    getSalaryContracts.mockResolvedValue([])
    render(<CrisisSimulatorPage user={USER} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche un message d\'erreur si le fetch échoue', async () => {
    getPositions.mockRejectedValue(new Error('Network error'))
    getPossessionsSummary.mockResolvedValue(null)
    getDebtsSummary.mockResolvedValue(null)
    getExpenseSummary.mockResolvedValue(null)
    getSalaryContracts.mockResolvedValue([])
    render(<CrisisSimulatorPage user={USER} />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/i)).toBeInTheDocument()
    })
  })

  // ── Sélecteur de scénarios ────────────────────────────────

  it('affiche le titre du simulateur', async () => {
    mockAll()
    render(<CrisisSimulatorPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Simulation de crise')).toBeInTheDocument()
  })

  it('affiche les 5 boutons de scénario', async () => {
    mockAll()
    render(<CrisisSimulatorPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('2008 — Subprimes')).toBeInTheDocument()
    expect(screen.getByText('2000 — Bulle dot-com')).toBeInTheDocument()
    expect(screen.getByText('2020 — COVID-19')).toBeInTheDocument()
    expect(screen.getByText('2022 — Crypto Winter')).toBeInTheDocument()
    expect(screen.getByText('Personnalisé')).toBeInTheDocument()
  })

  it('sélectionne le scénario 2008 par défaut', async () => {
    mockAll()
    render(<CrisisSimulatorPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText(/Effondrement du marché immobilier américain/)).toBeInTheDocument()
  })

  it('change de scénario au clic', async () => {
    mockAll()
    render(<CrisisSimulatorPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('2020 — COVID-19'))
    expect(screen.getByText(/Chute brutale en mars 2020/)).toBeInTheDocument()
  })

  it('affiche les sliders de taux personnalisés en mode Personnalisé', async () => {
    mockAll()
    render(<CrisisSimulatorPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('Personnalisé'))
    // "Bourse" apparaît plusieurs fois (label catégorie + slider) — on vérifie juste sa présence
    expect(screen.getAllByText('Bourse').length).toBeGreaterThan(0)
  })

  // ── Résultats ─────────────────────────────────────────────

  it('affiche les KPIs de résultat', async () => {
    mockAll()
    render(<CrisisSimulatorPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Patrimoine brut')).toBeInTheDocument()
    expect(screen.getByText('Patrimoine net')).toBeInTheDocument()
  })

  it('affiche le score de résilience', async () => {
    mockAll()
    render(<CrisisSimulatorPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Score de résilience')).toBeInTheDocument()
  })

  // ── Option perte d'emploi ─────────────────────────────────

  it('affiche le toggle "Perte d\'emploi"', async () => {
    mockAll()
    render(<CrisisSimulatorPage user={USER} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText(/Inclure une perte d'emploi/)).toBeInTheDocument()
  })
})
