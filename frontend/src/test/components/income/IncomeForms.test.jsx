import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BonusForm    from '../../../components/income/BonusForm'
import BenefitForm  from '../../../components/income/BenefitForm'
import OnCallForm   from '../../../components/income/OnCallForm'
import PaySlipForm  from '../../../components/income/PaySlipForm'
import RevisionForm from '../../../components/income/RevisionForm'

// ── BonusForm ──────────────────────────────────────────────────────────────────

describe('BonusForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Ajouter une prime" en mode création', () => {
    render(<BonusForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Ajouter une prime')).toBeInTheDocument()
  })

  it('affiche "Modifier la prime" en mode édition', () => {
    const bonus = { id: 1, type: 'ANNUELLE', label: 'Prime', grossAmount: 1000, paymentDate: '2024-06', paymentMonth: '' }
    render(<BonusForm bonus={bonus} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Modifier la prime')).toBeInTheDocument()
  })

  it('préfille le label en mode édition', () => {
    const bonus = { id: 1, type: 'ANNUELLE', label: '13ème mois', grossAmount: 3750, paymentDate: '2024-12', paymentMonth: '' }
    render(<BonusForm bonus={bonus} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('13ème mois')).toBeInTheDocument()
  })

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<BonusForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('affiche le bouton "Ajouter" en mode création', () => {
    render(<BonusForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
  })

  it('appelle onSubmit avec grossAmount parsé en Float', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<BonusForm onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/ex : 13ème mois/i), { target: { value: 'Prime' } })
    fireEvent.change(screen.getByPlaceholderText('1000.00'), { target: { value: '500' } })
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ grossAmount: 500 }))
    })
  })
})

// ── BenefitForm ────────────────────────────────────────────────────────────────

describe('BenefitForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Ajouter un avantage en nature" en mode création', () => {
    render(<BenefitForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Ajouter un avantage en nature')).toBeInTheDocument()
  })

  it('préfille le label en mode édition', () => {
    const benefit = { id: 1, label: 'Téléphone pro', monthlyAmount: 30 }
    render(<BenefitForm benefit={benefit} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('Téléphone pro')).toBeInTheDocument()
  })

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<BenefitForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('appelle onSubmit avec monthlyAmount parsé en Float', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<BenefitForm onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/Frais de télétravail/i), { target: { value: 'Ticket repas' } })
    fireEvent.change(screen.getByPlaceholderText('50.00'), { target: { value: '9.5' } })
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ label: 'Ticket repas', monthlyAmount: 9.5 })
    })
  })
})

// ── OnCallForm ─────────────────────────────────────────────────────────────────

describe('OnCallForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Ajouter une astreinte" en mode création', () => {
    render(<OnCallForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Ajouter une astreinte')).toBeInTheDocument()
  })

  it('préfille les montants en mode édition', () => {
    const onCall = { id: 1, weeklyFlatRate: 400, estimatedWeeksPerYear: 8 }
    render(<OnCallForm onCall={onCall} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('400')).toBeInTheDocument()
    expect(screen.getByDisplayValue('8')).toBeInTheDocument()
  })

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<OnCallForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('appelle onSubmit avec les montants parsés', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<OnCallForm onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('500.00'), { target: { value: '300' } })
    fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '10' } })
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ weeklyFlatRate: 300, estimatedWeeksPerYear: 10 }))
    })
  })
})

// ── PaySlipForm ────────────────────────────────────────────────────────────────

describe('PaySlipForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Ajouter un bulletin de paie" en mode création', () => {
    render(<PaySlipForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Ajouter un bulletin de paie')).toBeInTheDocument()
  })

  it('affiche "Modifier le bulletin" en mode édition', () => {
    const slip = { id: 1, period: '2024-01-01', grossSalary: 3750, taxableNetSalary: 3100, netSalary: 2800, incomeTaxWithholding: 280 }
    render(<PaySlipForm slip={slip} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Modifier le bulletin')).toBeInTheDocument()
  })

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<PaySlipForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('appelle onSubmit avec les salaires parsés en Float', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<PaySlipForm onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /mm\/aaaa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Mai' }))
    fireEvent.change(screen.getByPlaceholderText('3750.00'), { target: { value: '4000' } })
    fireEvent.change(screen.getByPlaceholderText('3000.00'), { target: { value: '3300' } })
    fireEvent.change(screen.getByPlaceholderText('2680.00'), { target: { value: '3000' } })
    fireEvent.change(screen.getByPlaceholderText('320.00'),  { target: { value: '280' } })
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        grossSalary: 4000, taxableNetSalary: 3300, netSalary: 3000, incomeTaxWithholding: 280,
      }))
    })
  })
})

// ── RevisionForm ───────────────────────────────────────────────────────────────

describe('RevisionForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Ajouter une révision salariale" en mode création', () => {
    render(<RevisionForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Ajouter une révision salariale')).toBeInTheDocument()
  })

  it('préfille le salaire en mode édition', () => {
    const revision = { id: 1, effectiveDate: '2024-01-01', annualGrossSalary: 48000, label: 'Augmentation' }
    render(<RevisionForm revision={revision} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('48000')).toBeInTheDocument()
  })

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<RevisionForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('appelle onSubmit avec annualGrossSalary parsé en Float', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<RevisionForm onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('48000.00'), { target: { value: '50000' } })
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ annualGrossSalary: 50000 }))
    })
  })
})
