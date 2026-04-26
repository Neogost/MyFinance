import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SafetyNetPanel from '../../../components/profile/SafetyNetPanel'
import { updateSafetyNet } from '../../../api/auth'
import { getExpenseSummary } from '../../../api/expenses'
import { getSalaryContracts } from '../../../api/income'

vi.mock('../../../api/auth',    () => ({ updateSafetyNet: vi.fn() }))
vi.mock('../../../api/expenses', () => ({ getExpenseSummary: vi.fn() }))
vi.mock('../../../api/income',   () => ({ getSalaryContracts: vi.fn() }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_BLANK = { safetyNetMode: null, safetyNetMonths: null, safetyNetAmount: null }
const USER_FIXED = { safetyNetMode: 'FIXED_AMOUNT', safetyNetMonths: null, safetyNetAmount: 10000 }
const USER_MONTHS = { safetyNetMode: 'MONTHS_EXPENSES', safetyNetMonths: 3, safetyNetAmount: null }

describe('SafetyNetPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getExpenseSummary.mockResolvedValue({ totalMonthlyExpenses: 2000, totalMonthlyAmount: 2000 })
    getSalaryContracts.mockResolvedValue([])
  })

  // ── Affichage ─────────────────────────────────────────────

  it('affiche le titre "Matelas de sécurité"', () => {
    render(<SafetyNetPanel user={USER_BLANK} onUpdate={vi.fn()} />)
    expect(screen.getByText('Matelas de sécurité')).toBeInTheDocument()
  })

  it('affiche les 3 boutons de mode', () => {
    render(<SafetyNetPanel user={USER_BLANK} onUpdate={vi.fn()} />)
    expect(screen.getByText('Mois de dépenses')).toBeInTheDocument()
    expect(screen.getByText('Mois de salaire')).toBeInTheDocument()
    expect(screen.getByText('Montant fixe')).toBeInTheDocument()
  })

  // ── Sélection de mode ─────────────────────────────────────

  it('affiche le champ "Nombre de mois" en mode MONTHS_EXPENSES', () => {
    render(<SafetyNetPanel user={USER_MONTHS} onUpdate={vi.fn()} />)
    expect(screen.getByText('Nombre de mois')).toBeInTheDocument()
    expect(screen.getByDisplayValue('3')).toBeInTheDocument()
  })

  it('affiche le champ "Montant cible" en mode FIXED_AMOUNT', () => {
    render(<SafetyNetPanel user={USER_FIXED} onUpdate={vi.fn()} />)
    expect(screen.getByText('Montant cible')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10000')).toBeInTheDocument()
  })

  it('affiche le champ "Nombre de mois" au clic sur "Mois de dépenses"', () => {
    render(<SafetyNetPanel user={USER_BLANK} onUpdate={vi.fn()} />)
    expect(screen.queryByText('Nombre de mois')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Mois de dépenses'))
    expect(screen.getByText('Nombre de mois')).toBeInTheDocument()
  })

  it('affiche le champ "Montant cible" au clic sur "Montant fixe"', () => {
    render(<SafetyNetPanel user={USER_BLANK} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Montant fixe'))
    expect(screen.getByText('Montant cible')).toBeInTheDocument()
  })

  it('affiche le bouton "Supprimer la configuration" quand un mode est sélectionné', () => {
    render(<SafetyNetPanel user={USER_FIXED} onUpdate={vi.fn()} />)
    expect(screen.getByText('Supprimer la configuration')).toBeInTheDocument()
  })

  it('réinitialise le mode au clic sur "Supprimer la configuration"', () => {
    render(<SafetyNetPanel user={USER_FIXED} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByText('Supprimer la configuration'))
    expect(screen.queryByText('Montant cible')).not.toBeInTheDocument()
  })

  // ── Aperçu ────────────────────────────────────────────────

  it('affiche l\'aperçu calculé en mode FIXED_AMOUNT avec montant saisi', () => {
    render(<SafetyNetPanel user={USER_FIXED} onUpdate={vi.fn()} />)
    expect(screen.getByText(/Objectif calculé/)).toBeInTheDocument()
  })

  // ── Sauvegarde ────────────────────────────────────────────

  it('appelle updateSafetyNet au clic sur Enregistrer', async () => {
    updateSafetyNet.mockResolvedValue({ ...USER_FIXED })
    render(<SafetyNetPanel user={USER_FIXED} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(updateSafetyNet).toHaveBeenCalledWith(
        expect.objectContaining({ safetyNetMode: 'FIXED_AMOUNT', safetyNetAmount: 10000 })
      )
    })
  })

  it('affiche le message de succès après sauvegarde', async () => {
    updateSafetyNet.mockResolvedValue({ ...USER_FIXED })
    render(<SafetyNetPanel user={USER_FIXED} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText('Paramètres enregistrés.')).toBeInTheDocument()
    })
  })

  it('appelle onUpdate après sauvegarde réussie', async () => {
    const onUpdate = vi.fn()
    updateSafetyNet.mockResolvedValue({ ...USER_FIXED })
    render(<SafetyNetPanel user={USER_FIXED} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
  })

  it('affiche un message d\'erreur en cas d\'échec', async () => {
    updateSafetyNet.mockRejectedValue({ response: { data: { message: null } } })
    render(<SafetyNetPanel user={USER_FIXED} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText(/Impossible d'enregistrer/)).toBeInTheDocument()
    })
  })
})
