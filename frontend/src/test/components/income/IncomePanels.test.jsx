import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BonusPanel    from '../../../components/income/BonusPanel'
import BenefitPanel  from '../../../components/income/BenefitPanel'
import OnCallPanel   from '../../../components/income/OnCallPanel'
import PaySlipPanel  from '../../../components/income/PaySlipPanel'
import RevisionPanel from '../../../components/income/RevisionPanel'
import {
  getBonuses, createBonus, deleteBonus,
  getBenefits, createBenefit, deleteBenefit,
  getOnCalls, createOnCall, deleteOnCall,
  getPaySlips, createPaySlip, deletePaySlip,
  getRevisions, createRevision, deleteRevision,
} from '../../../api/income'

vi.mock('../../../api/income', () => ({
  getBonuses:      vi.fn(), createBonus:      vi.fn(), updateBonus:      vi.fn(), deleteBonus:      vi.fn(),
  getBenefits:     vi.fn(), createBenefit:    vi.fn(), updateBenefit:    vi.fn(), deleteBenefit:    vi.fn(),
  getOnCalls:      vi.fn(), createOnCall:     vi.fn(), updateOnCall:     vi.fn(), deleteOnCall:     vi.fn(),
  getPaySlips:     vi.fn(), createPaySlip:    vi.fn(), updatePaySlip:    vi.fn(), deletePaySlip:    vi.fn(),
  getRevisions:    vi.fn(), createRevision:   vi.fn(), updateRevision:   vi.fn(), deleteRevision:   vi.fn(),
}))

// ── BonusPanel ─────────────────────────────────────────────────────────────────

describe('BonusPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); window.confirm = vi.fn(() => true) })

  it('affiche "Chargement des primes…" pendant le fetch', () => {
    getBonuses.mockReturnValue(new Promise(() => {}))
    render(<BonusPanel contractId={1} />)
    expect(screen.getByText(/Chargement des primes/)).toBeInTheDocument()
  })

  it('affiche "Aucune prime saisie" quand la liste est vide', async () => {
    getBonuses.mockResolvedValue([])
    render(<BonusPanel contractId={1} />)
    await waitFor(() => expect(screen.getByText(/Aucune prime saisie/)).toBeInTheDocument())
  })

  it('affiche le label d\'une prime existante', async () => {
    getBonuses.mockResolvedValue([{ id: 1, type: 'ANNUELLE', label: '13ème mois', grossAmount: 3750, paymentDate: '2024-12', paymentMonth: null }])
    render(<BonusPanel contractId={1} />)
    await waitFor(() => expect(screen.getByText('13ème mois')).toBeInTheDocument())
  })

  it('ouvre le formulaire au clic sur "+ Ajouter une prime"', async () => {
    getBonuses.mockResolvedValue([])
    render(<BonusPanel contractId={1} />)
    await waitFor(() => fireEvent.click(screen.getByText('+ Ajouter une prime')))
    expect(screen.getByText('Ajouter une prime')).toBeInTheDocument()
  })

  it('appelle deleteBonus après confirmation de suppression', async () => {
    getBonuses.mockResolvedValue([{ id: 5, type: 'ANNUELLE', label: 'Prime test', grossAmount: 1000, paymentDate: '2024-06', paymentMonth: null }])
    deleteBonus.mockResolvedValue()
    render(<BonusPanel contractId={1} />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Supprimer/ })))
    expect(deleteBonus).toHaveBeenCalledWith(1, 5)
  })
})

// ── BenefitPanel ───────────────────────────────────────────────────────────────

describe('BenefitPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); window.confirm = vi.fn(() => true) })

  it('affiche "Chargement des avantages…" pendant le fetch', () => {
    getBenefits.mockReturnValue(new Promise(() => {}))
    render(<BenefitPanel contractId={1} />)
    expect(screen.getByText(/Chargement des avantages/)).toBeInTheDocument()
  })

  it('affiche "Aucun avantage en nature" quand la liste est vide', async () => {
    getBenefits.mockResolvedValue([])
    render(<BenefitPanel contractId={1} />)
    await waitFor(() => expect(screen.getByText(/Aucun avantage en nature/)).toBeInTheDocument())
  })

  it('affiche le label d\'un avantage existant', async () => {
    getBenefits.mockResolvedValue([{ id: 1, label: 'Téléphone pro', monthlyAmount: 30 }])
    render(<BenefitPanel contractId={1} />)
    await waitFor(() => expect(screen.getByText('Téléphone pro')).toBeInTheDocument())
  })

  it('ouvre le formulaire au clic sur "+ Ajouter un avantage"', async () => {
    getBenefits.mockResolvedValue([])
    render(<BenefitPanel contractId={1} />)
    await waitFor(() => fireEvent.click(screen.getByText('+ Ajouter un avantage')))
    expect(screen.getByText('Ajouter un avantage en nature')).toBeInTheDocument()
  })
})

