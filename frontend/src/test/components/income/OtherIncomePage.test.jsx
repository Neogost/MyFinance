import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OtherIncomePage from '../../../components/income/OtherIncomePage'
import {
  getOtherIncomes,
  createOtherIncome,
  updateOtherIncome,
  deleteOtherIncome,
} from '../../../api/income'

// ── Mocks API ─────────────────────────────────────────────────────────────────

vi.mock('../../../api/income', () => ({
  getOtherIncomes: vi.fn(),
  createOtherIncome: vi.fn(),
  updateOtherIncome: vi.fn(),
  deleteOtherIncome: vi.fn(),
  getSalaryContracts: vi.fn(),
  createSalaryContract: vi.fn(),
  updateSalaryContract: vi.fn(),
  deleteSalaryContract: vi.fn(),
  getMonthlyPaySlips: vi.fn(),
  createMonthlyPaySlip: vi.fn(),
  updateMonthlyPaySlip: vi.fn(),
  deleteMonthlyPaySlip: vi.fn(),
  getContractBonuses: vi.fn(),
  createContractBonus: vi.fn(),
  updateContractBonus: vi.fn(),
  deleteContractBonus: vi.fn(),
}))

// OtherIncomeForm simplifié pour isoler les tests de la page
vi.mock('../../../components/income/OtherIncomeForm', () => ({
  default: ({ income, onSubmit, onCancel }) => (
    <div data-testid="income-form">
      <span data-testid="form-mode">{income?.id ? 'edit' : 'create'}</span>
      <button
        data-testid="form-submit"
        onClick={() => onSubmit({
          type: 'AUTRE',
          label: 'Revenu test',
          amount: 500,
          date: '2025-06-01',
        })}
      >
        Soumettre
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>Annuler</button>
    </div>
  ),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INCOMES = [
  {
    id: 1,
    type: 'LOCATIF',
    label: 'Loyer appartement T2',
    amount: 800,
    date: '2025-06-01',
    isTaxable: true,
    specificTaxRate: null,
  },
  {
    id: 2,
    type: 'DIVIDENDE',
    label: 'Dividendes Total',
    amount: 200,
    date: '2025-03-15',
    isTaxable: true,
    specificTaxRate: 30,
  },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OtherIncomePage — pattern CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
  })

  // ── États de chargement ───────────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getOtherIncomes.mockReturnValue(new Promise(() => {}))
    render(<OtherIncomePage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche les revenus après chargement', async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    render(<OtherIncomePage />)
    await waitFor(() => {
      expect(screen.getByText('Loyer appartement T2')).toBeInTheDocument()
      expect(screen.getByText('Dividendes Total')).toBeInTheDocument()
    })
  })

  it("affiche le message d'erreur si l'API échoue", async () => {
    getOtherIncomes.mockRejectedValue(new Error('Network error'))
    render(<OtherIncomePage />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les revenus.')).toBeInTheDocument()
    })
  })

  it('affiche "Aucun revenu complémentaire" quand la liste est vide', async () => {
    getOtherIncomes.mockResolvedValue([])
    render(<OtherIncomePage />)
    await waitFor(() => {
      expect(screen.getByText('Aucun revenu complémentaire')).toBeInTheDocument()
    })
  })

  // ── Ouverture / fermeture du formulaire ───────────────────────────────────

  it('ouvre le formulaire de création au clic sur "+ Ajouter"', async () => {
    getOtherIncomes.mockResolvedValue([])
    render(<OtherIncomePage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))

    expect(screen.getByTestId('income-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('create')
  })

  it('ouvre le formulaire d\'édition au clic sur "Modifier"', async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    render(<OtherIncomePage />)
    await waitFor(() => expect(screen.getAllByText('Modifier')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Modifier')[0])

    expect(screen.getByTestId('income-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('edit')
  })

  it('ferme le formulaire au clic sur Annuler', async () => {
    getOtherIncomes.mockResolvedValue([])
    render(<OtherIncomePage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))
    expect(screen.getByTestId('income-form')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('form-cancel'))
    expect(screen.queryByTestId('income-form')).not.toBeInTheDocument()
  })

  // ── Création ──────────────────────────────────────────────────────────────

  it('crée un revenu et l\'ajoute à la liste (optimistic update)', async () => {
    getOtherIncomes.mockResolvedValue([])
    const created = { id: 10, type: 'AUTRE', label: 'Revenu test', amount: 500, date: '2025-06-01' }
    createOtherIncome.mockResolvedValue(created)

    render(<OtherIncomePage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(createOtherIncome).toHaveBeenCalledWith({
        type: 'AUTRE', label: 'Revenu test', amount: 500, date: '2025-06-01',
      })
      expect(screen.getByText('Revenu test')).toBeInTheDocument()
    })
  })

  it('ferme le formulaire après création réussie', async () => {
    getOtherIncomes.mockResolvedValue([])
    createOtherIncome.mockResolvedValue({
      id: 10, type: 'AUTRE', label: 'Revenu test', amount: 500, date: '2025-06-01',
    })

    render(<OtherIncomePage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(screen.queryByTestId('income-form')).not.toBeInTheDocument()
    })
  })

  // ── Modification ──────────────────────────────────────────────────────────

  it('met à jour un revenu dans la liste (optimistic update)', async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    const updated = { ...INCOMES[0], label: 'Revenu test' }
    updateOtherIncome.mockResolvedValue(updated)

    render(<OtherIncomePage />)
    await waitFor(() => expect(screen.getAllByText('Modifier')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Modifier')[0])
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(updateOtherIncome).toHaveBeenCalledWith(INCOMES[0].id, expect.any(Object))
      expect(screen.getByText('Revenu test')).toBeInTheDocument()
    })
  })

  // ── Suppression ───────────────────────────────────────────────────────────

  it('supprime un revenu après confirmation utilisateur', async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    deleteOtherIncome.mockResolvedValue()
    window.confirm = vi.fn(() => true)

    render(<OtherIncomePage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Supprimer')[0])

    await waitFor(() => {
      expect(deleteOtherIncome).toHaveBeenCalledWith(INCOMES[0].id)
      expect(screen.queryByText('Loyer appartement T2')).not.toBeInTheDocument()
    })
  })

  it("n'appelle pas deleteOtherIncome si l'utilisateur annule la confirmation", async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    window.confirm = vi.fn(() => false)

    render(<OtherIncomePage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Supprimer')[0])

    expect(deleteOtherIncome).not.toHaveBeenCalled()
    expect(screen.getByText('Loyer appartement T2')).toBeInTheDocument()
  })

  // ── Filtrage ──────────────────────────────────────────────────────────────

  it('filtre les revenus par type au clic sur le bouton de filtre', async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    render(<OtherIncomePage />)

    await waitFor(() => {
      expect(screen.getByText('Loyer appartement T2')).toBeInTheDocument()
      expect(screen.getByText('Dividendes Total')).toBeInTheDocument()
    })

    // Cibler le bouton spécifiquement — "Dividende" apparaît aussi comme badge de type
    fireEvent.click(screen.getByRole('button', { name: 'Dividende' }))

    expect(screen.queryByText('Loyer appartement T2')).not.toBeInTheDocument()
    expect(screen.getByText('Dividendes Total')).toBeInTheDocument()
  })

  it('affiche tous les revenus au clic sur "Tous"', async () => {
    getOtherIncomes.mockResolvedValue(INCOMES)
    render(<OtherIncomePage />)

    await waitFor(() => expect(screen.getByText('Loyer appartement T2')).toBeInTheDocument())

    // Filtrer puis revenir à Tous
    fireEvent.click(screen.getByRole('button', { name: 'Dividende' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tous' }))

    expect(screen.getByText('Loyer appartement T2')).toBeInTheDocument()
    expect(screen.getByText('Dividendes Total')).toBeInTheDocument()
  })

  it("appelle getOtherIncomes au montage du composant", async () => {
    getOtherIncomes.mockResolvedValue([])
    render(<OtherIncomePage />)
    await waitFor(() => expect(getOtherIncomes).toHaveBeenCalledTimes(1))
  })
})
