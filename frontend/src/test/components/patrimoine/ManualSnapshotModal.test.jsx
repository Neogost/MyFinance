import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ManualSnapshotModal from '../../../components/patrimoine/ManualSnapshotModal'
import {
  getAdminUserPositions, getAdminSnapshot,
  createAdminSnapshot, updateAdminSnapshot,
} from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getAdminUserPositions:  vi.fn(),
  getAdminSnapshot:       vi.fn(),
  createAdminSnapshot:    vi.fn(),
  updateAdminSnapshot:    vi.fn(),
  getPositions:           vi.fn(),
  getPatrimoineScore:     vi.fn(),
  getInstruments:         vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USERS = [
  { id: 1, firstName: 'Jean',  lastName: 'Dupont', login: 'jean.dupont'  },
  { id: 2, firstName: 'Marie', lastName: 'Martin', login: 'marie.martin' },
]

const POSITIONS = [
  { id: 10, label: 'ETF World',     category: 'BOURSE',   status: 'ACTIVE', partner: null },
  { id: 11, label: 'Livret A',       category: 'LIVRET',   status: 'ACTIVE', partner: null },
]

const SNAPSHOT = {
  id: 5,
  userId: 1,
  snapshotDate: '2026-01-01',
  positions: [
    { positionId: 10, investedAmountEur: 20000, currentValueEur: 25000, units: null, unitPriceEur: null },
  ],
}

describe('ManualSnapshotModal', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Titre création / édition ───────────────────────────────

  it('affiche le titre de création', () => {
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={null} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText(/Ajouter manuellement un Relevé de patrimoine/)).toBeInTheDocument()
  })

  it('affiche le titre d\'édition', async () => {
    getAdminUserPositions.mockResolvedValue(POSITIONS)
    getAdminSnapshot.mockResolvedValue({ ...SNAPSHOT, positions: SNAPSHOT.positions })
    render(<ManualSnapshotModal users={USERS} snapshot={SNAPSHOT} initialUserId={null} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Modifier le relevé de patrimoine')).toBeInTheDocument()
  })

  // ── Utilisateur ───────────────────────────────────────────

  it('affiche "Aucun utilisateur sélectionné" si pas d\'initialUserId', () => {
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={null} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Aucun utilisateur sélectionné')).toBeInTheDocument()
  })

  it('affiche le nom de l\'utilisateur si initialUserId est fourni', async () => {
    getAdminUserPositions.mockResolvedValue([])
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={1} onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument()
    })
  })

  // ── Chargement des positions ──────────────────────────────

  it('charge les positions quand un utilisateur est sélectionné', async () => {
    getAdminUserPositions.mockResolvedValue(POSITIONS)
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={1} onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      expect(getAdminUserPositions).toHaveBeenCalledWith('1')
    })
  })

  it('affiche les positions chargées dans le tableau', async () => {
    getAdminUserPositions.mockResolvedValue(POSITIONS)
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={1} onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('ETF World')).toBeInTheDocument()
      expect(screen.getByText('Livret A')).toBeInTheDocument()
    })
  })

  it('affiche "Aucune position" si la liste est vide', async () => {
    getAdminUserPositions.mockResolvedValue([])
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={1} onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Aucune position pour cet utilisateur.')).toBeInTheDocument()
    })
  })

  // ── Validation ────────────────────────────────────────────

  it('désactive le bouton "Créer" si pas de date ni de valeur', async () => {
    getAdminUserPositions.mockResolvedValue(POSITIONS)
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={1} onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('ETF World')).toBeInTheDocument())
    // Sans date ni valeur, le bouton est disabled
    expect(screen.getByRole('button', { name: /Créer le relevé/i })).toBeDisabled()
  })

  it('désactive le bouton "Créer" si date saisie mais aucune valeur de position', async () => {
    getAdminUserPositions.mockResolvedValue(POSITIONS)
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={1} onClose={vi.fn()} onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('ETF World')).toBeInTheDocument())
    // Date remplie mais aucune valeur de position → toujours disabled
    fireEvent.click(screen.getByRole('button', { name: /jj\/mm\/aaaa/i }))
    fireEvent.click(screen.getAllByRole('button', { name: '1' })[0])
    expect(screen.getByRole('button', { name: /Créer le relevé/i })).toBeDisabled()
  })

  // ── Soumission ────────────────────────────────────────────

  it('appelle createAdminSnapshot et onSaved/onClose après création', async () => {
    createAdminSnapshot.mockResolvedValue({})
    getAdminUserPositions.mockResolvedValue(POSITIONS)
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={1} onClose={onClose} onSaved={onSaved} />)
    await waitFor(() => expect(screen.getByText('ETF World')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /jj\/mm\/aaaa/i }))
    fireEvent.click(screen.getAllByRole('button', { name: '1' })[0])
    // Saisir une valeur pour la première position
    const inputs = screen.getAllByPlaceholderText('0.00')
    fireEvent.change(inputs[1], { target: { value: '25000' } }) // currentValueEur du premier
    fireEvent.click(screen.getByRole('button', { name: /Créer le relevé/i }))

    await waitFor(() => {
      expect(createAdminSnapshot).toHaveBeenCalled()
      expect(onSaved).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  // ── Fermeture ─────────────────────────────────────────────

  it('appelle onClose au clic sur Annuler', () => {
    const onClose = vi.fn()
    render(<ManualSnapshotModal users={USERS} snapshot={null} initialUserId={null} onClose={onClose} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).toHaveBeenCalled()
  })
})
