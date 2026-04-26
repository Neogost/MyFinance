import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DettePage from '../../../components/debts/DettePage'
import {
  getDebts,
  getDebtsSummary,
  createDebt,
  updateDebt,
  deleteDebt,
  getBalanceEntries,
  addBalanceEntry,
  deleteBalanceEntry,
} from '../../../api/debts'

// ── Mocks API ─────────────────────────────────────────────────────────────────

vi.mock('../../../api/debts', () => ({
  getDebts:             vi.fn(),
  getDebtsSummary:      vi.fn(),
  createDebt:           vi.fn(),
  updateDebt:           vi.fn(),
  deleteDebt:           vi.fn(),
  getBalanceEntries:    vi.fn(),
  addBalanceEntry:      vi.fn(),
  deleteBalanceEntry:   vi.fn(),
}))

vi.mock('../../../components/debts/DebtForm', () => ({
  default: ({ debt, onSubmit, onCancel }) => (
    <div data-testid="debt-form">
      <span data-testid="form-mode">{debt?.id ? 'edit' : 'create'}</span>
      <button data-testid="form-submit"
        onClick={() => onSubmit({
          type: 'IMMOBILIER', label: 'Crédit test', initialCapital: 200000,
          annualRate: 0.035, monthlyPayment: 950,
        })}>
        Soumettre
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>Annuler</button>
    </div>
  ),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SUMMARY = {
  totalCount: 2,
  totalRemainingCapital: 185000,
  totalMonthlyPayment: 1100,
  totalMonthlyInsurance: 80,
  totalMonthlyCost: 1180,
  byType: [],
}

const DEBTS = [
  {
    id: 1,
    type: 'IMMOBILIER',
    label: 'Crédit appartement',
    lender: 'BNP Paribas',
    initialCapital: 200000,
    remainingCapital: 150000,
    annualRate: 0.035,
    insuranceRate: 0.003,
    monthlyPayment: 950,
    monthlyInsuranceCost: 50,
    monthlyTotalCost: 1000,
    repaymentProgress: 25,
    projectionMode: true,
    nextMonthsSchedule: [],
    startDate: '2020-01-01',
    endDate: '2045-01-01',
  },
  {
    id: 2,
    type: 'VEHICULE',
    label: 'Crédit voiture',
    lender: 'Cetelem',
    initialCapital: 15000,
    remainingCapital: 8000,
    annualRate: 0.045,
    insuranceRate: null,
    monthlyPayment: 300,
    monthlyInsuranceCost: 0,
    monthlyTotalCost: 300,
    repaymentProgress: 47,
    projectionMode: true,
    nextMonthsSchedule: [],
    startDate: '2022-06-01',
    endDate: '2027-06-01',
  },
]

function mockFetchAll(debts = DEBTS, summary = SUMMARY) {
  getDebts.mockResolvedValue(debts)
  getDebtsSummary.mockResolvedValue(summary)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DettePage — pattern CRUD avec DeleteConfirmModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBalanceEntries.mockResolvedValue([])
  })

  // ── États de chargement ───────────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getDebts.mockReturnValue(new Promise(() => {}))
    getDebtsSummary.mockReturnValue(new Promise(() => {}))
    render(<DettePage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche les dettes après chargement', async () => {
    mockFetchAll()
    render(<DettePage />)
    await waitFor(() => {
      expect(screen.getByText('Crédit appartement')).toBeInTheDocument()
      expect(screen.getByText('Crédit voiture')).toBeInTheDocument()
    })
  })

  it("affiche le message d'erreur si l'API échoue", async () => {
    getDebts.mockRejectedValue(new Error('Network error'))
    getDebtsSummary.mockRejectedValue(new Error('Network error'))
    render(<DettePage />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les dettes.')).toBeInTheDocument()
    })
  })

  it('affiche "Aucune dette enregistrée" quand la liste est vide', async () => {
    mockFetchAll([])
    render(<DettePage />)
    await waitFor(() => {
      expect(screen.getByText('Aucune dette enregistrée')).toBeInTheDocument()
    })
  })

  // ── Formulaire ────────────────────────────────────────────────────────────

  it('ouvre le formulaire de création au clic sur "+ Ajouter"', async () => {
    mockFetchAll([])
    render(<DettePage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))

    expect(screen.getByTestId('debt-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('create')
  })

  it('ouvre le formulaire d\'édition au clic sur "Modifier"', async () => {
    mockFetchAll()
    render(<DettePage />)
    await waitFor(() => expect(screen.getAllByText('Modifier')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Modifier')[0])

    expect(screen.getByTestId('debt-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('edit')
  })

  it('ferme le formulaire au clic sur Annuler', async () => {
    mockFetchAll([])
    render(<DettePage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))
    fireEvent.click(screen.getByTestId('form-cancel'))

    expect(screen.queryByTestId('debt-form')).not.toBeInTheDocument()
  })

  // ── Création ──────────────────────────────────────────────────────────────

  it('appelle createDebt puis refetch', async () => {
    mockFetchAll([])
    createDebt.mockResolvedValue({ id: 10, type: 'IMMOBILIER', label: 'Crédit test' })
    getDebts.mockResolvedValue([])

    render(<DettePage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(createDebt).toHaveBeenCalledWith(expect.objectContaining({ type: 'IMMOBILIER' }))
      expect(getDebts).toHaveBeenCalledTimes(2) // montage + après création
    })
  })

  // ── Modification ──────────────────────────────────────────────────────────

  it('appelle updateDebt avec l\'id correct puis refetch', async () => {
    mockFetchAll()
    updateDebt.mockResolvedValue({ ...DEBTS[0], label: 'Crédit test' })
    getDebts.mockResolvedValue(DEBTS)

    render(<DettePage />)
    await waitFor(() => expect(screen.getAllByText('Modifier')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Modifier')[0])
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(updateDebt).toHaveBeenCalledWith(DEBTS[0].id, expect.any(Object))
      expect(getDebts).toHaveBeenCalledTimes(2)
    })
  })

  // ── Suppression via DeleteConfirmModal ────────────────────────────────────

  it('ouvre la DeleteConfirmModal au clic sur "Supprimer"', async () => {
    mockFetchAll()
    render(<DettePage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Supprimer')[0])

    // La DeleteConfirmModal affiche "Supprimer définitivement" (pas confirm() natif)
    expect(screen.getByText('Supprimer définitivement')).toBeInTheDocument()
    // Le titre de la modal contient le label de la dette (peut être en double avec la liste)
    expect(screen.getAllByText(/Crédit appartement/).length).toBeGreaterThanOrEqual(1)
  })

  it('supprime la dette après confirmation dans la modal', async () => {
    mockFetchAll()
    deleteDebt.mockResolvedValue()
    getDebts.mockResolvedValueOnce(DEBTS).mockResolvedValue(DEBTS.slice(1))
    getDebtsSummary.mockResolvedValue(SUMMARY)

    render(<DettePage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Supprimer')[0])
    fireEvent.click(screen.getByText('Supprimer définitivement'))

    await waitFor(() => {
      expect(deleteDebt).toHaveBeenCalledWith(DEBTS[0].id)
      expect(getDebts).toHaveBeenCalledTimes(2)
    })
  })

  it('annule la suppression au clic sur "Annuler" dans la modal', async () => {
    mockFetchAll()
    render(<DettePage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Supprimer')[0])
    expect(screen.getByText('Supprimer définitivement')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Annuler'))

    expect(deleteDebt).not.toHaveBeenCalled()
    expect(screen.queryByText('Supprimer définitivement')).not.toBeInTheDocument()
  })

  // ── Filtrage ──────────────────────────────────────────────────────────────

  it('filtre les dettes par type', async () => {
    mockFetchAll()
    render(<DettePage />)

    await waitFor(() => {
      expect(screen.getByText('Crédit appartement')).toBeInTheDocument()
      expect(screen.getByText('Crédit voiture')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Crédit véhicule' }))

    expect(screen.queryByText('Crédit appartement')).not.toBeInTheDocument()
    expect(screen.getByText('Crédit voiture')).toBeInTheDocument()
  })

  it('appelle getDebts et getDebtsSummary au montage', async () => {
    mockFetchAll()
    render(<DettePage />)
    await waitFor(() => {
      expect(getDebts).toHaveBeenCalledTimes(1)
      expect(getDebtsSummary).toHaveBeenCalledTimes(1)
    })
  })

  // ── Accordéon amortissement ───────────────────────────────────────────────

  it('affiche/masque le tableau d\'amortissement au clic', async () => {
    mockFetchAll()
    render(<DettePage />)
    await waitFor(() => expect(screen.getAllByText(/Tableau d'amortissement/)[0]).toBeInTheDocument())

    expect(screen.queryByText('12 prochains mois')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByText(/Tableau d'amortissement/)[0])
    expect(screen.getByText('12 prochains mois')).toBeInTheDocument()

    fireEvent.click(screen.getAllByText(/Tableau d'amortissement/)[0])
    expect(screen.queryByText('12 prochains mois')).not.toBeInTheDocument()
  })
})
