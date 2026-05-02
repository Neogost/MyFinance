import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PatrimoinePage from '../../../components/patrimoine/PatrimoinePage'
import {
  getPositions, getSnapshots, getSnapshot, getReferentiel,
  getPatrimoineTargets, getBreakdown, createPosition, updatePosition,
} from '../../../api/patrimoine'
import { getDebts } from '../../../api/debts'
import { getExpenseSummary } from '../../../api/expenses'
import { getSalaryContracts } from '../../../api/income'
import { getMyGroupMembers, getMemberPositions } from '../../../api/familyGroup'

// ── Mocks API ──────────────────────────────────────────────────────────────────

vi.mock('../../../api/patrimoine', () => ({
  getPositions:         vi.fn(),
  getSnapshots:         vi.fn(),
  getSnapshot:          vi.fn(),
  getReferentiel:       vi.fn(),
  getPatrimoineTargets: vi.fn(),
  getBreakdown:         vi.fn(),
  createPosition:       vi.fn(),
  updatePosition:       vi.fn(),
  deletePosition:       vi.fn(),
  getPatrimoineScore:   vi.fn(),
  getInstruments:       vi.fn(),
  getActiveInstruments: vi.fn(),
  updateInstrumentPrices: vi.fn(),
  updateInstrumentStablePrice: vi.fn(),
}))
vi.mock('../../../api/debts',    () => ({ getDebts: vi.fn() }))
vi.mock('../../../api/expenses', () => ({ getExpenseSummary: vi.fn() }))
vi.mock('../../../api/income',   () => ({ getSalaryContracts: vi.fn() }))
vi.mock('../../../api/familyGroup', () => ({
  getMyGroupMembers:   vi.fn(),
  getMemberPositions:  vi.fn(),
}))

// ── Mocks sous-composants complexes ──────────────────────────────────────────

