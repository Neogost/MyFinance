import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RecurringExpensePage from '../../../components/expenses/RecurringExpensePage'
import {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseBudgets,
  saveExpenseBudgets,
} from '../../../api/expenses'

// ── Mocks API ─────────────────────────────────────────────────────────────────

vi.mock('../../../api/expenses', () => ({
  getExpenses:       vi.fn(),
  getExpenseSummary: vi.fn(),
  createExpense:     vi.fn(),
  updateExpense:     vi.fn(),
  deleteExpense:     vi.fn(),
  getExpenseBudgets: vi.fn(),
  saveExpenseBudgets: vi.fn(),
}))

vi.mock('../../../components/expenses/RecurringExpenseForm', () => ({
  default: ({ expense, onSubmit, onCancel }) => (
    <div data-testid="expense-form">
      <span data-testid="form-mode">{expense?.id ? 'edit' : 'create'}</span>
      <button data-testid="form-submit"
        onClick={() => onSubmit({
          category: 'LOGEMENT', label: 'Dépense test',
          amount: 800, frequency: 'MONTHLY', sharePercentage: 100,
        })}>
        Soumettre
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>Annuler</button>
    </div>
  ),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SUMMARY = {
  monthlyNetIncome: 3200,
  totalMonthlyExpenses: 1850,
  totalAnnualExpenses: 22200,
  savingsCapacity: 1350,
  savingsRate: 42.2,
  incomeSource: 'NET_APRES_IMPOT',
  byCategory: [],
  breakdownNetImposable: null,
  breakdownEstimatedTax: null,
  breakdownBenefits: null,
  breakdownMealVoucherEmployer: null,
}

const EXPENSES = [
  {
    id: 1,
    category: 'LOGEMENT',
    label: 'Loyer appartement',
    amount: 1200,
    frequency: 'MONTHLY',
    sharePercentage: 100,
    monthlyAmount: 1200,
    annualAmount: 14400,
  },
  {
    id: 2,
    category: 'TRANSPORT',
    label: 'Abonnement métro',
    amount: 90,
    frequency: 'MONTHLY',
    sharePercentage: 100,
    monthlyAmount: 90,
    annualAmount: 1080,
  },
]

function mockFetchAll(expenses = EXPENSES, summary = SUMMARY, budgets = {}) {
  getExpenses.mockResolvedValue(expenses)
  getExpenseSummary.mockResolvedValue(summary)
  getExpenseBudgets.mockResolvedValue(budgets)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RecurringExpensePage — pattern CRUD avec budgets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
  })

  // ── États de chargement ───────────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getExpenses.mockReturnValue(new Promise(() => {}))
    getExpenseSummary.mockReturnValue(new Promise(() => {}))
    getExpenseBudgets.mockReturnValue(new Promise(() => {}))
    render(<RecurringExpensePage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche les dépenses après chargement', async () => {
    mockFetchAll()
    render(<RecurringExpensePage />)
    await waitFor(() => {
      expect(screen.getByText('Loyer appartement')).toBeInTheDocument()
      expect(screen.getByText('Abonnement métro')).toBeInTheDocument()
    })
  })

  it("affiche le message d'erreur si l'API échoue", async () => {
    getExpenses.mockRejectedValue(new Error('Network error'))
    getExpenseSummary.mockRejectedValue(new Error('Network error'))
    getExpenseBudgets.mockRejectedValue(new Error('Network error'))
    render(<RecurringExpensePage />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les dépenses.')).toBeInTheDocument()
    })
  })

  it('affiche "Aucune dépense récurrente" quand la liste est vide', async () => {
    mockFetchAll([])
    render(<RecurringExpensePage />)
    await waitFor(() => {
      expect(screen.getByText('Aucune dépense récurrente')).toBeInTheDocument()
    })
  })

  // ── Fetch initial appelle les 3 APIs ─────────────────────────────────────

  it('appelle getExpenses, getExpenseSummary et getExpenseBudgets au montage', async () => {
    mockFetchAll()
    render(<RecurringExpensePage />)
    await waitFor(() => {
      expect(getExpenses).toHaveBeenCalledTimes(1)
      expect(getExpenseSummary).toHaveBeenCalledTimes(1)
      expect(getExpenseBudgets).toHaveBeenCalledTimes(1)
    })
  })

  // ── Formulaire ────────────────────────────────────────────────────────────

  it('ouvre le formulaire de création au clic sur "+ Ajouter"', async () => {
    mockFetchAll([])
    render(<RecurringExpensePage />)
    await waitFor(() => expect(screen.getByTestId('add-recurring-expense-button')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('add-recurring-expense-button'))

    expect(screen.getByTestId('expense-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('create')
  })

  it('ouvre le formulaire d\'édition au clic sur "Modifier"', async () => {
    mockFetchAll()
    render(<RecurringExpensePage />)
    await waitFor(() => expect(screen.getByTestId(`edit-recurring-expense-${EXPENSES[0].id}`)).toBeInTheDocument())

    fireEvent.click(screen.getByTestId(`edit-recurring-expense-${EXPENSES[0].id}`))

    expect(screen.getByTestId('expense-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('edit')
  })

  it('ferme le formulaire au clic sur Annuler', async () => {
    mockFetchAll([])
    render(<RecurringExpensePage />)
    await waitFor(() => expect(screen.getByTestId('add-recurring-expense-button')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('add-recurring-expense-button'))
    fireEvent.click(screen.getByTestId('form-cancel'))

    expect(screen.queryByTestId('expense-form')).not.toBeInTheDocument()
  })

  // ── Création (refetch complet) ────────────────────────────────────────────

  it('appelle createExpense puis refetch complet des 3 APIs', async () => {
    mockFetchAll([])
    createExpense.mockResolvedValue({
      id: 10, category: 'LOGEMENT', label: 'Dépense test', amount: 800,
      frequency: 'MONTHLY', sharePercentage: 100, monthlyAmount: 800, annualAmount: 9600,
    })
    getExpenses.mockResolvedValue([])
    getExpenseSummary.mockResolvedValue(SUMMARY)
    getExpenseBudgets.mockResolvedValue({})

    render(<RecurringExpensePage />)
    await waitFor(() => expect(screen.getByTestId('add-recurring-expense-button')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('add-recurring-expense-button'))
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ category: 'LOGEMENT' }))
      // getExpenses appelé 2× (montage + refetch)
      expect(getExpenses).toHaveBeenCalledTimes(2)
    })
  })

  // ── Suppression (optimistic + refresh summary) ────────────────────────────

  it('supprime une dépense après confirmation dans la modale', async () => {
    mockFetchAll()
    deleteExpense.mockResolvedValue()
    getExpenseSummary.mockResolvedValue(SUMMARY)

    render(<RecurringExpensePage />)
    await waitFor(() => expect(screen.getByTestId(`delete-recurring-expense-${EXPENSES[0].id}`)).toBeInTheDocument())

    fireEvent.click(screen.getByTestId(`delete-recurring-expense-${EXPENSES[0].id}`))
    expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('delete-confirm-submit-button'))

    await waitFor(() => {
      expect(deleteExpense).toHaveBeenCalledWith(EXPENSES[0].id)
      expect(getExpenseSummary).toHaveBeenCalledTimes(2)
    })
  })

  it("n'appelle pas deleteExpense si l'utilisateur annule la modale", async () => {
    mockFetchAll()

    render(<RecurringExpensePage />)
    await waitFor(() => expect(screen.getByTestId(`delete-recurring-expense-${EXPENSES[0].id}`)).toBeInTheDocument())

    fireEvent.click(screen.getByTestId(`delete-recurring-expense-${EXPENSES[0].id}`))
    expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('delete-confirm-cancel-button'))

    expect(deleteExpense).not.toHaveBeenCalled()
  })

  it('retire la dépense de la liste après confirmation dans la modale', async () => {
    mockFetchAll()
    deleteExpense.mockResolvedValue()
    getExpenseSummary.mockResolvedValue(SUMMARY)

    render(<RecurringExpensePage />)
    await waitFor(() => expect(screen.getByText('Loyer appartement')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId(`delete-recurring-expense-${EXPENSES[0].id}`))
    fireEvent.click(screen.getByTestId('delete-confirm-submit-button'))

    await waitFor(() => {
      expect(screen.queryByText('Loyer appartement')).not.toBeInTheDocument()
    })
  })

  // ── Filtrage ──────────────────────────────────────────────────────────────

  it('filtre les dépenses par catégorie', async () => {
    mockFetchAll()
    render(<RecurringExpensePage />)

    await waitFor(() => {
      expect(screen.getByText('Loyer appartement')).toBeInTheDocument()
      expect(screen.getByText('Abonnement métro')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Transport' }))

    expect(screen.queryByText('Loyer appartement')).not.toBeInTheDocument()
    expect(screen.getByText('Abonnement métro')).toBeInTheDocument()
  })

  it('affiche toutes les dépenses au clic sur "Toutes"', async () => {
    mockFetchAll()
    render(<RecurringExpensePage />)
    await waitFor(() => expect(screen.getByText('Loyer appartement')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Transport' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toutes' }))

    expect(screen.getByText('Loyer appartement')).toBeInTheDocument()
    expect(screen.getByText('Abonnement métro')).toBeInTheDocument()
  })
})
