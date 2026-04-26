import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RegistrationRequestPage from '../../../components/admin/RegistrationRequestPage'
import { getRegistrations, approveRegistration, rejectRegistration } from '../../../api/registrations'

vi.mock('../../../api/registrations', () => ({
  getRegistrations:    vi.fn(),
  approveRegistration: vi.fn(),
  rejectRegistration:  vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const REQUESTS = [
  { id: 1, login: 'alice.martin', firstName: 'Alice', lastName: 'Martin', status: 'PENDING',  createdAt: '2026-04-25T10:00:00', reviewedBy: null },
  { id: 2, login: 'bob.durand',   firstName: 'Bob',   lastName: 'Durand', status: 'APPROVED', createdAt: '2026-04-20T09:00:00', reviewedBy: 'admin' },
  { id: 3, login: 'carol.smith',  firstName: 'Carol', lastName: 'Smith',  status: 'REJECTED', createdAt: '2026-04-18T08:00:00', reviewedBy: 'admin' },
]

const PENDING_REQUESTS = REQUESTS.filter(r => r.status === 'PENDING')

describe('RegistrationRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
  })

  // ── Chargement ────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getRegistrations.mockReturnValue(new Promise(() => {}))
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche l\'erreur si le chargement échoue', async () => {
    getRegistrations.mockRejectedValue(new Error('Network error'))
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les demandes.')).toBeInTheDocument()
    })
  })

  it('affiche "Aucune demande" si la liste est vide', async () => {
    getRegistrations.mockResolvedValue([])
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Aucune demande')).toBeInTheDocument()
    })
  })

  // ── Affichage ─────────────────────────────────────────────

  it('affiche le titre "Demandes d\'inscription"', async () => {
    getRegistrations.mockResolvedValue([])
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    expect(screen.getByText("Demandes d'inscription")).toBeInTheDocument()
  })

  it('affiche les demandes après chargement', async () => {
    getRegistrations.mockResolvedValue(PENDING_REQUESTS)
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('alice.martin')).toBeInTheDocument()
    })
  })

  it('affiche les boutons de filtre (En attente, Approuvé, Rejeté, Toutes)', async () => {
    getRegistrations.mockResolvedValue([])
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'En attente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approuvé' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeté' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toutes' })).toBeInTheDocument()
  })

  it('affiche les boutons Approuver / Rejeter pour les demandes PENDING', async () => {
    getRegistrations.mockResolvedValue(PENDING_REQUESTS)
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('alice.martin')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Approuver' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeter' })).toBeInTheDocument()
  })

  it('n\'affiche pas Approuver/Rejeter pour les demandes traitées', async () => {
    getRegistrations.mockResolvedValue([REQUESTS[1]]) // APPROVED
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('bob.durand')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Approuver' })).not.toBeInTheDocument()
  })

  // ── Actions ───────────────────────────────────────────────

  it('approuve une demande au clic sur Approuver', async () => {
    const updated = { ...PENDING_REQUESTS[0], status: 'APPROVED', reviewedBy: 'admin' }
    approveRegistration.mockResolvedValue(updated)
    getRegistrations.mockResolvedValue(PENDING_REQUESTS)
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approuver' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Approuver' }))
    await waitFor(() => expect(approveRegistration).toHaveBeenCalledWith(1))
  })

  it('rejette une demande après confirmation', async () => {
    const updated = { ...PENDING_REQUESTS[0], status: 'REJECTED' }
    rejectRegistration.mockResolvedValue(updated)
    getRegistrations.mockResolvedValue(PENDING_REQUESTS)
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rejeter' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Rejeter' }))
    await waitFor(() => expect(rejectRegistration).toHaveBeenCalledWith(1))
  })

  it('ne rejette pas si l\'utilisateur annule la confirmation', async () => {
    window.confirm = vi.fn(() => false)
    getRegistrations.mockResolvedValue(PENDING_REQUESTS)
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rejeter' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Rejeter' }))
    expect(rejectRegistration).not.toHaveBeenCalled()
  })

  // ── Changement de filtre ──────────────────────────────────

  it('change le filtre et re-fetch au clic sur un bouton de statut', async () => {
    getRegistrations.mockResolvedValue([])
    render(<RegistrationRequestPage onPendingCountChange={vi.fn()} />)
    await waitFor(() => expect(getRegistrations).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Toutes' }))
    await waitFor(() => {
      expect(getRegistrations).toHaveBeenCalledWith(null)
    })
  })

  // ── Callback compteur ─────────────────────────────────────

  it('appelle onPendingCountChange avec le nombre de PENDING', async () => {
    const onPendingCountChange = vi.fn()
    getRegistrations.mockResolvedValue(PENDING_REQUESTS)
    render(<RegistrationRequestPage onPendingCountChange={onPendingCountChange} />)
    await waitFor(() => {
      expect(onPendingCountChange).toHaveBeenCalledWith(1)
    })
  })
})