vi.mock('../../../components/patrimoine/PositionForm', () => ({
  default: ({ onCancel }) => (
    <div data-testid="position-form">
      <button onClick={onCancel}>Annuler</button>
    </div>
  ),
}))
vi.mock('../../../components/patrimoine/PositionCard', () => ({
  default: ({ position }) => <div data-testid={`card-${position.id}`}>{position.label}</div>,
}))
vi.mock('../../../components/patrimoine/OrderPanel',                 () => ({ default: () => <div data-testid="order-panel" /> }))
vi.mock('../../../components/patrimoine/InstrumentPriceUpdateModal', () => ({ default: () => <div data-testid="price-modal" /> }))
vi.mock('../../../components/patrimoine/ExchangeRateUpdateModal',    () => ({ default: () => <div data-testid="exchange-modal" /> }))
vi.mock('../../../components/patrimoine/SnapshotPanel',              () => ({ default: () => <div data-testid="snapshot-panel" /> }))
vi.mock('../../../components/patrimoine/PatrimoineGroupedView',      () => ({
  default: () => <div data-testid="grouped-view" />,
  PatrimoineLegend: () => null,
}))
vi.mock('../../../components/patrimoine/PatrimoineStrategyModal',    () => ({ default: () => <div data-testid="strategy-modal" /> }))
vi.mock('../../../components/patrimoine/CategoryStrategyBar',        () => ({ default: () => null }))
vi.mock('../../../components/patrimoine/ValueEditModals',            () => ({
  BalanceEditModal:        () => null,
  EstimatedValueModal:     () => null,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER = { id: 1, firstName: 'Jean', role: 'USER', safetyNetMode: 'FIXED_AMOUNT', birthDate: '1990-01-01' }
const ADMIN = { ...USER, role: 'ADMIN' }

const POSITIONS = [
  { id: 1, label: 'ETF World',     category: 'BOURSE',  status: 'ACTIVE',  computed: { currentValueEur: 10000, capitalGainEur: 500 } },
  { id: 2, label: 'Appart Paris',  category: 'IMMO_PHYSIQUE', status: 'ACTIVE', computed: { currentValueEur: 200000, capitalGainEur: 0 } },
  { id: 3, label: 'Ancien livret', category: 'LIVRET',  status: 'CLOSED',  computed: { currentValueEur: 0, capitalGainEur: 0 } },
]

function mockAllApis(positions = POSITIONS) {
  getPositions.mockResolvedValue(positions)
  getSnapshots.mockResolvedValue([])
  getReferentiel.mockResolvedValue({ tranches: [] })
  getPatrimoineTargets.mockResolvedValue({ targets: {}, breakdowns: {} })
  getBreakdown.mockResolvedValue(null)
  getDebts.mockResolvedValue([])
  getExpenseSummary.mockResolvedValue(null)
  getSalaryContracts.mockResolvedValue([])
  getMyGroupMembers.mockResolvedValue([])
}

describe('PatrimoinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  // ── Chargement ────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getPositions.mockReturnValue(new Promise(() => {}))
    getSnapshots.mockResolvedValue([])
    getReferentiel.mockResolvedValue({ tranches: [] })
    getPatrimoineTargets.mockResolvedValue({ targets: {}, breakdowns: {} })
  getBreakdown.mockResolvedValue(null)
    getDebts.mockResolvedValue([])
    render(<PatrimoinePage currentUser={USER} familyMode={false} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche le message d\'erreur si le fetch échoue', async () => {
    getPositions.mockRejectedValue(new Error('Network error'))
    getSnapshots.mockResolvedValue([])
    getReferentiel.mockResolvedValue({ tranches: [] })
    getPatrimoineTargets.mockResolvedValue({ targets: {}, breakdowns: {} })
  getBreakdown.mockResolvedValue(null)
    getDebts.mockResolvedValue([])
    render(<PatrimoinePage currentUser={USER} familyMode={false} />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger le patrimoine.')).toBeInTheDocument()
    })
  })

  it('affiche les positions après chargement', async () => {
    mockAllApis()
    render(<PatrimoinePage currentUser={USER} familyMode={false} />)
    await waitFor(() => {
      expect(screen.getByTestId('grouped-view')).toBeInTheDocument()
    })
  })

  // ── Filtres de catégorie ──────────────────────────────────

  it('affiche le bouton de filtre "Tous"', async () => {
    mockAllApis()
    render(<PatrimoinePage currentUser={USER} familyMode={false} />)
    await waitFor(() => expect(screen.getByText('Tous')).toBeInTheDocument())
  })

  it('affiche le filtre "Bourse" si des positions BOURSE existent', async () => {
    mockAllApis()
    render(<PatrimoinePage currentUser={USER} familyMode={false} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bourse' })).toBeInTheDocument())
  })

  // ── Positions fermées ─────────────────────────────────────

  it('affiche le checkbox "positions fermées" dans les filtres', async () => {
    mockAllApis()
    render(<PatrimoinePage currentUser={USER} familyMode={false} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    // Le checkbox est toujours présent dans PatrimoineFilters
    expect(screen.getByText(/Afficher les positions fermées/i)).toBeInTheDocument()
  })

  // ── Bouton Ajouter ────────────────────────────────────────

  it('ouvre le formulaire de création au clic sur "+ Ajouter"', async () => {
    mockAllApis()
    render(<PatrimoinePage currentUser={USER} familyMode={false} />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())
    fireEvent.click(screen.getByText('+ Ajouter'))
    expect(screen.getByTestId('position-form')).toBeInTheDocument()
  })

  it('ferme le formulaire au clic sur Annuler', async () => {
    mockAllApis()
    render(<PatrimoinePage currentUser={USER} familyMode={false} />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())
    fireEvent.click(screen.getByText('+ Ajouter'))
    fireEvent.click(screen.getByText('Annuler'))
    expect(screen.queryByTestId('position-form')).not.toBeInTheDocument()
  })

  // ── Boutons admin ─────────────────────────────────────────

  it('affiche les boutons admin pour un utilisateur ADMIN', async () => {
    mockAllApis()
    render(<PatrimoinePage currentUser={ADMIN} familyMode={false} />)
    await waitFor(() => expect(screen.getByText('Mettre à jour les cours')).toBeInTheDocument())
    expect(screen.getByText('Taux de change')).toBeInTheDocument()
    expect(screen.getByText('Relevés de patrimoine')).toBeInTheDocument()
  })

  it('n\'affiche pas les boutons admin pour un USER', async () => {
    mockAllApis()
    render(<PatrimoinePage currentUser={USER} familyMode={false} />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.queryByText('Mettre à jour les cours')).not.toBeInTheDocument()
  })
})
