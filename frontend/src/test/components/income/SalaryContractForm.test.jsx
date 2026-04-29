import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SalaryContractForm         from '../../../components/income/SalaryContractForm'
import SalaryContractFormPrivate  from '../../../components/income/SalaryContractFormPrivate'

describe('SalaryContractForm', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Step 1 : sélection du type (création) ────────────────────────────────

  it('affiche "Nouveau contrat de travail" pour une création (step 1)', () => {
    render(<SalaryContractForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Nouveau contrat de travail')).toBeInTheDocument()
  })

  it('affiche le formulaire privé directement en mode édition', () => {
    render(<SalaryContractForm contract={{ id: 1 }} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/Modifier le contrat/)).toBeInTheDocument()
  })
})

// ── SalaryContractFormPrivate : formulaire privé ──────────────────────────

describe('SalaryContractFormPrivate', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Rendu initial ─────────────────────────────────────────────────────────

  it('affiche les champs principaux', () => {
    render(<SalaryContractFormPrivate onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByPlaceholderText('45000')).toBeInTheDocument()
  })

  it('affiche la checkbox "Statut cadre"', () => {
    render(<SalaryContractFormPrivate onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  // ── Préfill en mode édition ───────────────────────────────────────────────

  it('préfille le salaire brut annuel', () => {
    const contract = {
      id: 1, baseGrossSalary: 45000, paidMonthsPerYear: 13,
      weeklyHours: 35, mealVoucherAmount: 9, mealVoucherEmployeeRate: 50,
      isCadre: true, employeePrevoyanceRate: 0.015,
    }
    render(<SalaryContractFormPrivate contract={contract} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('45000')).toBeInTheDocument()
  })

  it('préfille paidMonthsPerYear', () => {
    const contract = {
      id: 1, baseGrossSalary: 45000, paidMonthsPerYear: 13,
      weeklyHours: 35, mealVoucherAmount: 9, mealVoucherEmployeeRate: 50,
      isCadre: false,
    }
    render(<SalaryContractFormPrivate contract={contract} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('45000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('35')).toBeInTheDocument()
  })

  it('convertit employeePrevoyanceRate de décimal en % pour l\'affichage', () => {
    const contract = {
      id: 1, baseGrossSalary: 40000, paidMonthsPerYear: 12,
      weeklyHours: 35, mealVoucherAmount: 0, mealVoucherEmployeeRate: 50,
      isCadre: false, employeePrevoyanceRate: 0.015,
    }
    render(<SalaryContractFormPrivate contract={contract} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('1.50')).toBeInTheDocument()
  })

  it('coche la checkbox Cadre quand isCadre=true', () => {
    const contract = {
      id: 1, baseGrossSalary: 50000, paidMonthsPerYear: 12,
      weeklyHours: 35, mealVoucherAmount: 0, mealVoucherEmployeeRate: 50,
      isCadre: true,
    }
    render(<SalaryContractFormPrivate contract={contract} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  // ── Valeurs par défaut ────────────────────────────────────────────────────

  it('35 heures et 12 mois par défaut pour une nouvelle entrée', () => {
    render(<SalaryContractFormPrivate onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('35')).toBeInTheDocument()
    expect(screen.getByText(/Mois de paie/i)).toBeInTheDocument()
  })

  it('35 heures par défaut pour une nouvelle entrée', () => {
    render(<SalaryContractFormPrivate onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('35')).toBeInTheDocument()
  })

  // ── Interactions ──────────────────────────────────────────────────────────

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<SalaryContractFormPrivate onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('affiche "Créer" pour une création, "Enregistrer" pour une édition', () => {
    const { rerender } = render(<SalaryContractFormPrivate onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Créer' })).toBeInTheDocument()

    rerender(<SalaryContractFormPrivate
      contract={{ id: 1, baseGrossSalary: 0, annualGrossSalary: 0, paidMonthsPerYear: 12, weeklyHours: 35, mealVoucherAmount: 0, mealVoucherEmployeeRate: 50, isCadre: false }}
      onSubmit={vi.fn()} onCancel={vi.fn()}
    />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  // ── Soumission ────────────────────────────────────────────────────────────

  it('appelle onSubmit avec annualGrossSalary parsé en Float', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<SalaryContractFormPrivate onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('45000'), {
      target: { value: '42000' },
    })
    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ annualGrossSalary: 42000 })
      )
    })
  })

  it('convertit employeePrevoyanceRate de % en décimal dans le payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<SalaryContractFormPrivate onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('45000'), {
      target: { value: '40000' },
    })
    fireEvent.change(screen.getByPlaceholderText('1.50'), {
      target: { value: '2' },
    })
    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ employeePrevoyanceRate: 0.02 })
      )
    })
  })

  it('affiche une erreur 409 quand un contrat actif existe déjà', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ response: { status: 409 } })
    render(<SalaryContractFormPrivate onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('45000'), {
      target: { value: '40000' },
    })
    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(screen.getByText(/contrat actif existe déjà/)).toBeInTheDocument()
    })
  })
})