// ── OnCallPanel ────────────────────────────────────────────────────────────────

describe('OnCallPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); window.confirm = vi.fn(() => true) })

  it('affiche "Chargement des astreintes…" pendant le fetch', () => {
    getOnCalls.mockReturnValue(new Promise(() => {}))
    render(<OnCallPanel contractId={1} />)
    expect(screen.getByText(/Chargement des astreintes/)).toBeInTheDocument()
  })

  it('affiche "Aucune astreinte saisie" quand la liste est vide', async () => {
    getOnCalls.mockResolvedValue([])
    render(<OnCallPanel contractId={1} />)
    await waitFor(() => expect(screen.getByText(/Aucune astreinte saisie/)).toBeInTheDocument())
  })

  it('affiche le forfait hebdomadaire d\'une astreinte existante', async () => {
    getOnCalls.mockResolvedValue([{ id: 1, weeklyFlatRate: 500, estimatedWeeksPerYear: 6, annualAmount: 3000 }])
    render(<OnCallPanel contractId={1} />)
    await waitFor(() => expect(screen.getByText(/500/)).toBeInTheDocument())
  })

  it('ouvre le formulaire au clic sur "+ Ajouter une astreinte"', async () => {
    getOnCalls.mockResolvedValue([])
    render(<OnCallPanel contractId={1} />)
    await waitFor(() => fireEvent.click(screen.getByText('+ Ajouter une astreinte')))
    expect(screen.getByText('Ajouter une astreinte')).toBeInTheDocument()
  })
})

// ── PaySlipPanel ───────────────────────────────────────────────────────────────

describe('PaySlipPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
    // Par défaut : pas de révisions (le composant les charge en parallèle des bulletins)
    getRevisions.mockResolvedValue([])
  })

  it('affiche "Chargement des bulletins…" pendant le fetch', () => {
    getPaySlips.mockReturnValue(new Promise(() => {}))
    render(<PaySlipPanel contractId={1} projection={{}} />)
    expect(screen.getByText(/Chargement des bulletins/)).toBeInTheDocument()
  })

  it('affiche "Aucun bulletin saisi" quand la liste est vide', async () => {
    getPaySlips.mockResolvedValue([])
    render(<PaySlipPanel contractId={1} projection={{}} />)
    await waitFor(() => expect(screen.getByText(/Aucun bulletin saisi/)).toBeInTheDocument())
  })

  it('affiche les colonnes du tableau quand un bulletin existe', async () => {
    getPaySlips.mockResolvedValue([{ id: 1, period: '2024-01-01', grossSalary: 3750, taxableNetSalary: 3100, netSalary: 2800, incomeTaxWithholding: 280 }])
    render(<PaySlipPanel contractId={1} projection={{}} />)
    await waitFor(() => expect(screen.getByText('Brut réel')).toBeInTheDocument())
  })

  it('ouvre le formulaire au clic sur "+ Ajouter un bulletin"', async () => {
    getPaySlips.mockResolvedValue([])
    render(<PaySlipPanel contractId={1} projection={{}} />)
    await waitFor(() => fireEvent.click(screen.getByText('+ Ajouter un bulletin')))
    expect(screen.getByText('Ajouter un bulletin de paie')).toBeInTheDocument()
  })
})

// ── RevisionPanel ──────────────────────────────────────────────────────────────

describe('RevisionPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); window.confirm = vi.fn(() => true) })

  it('affiche "Chargement des révisions…" pendant le fetch', () => {
    getRevisions.mockReturnValue(new Promise(() => {}))
    render(<RevisionPanel contractId={1} activeRevisionId={null} />)
    expect(screen.getByText(/Chargement des révisions/)).toBeInTheDocument()
  })

  it('affiche "Aucune révision salariale" quand la liste est vide', async () => {
    getRevisions.mockResolvedValue([])
    render(<RevisionPanel contractId={1} activeRevisionId={null} />)
    await waitFor(() => expect(screen.getByText(/Aucune révision salariale/)).toBeInTheDocument())
  })

  it('affiche le label d\'une révision existante', async () => {
    getRevisions.mockResolvedValue([{ id: 1, effectiveDate: '2024-01-01', annualGrossSalary: 48000, label: 'Augmentation 2024' }])
    render(<RevisionPanel contractId={1} activeRevisionId={1} />)
    await waitFor(() => expect(screen.getByText('Augmentation 2024')).toBeInTheDocument())
  })

  it('ouvre le formulaire au clic sur "+ Ajouter une révision"', async () => {
    getRevisions.mockResolvedValue([])
    render(<RevisionPanel contractId={1} activeRevisionId={null} />)
    await waitFor(() => fireEvent.click(screen.getByText('+ Ajouter une révision')))
    expect(screen.getByText('Ajouter une révision salariale')).toBeInTheDocument()
  })
})
