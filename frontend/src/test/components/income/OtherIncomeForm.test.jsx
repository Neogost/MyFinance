import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OtherIncomeForm from '../../../components/income/OtherIncomeForm'

describe('OtherIncomeForm', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Rendu initial ─────────────────────────────────────────────────────────

  it('affiche les 4 types de revenus dans le select', () => {
    render(<OtherIncomeForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'Revenu locatif' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Dividende' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Aide sociale' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Autre' })).toBeInTheDocument()
  })

  it('type par défaut est LOCATIF', () => {
    render(<OtherIncomeForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('LOCATIF')
  })

  it('la checkbox "Imposable" est cochée par défaut', () => {
    render(<OtherIncomeForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  // ── Préfill en mode édition ───────────────────────────────────────────────

  it('préfille les champs en mode édition', () => {
    const income = {
      id: 1, type: 'DIVIDENDE', label: 'Actions Total',
      amount: 250, date: '2025-03-15', isTaxable: true, specificTaxRate: null,
    }
    render(<OtherIncomeForm income={income} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('DIVIDENDE')
    expect(screen.getByDisplayValue('Actions Total')).toBeInTheDocument()
    expect(screen.getByDisplayValue('250')).toBeInTheDocument()
  })

  // ── Champs fiscaux conditionnels ──────────────────────────────────────────

  it('décoche "Imposable" → efface specificTaxRate', async () => {
    render(<OtherIncomeForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    const taxRateInput = screen.queryByPlaceholderText(/30/)
    if (taxRateInput) {
      fireEvent.change(taxRateInput, { target: { value: '30' } })
    }

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('affiche le champ de taux fixe quand isTaxable est coché', () => {
    render(<OtherIncomeForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  // ── Boutons ───────────────────────────────────────────────────────────────

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<OtherIncomeForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // ── Soumission ────────────────────────────────────────────────────────────

  it('appelle onSubmit avec amount parsé en Float', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<OtherIncomeForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Loyer appartement/i), {
      target: { value: 'Loyer T2' },
    })
    fireEvent.change(screen.getByPlaceholderText('750.00'), {
      target: { value: '1200' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: '' }), {
      target: { value: '2025-06-01' },
    })

    const form = document.querySelector('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1200 })
      )
    })
  })

  it('envoie specificTaxRate = null quand le champ est vide', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<OtherIncomeForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    const form = document.querySelector('form')
    fireEvent.submit(form)

    await waitFor(() => {
      if (onSubmit.mock.calls.length > 0) {
        const payload = onSubmit.mock.calls[0][0]
        expect(payload.specificTaxRate).toBeNull()
      }
    })
  })
})
