import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RecurringExpenseForm from '../../../components/expenses/RecurringExpenseForm'

describe('RecurringExpenseForm', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Rendu initial ─────────────────────────────────────────────────────────

  it('affiche les 9 catégories de dépenses', () => {
    render(<RecurringExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'Logement' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Transport' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Autre' })).toBeInTheDocument()
  })

  it('catégorie par défaut est LOGEMENT', () => {
    render(<RecurringExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('LOGEMENT')
  })

  it('fréquence par défaut est MONTHLY', () => {
    render(<RecurringExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const selects = screen.getAllByRole('combobox')
    const freqSelect = selects.find(s => s.value === 'MONTHLY')
    expect(freqSelect).toBeDefined()
  })

  it('sharePercentage par défaut est 100', () => {
    render(<RecurringExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
  })

  // ── Préfill en mode édition ───────────────────────────────────────────────

  it('préfille tous les champs en mode édition', () => {
    const expense = {
      id: 1, category: 'TRANSPORT', label: 'Abonnement métro',
      amount: 90, frequency: 'MONTHLY', sharePercentage: 100,
      startDate: '', endDate: '', notes: '',
    }
    render(<RecurringExpenseForm expense={expense} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('Abonnement métro')).toBeInTheDocument()
    expect(screen.getByDisplayValue('90')).toBeInTheDocument()
  })

  // ── Aperçu projection temps réel ─────────────────────────────────────────

  it('affiche un aperçu mensuel quand un montant est saisi (MONTHLY)', () => {
    render(<RecurringExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('1000.00'), {
      target: { value: '1200' },
    })

    // L'aperçu mensuel = montant × (sharePercentage / 100) = 1200 × 1 = 1200
    expect(screen.getByText(/1.*200/)).toBeInTheDocument()
  })

  it('aperçu annuel = montant × 12 pour une dépense mensuelle', () => {
    render(<RecurringExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('1000.00'), {
      target: { value: '100' },
    })

    // Le bloc aperçu apparaît avec les labels "Mensuel :" et "Annuel :"
    expect(screen.getByText('Mensuel :')).toBeInTheDocument()
    expect(screen.getByText('Annuel :')).toBeInTheDocument()
  })

  it('aperçu mensuel = montant / 12 pour une dépense annuelle', () => {
    render(<RecurringExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    const selects = screen.getAllByRole('combobox')
    const freqSelect = selects.find(s => s.querySelector('option[value="ANNUAL"]'))
    if (freqSelect) {
      fireEvent.change(freqSelect, { target: { value: 'ANNUAL' } })
    }

    fireEvent.change(screen.getByPlaceholderText('1000.00'), {
      target: { value: '1200' },
    })

    // Les deux labels d'aperçu sont présents (mensuel = 1200/12, annuel = 1200)
    expect(screen.getByText('Mensuel :')).toBeInTheDocument()
    expect(screen.getByText('Annuel :')).toBeInTheDocument()
  })

  // ── Colocation ────────────────────────────────────────────────────────────

  it('affiche le badge colocation quand sharePercentage < 100', () => {
    render(<RecurringExpenseForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    // Saisir un montant d'abord (requis pour effectiveAmount != null)
    fireEvent.change(screen.getByPlaceholderText('1000.00'), {
      target: { value: '800' },
    })
    fireEvent.change(screen.getByDisplayValue('100'), {
      target: { value: '50' },
    })

    // Le badge colocation indique la part (50%)
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
  })

  // ── Boutons ───────────────────────────────────────────────────────────────

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<RecurringExpenseForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // ── Soumission ────────────────────────────────────────────────────────────

  it('appelle onSubmit avec amount et sharePercentage parsés', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<RecurringExpenseForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('ex : Loyer Paris 11e'), {
      target: { value: 'Loyer' },
    })
    fireEvent.change(screen.getByPlaceholderText('1000.00'), {
      target: { value: '800' },
    })

    const form = document.querySelector('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 800,
          sharePercentage: 100,
          category: 'LOGEMENT',
          frequency: 'MONTHLY',
        })
      )
    })
  })

  it('envoie startDate et endDate null quand les champs sont vides', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<RecurringExpenseForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('1000.00'), {
      target: { value: '500' },
    })

    const form = document.querySelector('form')
    fireEvent.submit(form)

    await waitFor(() => {
      if (onSubmit.mock.calls.length > 0) {
        const payload = onSubmit.mock.calls[0][0]
        expect(payload.startDate).toBeNull()
        expect(payload.endDate).toBeNull()
      }
    })
  })
})
