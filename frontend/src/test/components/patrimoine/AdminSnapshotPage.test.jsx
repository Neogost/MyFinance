import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminSnapshotPage from '../../../components/patrimoine/AdminSnapshotPage'
import { getUsers } from '../../../api/users'
import { getAdminSnapshots, deleteAdminSnapshot } from '../../../api/patrimoine'

vi.mock('../../../api/users', () => ({ getUsers: vi.fn() }))
vi.mock('../../../api/patrimoine', () => ({
  getAdminSnapshots:      vi.fn(),
  deleteAdminSnapshot:    vi.fn(),
  getAdminUserPositions:  vi.fn(),
  getAdminSnapshot:       vi.fn(),
  createAdminSnapshot:    vi.fn(),
  updateAdminSnapshot:    vi.fn(),
  getPositions:           vi.fn(),
  getPatrimoineScore:     vi.fn(),
  getInstruments:         vi.fn(),
}))

vi.mock('../../../components/patrimoine/ManualSnapshotModal', () => ({
  default: ({ onClose }) => (
    <div data-testid="manual-snapshot-modal">
      <button onClick={onClose}>Annuler modal</button>
    </div>
  ),
}))

vi.mock('../../../components/patrimoine/utils', () => ({
  Amount: ({ value }) => <span>{value}</span>,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USERS = [
  { id: 1, firstName: 'Jean',  lastName: 'Dupont', login: 'jean.dupont' },
  { id: 2, firstName: 'Marie', lastName: 'Martin', login: 'marie.martin' },
]

const SNAPSHOTS = [
  { id: 10, snapshotDate: '2026-01-01', totalInvestedEur: 80000, totalCurrentValueEur: 95000, totalCapitalGainEur: 15000 },
  { id: 11, snapshotDate: '2025-07-01', totalInvestedEur: 70000, totalCurrentValueEur: 82000, totalCapitalGainEur: 12000 },
]

describe('AdminSnapshotPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
  })

  // ── Chargement des utilisateurs ───────────────────────────

  it('affiche "Chargement…" pendant le fetch des utilisateurs', () => {
    getUsers.mockReturnValue(new Promise(() => {}))
    render(<AdminSnapshotPage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche le sélecteur d\'utilisateur après chargement', async () => {
    getUsers.mockResolvedValue(USERS)
    render(<AdminSnapshotPage />)
    await waitFor(() => {
      expect(screen.getByText('Jean Dupont (jean.dupont)')).toBeInTheDocument()
      expect(screen.getByText('Marie Martin (marie.martin)')).toBeInTheDocument()
    })
  })

  it('affiche le titre de la page', async () => {
    getUsers.mockResolvedValue(USERS)
    render(<AdminSnapshotPage />)
    expect(screen.getByText('Relevés de patrimoine — Administration')).toBeInTheDocument()
  })

  // ── Chargement des relevés ────────────────────────────────

  it('charge les relevés quand un utilisateur est sélectionné', async () => {
    getUsers.mockResolvedValue(USERS)
    getAdminSnapshots.mockResolvedValue(SNAPSHOTS)
    render(<AdminSnapshotPage />)
    await waitFor(() => expect(screen.getByText('Jean Dupont (jean.dupont)')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })

    await waitFor(() => {
      expect(getAdminSnapshots).toHaveBeenCalledWith('1')
    })
  })

  it('affiche les relevés dans le tableau', async () => {
    getUsers.mockResolvedValue(USERS)
    getAdminSnapshots.mockResolvedValue(SNAPSHOTS)
    render(<AdminSnapshotPage />)
    await waitFor(() => expect(screen.getByText('Jean Dupont (jean.dupont)')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })

    await waitFor(() => {
      expect(screen.getByText(/1 janvier 2026/)).toBeInTheDocument()
      expect(screen.getByText(/1 juillet 2025/)).toBeInTheDocument()
    })
  })

  it('affiche "Aucun relevé" si l\'utilisateur n\'en a pas', async () => {
    getUsers.mockResolvedValue(USERS)
    getAdminSnapshots.mockResolvedValue([])
    render(<AdminSnapshotPage />)
    await waitFor(() => expect(screen.getByText('Jean Dupont (jean.dupont)')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })

    await waitFor(() => {
      expect(screen.getByText('Aucun relevé pour cet utilisateur.')).toBeInTheDocument()
    })
  })

  // ── Bouton Ajouter ────────────────────────────────────────

  it('désactive le bouton Ajouter si aucun utilisateur sélectionné', async () => {
    getUsers.mockResolvedValue(USERS)
    render(<AdminSnapshotPage />)
    await waitFor(() => expect(screen.getByText('Jean Dupont (jean.dupont)')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Ajouter/ })).toBeDisabled()
  })

  it('ouvre la modal au clic sur Ajouter (utilisateur sélectionné)', async () => {
    getUsers.mockResolvedValue(USERS)
    getAdminSnapshots.mockResolvedValue([])
    render(<AdminSnapshotPage />)
    await waitFor(() => expect(screen.getByText('Jean Dupont (jean.dupont)')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(getAdminSnapshots).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /Ajouter/ }))
    expect(screen.getByTestId('manual-snapshot-modal')).toBeInTheDocument()
  })

  // ── Suppression ───────────────────────────────────────────

  it('supprime un relevé après confirmation', async () => {
    deleteAdminSnapshot.mockResolvedValue()
    getUsers.mockResolvedValue(USERS)
    getAdminSnapshots.mockResolvedValue(SNAPSHOTS)
    render(<AdminSnapshotPage />)
    await waitFor(() => expect(screen.getByText('Jean Dupont (jean.dupont)')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Supprimer' })[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0])
    await waitFor(() => {
      expect(deleteAdminSnapshot).toHaveBeenCalledWith(SNAPSHOTS[0].id)
      expect(screen.queryByText(/1 janvier 2026/)).not.toBeInTheDocument()
    })
  })

  // ── Fermeture de la modal ─────────────────────────────────

  it('ferme la modal au clic sur Annuler dans la modal', async () => {
    getUsers.mockResolvedValue(USERS)
    getAdminSnapshots.mockResolvedValue([])
    render(<AdminSnapshotPage />)
    await waitFor(() => expect(screen.getByText('Jean Dupont (jean.dupont)')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(getAdminSnapshots).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /Ajouter/ }))
    expect(screen.getByTestId('manual-snapshot-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Annuler modal'))
    expect(screen.queryByTestId('manual-snapshot-modal')).not.toBeInTheDocument()
  })
})
