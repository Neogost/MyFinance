import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminFamilyGroupPage from '../../../components/admin/AdminFamilyGroupPage'
import { adminGetAllGroups, adminDissolveGroup, adminRemoveMember } from '../../../api/familyGroup'

vi.mock('../../../api/familyGroup', () => ({
  adminGetAllGroups:   vi.fn(),
  adminDissolveGroup:  vi.fn(),
  adminRemoveMember:   vi.fn(),
  getMyGroup:          vi.fn(),
  getMyGroupMembers:   vi.fn(),
  getPendingInvitations: vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const GROUPS = [
  {
    id: 1, name: 'Famille Dupont',
    createdAt: '2025-01-15T10:00:00',
    owner:   { id: 1, firstName: 'Jean',  lastName: 'Dupont', login: 'jean.dupont' },
    members: [
      { id: 1, firstName: 'Jean',  lastName: 'Dupont', login: 'jean.dupont'  },
      { id: 2, firstName: 'Marie', lastName: 'Dupont', login: 'marie.dupont' },
    ],
    invitations: [],
  },
  {
    id: 2, name: 'Famille Martin',
    createdAt: '2025-03-01T09:00:00',
    owner:   { id: 3, firstName: 'Paul', lastName: 'Martin', login: 'paul.martin' },
    members: [{ id: 3, firstName: 'Paul', lastName: 'Martin', login: 'paul.martin' }],
    invitations: [{ id: 10, status: 'PENDING', invitedUser: { firstName: 'Alice', lastName: 'Test', login: 'alice.test' } }],
  },
]

describe('AdminFamilyGroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
  })

  // ── Chargement ────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    adminGetAllGroups.mockReturnValue(new Promise(() => {}))
    render(<AdminFamilyGroupPage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche l\'erreur si le chargement échoue', async () => {
    adminGetAllGroups.mockRejectedValue(new Error('Network error'))
    render(<AdminFamilyGroupPage />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les groupes.')).toBeInTheDocument()
    })
  })

  it('affiche "Aucun groupe" si la liste est vide', async () => {
    adminGetAllGroups.mockResolvedValue([])
    render(<AdminFamilyGroupPage />)
    await waitFor(() => {
      expect(screen.getByText('Aucun groupe')).toBeInTheDocument()
    })
  })

  // ── Affichage ─────────────────────────────────────────────

  it('affiche le titre "Regroupements familiaux"', async () => {
    adminGetAllGroups.mockResolvedValue([])
    render(<AdminFamilyGroupPage />)
    await waitFor(() => expect(screen.queryByText('Chargement…')).not.toBeInTheDocument())
    expect(screen.getByText('Regroupements familiaux')).toBeInTheDocument()
  })

  it('affiche le nombre de groupes', async () => {
    adminGetAllGroups.mockResolvedValue(GROUPS)
    render(<AdminFamilyGroupPage />)
    await waitFor(() => {
      expect(screen.getByText('2 groupes')).toBeInTheDocument()
    })
  })

  it('affiche les noms de groupes', async () => {
    adminGetAllGroups.mockResolvedValue(GROUPS)
    render(<AdminFamilyGroupPage />)
    await waitFor(() => {
      expect(screen.getByText('Famille Dupont')).toBeInTheDocument()
      expect(screen.getByText('Famille Martin')).toBeInTheDocument()
    })
  })

  it('affiche l\'owner de chaque groupe', async () => {
    adminGetAllGroups.mockResolvedValue(GROUPS)
    render(<AdminFamilyGroupPage />)
    await waitFor(() => {
      expect(screen.getByText(/Owner : Jean Dupont/)).toBeInTheDocument()
    })
  })

  it('affiche le badge d\'invitation en attente', async () => {
    adminGetAllGroups.mockResolvedValue(GROUPS)
    render(<AdminFamilyGroupPage />)
    await waitFor(() => {
      expect(screen.getByText(/1 invitation en attente/)).toBeInTheDocument()
    })
  })

  // ── Expand / collapse ─────────────────────────────────────

  it('affiche les membres au clic sur l\'en-tête du groupe', async () => {
    adminGetAllGroups.mockResolvedValue(GROUPS)
    render(<AdminFamilyGroupPage />)
    await waitFor(() => expect(screen.getByText('Famille Dupont')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Famille Dupont'))
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
  })

  it('masque les membres au second clic (collapse)', async () => {
    adminGetAllGroups.mockResolvedValue(GROUPS)
    render(<AdminFamilyGroupPage />)
    await waitFor(() => expect(screen.getByText('Famille Dupont')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Famille Dupont'))
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Famille Dupont'))
    expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument()
  })

  // ── Suppression du groupe ─────────────────────────────────

  it('supprime un groupe après confirmation', async () => {
    adminDissolveGroup.mockResolvedValue()
    adminGetAllGroups.mockResolvedValue(GROUPS)
    render(<AdminFamilyGroupPage />)
    await waitFor(() => expect(screen.getByTestId(`delete-family-group-${GROUPS[0].id}`)).toBeInTheDocument())

    fireEvent.click(screen.getByTestId(`delete-family-group-${GROUPS[0].id}`))
    await waitFor(() => {
      expect(adminDissolveGroup).toHaveBeenCalledWith(GROUPS[0].id)
      expect(screen.queryByText('Famille Dupont')).not.toBeInTheDocument()
    })
  })

  it('n\'appelle pas adminDissolveGroup si confirmation refusée', async () => {
    window.confirm = vi.fn(() => false)
    adminGetAllGroups.mockResolvedValue(GROUPS)
    render(<AdminFamilyGroupPage />)
    await waitFor(() => expect(screen.getByTestId(`delete-family-group-${GROUPS[0].id}`)).toBeInTheDocument())

    fireEvent.click(screen.getByTestId(`delete-family-group-${GROUPS[0].id}`))
    expect(adminDissolveGroup).not.toHaveBeenCalled()
  })

  // ── Retrait d'un membre ───────────────────────────────────

  it('retire un membre après confirmation', async () => {
    adminRemoveMember.mockResolvedValue()
    adminGetAllGroups.mockResolvedValue(GROUPS)
    render(<AdminFamilyGroupPage />)
    await waitFor(() => expect(screen.getByText('Famille Dupont')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Famille Dupont'))
    // Retirer le premier membre (Jean Dupont, id=1) du groupe Dupont (id=1)
    fireEvent.click(screen.getByTestId(`remove-family-member-${GROUPS[0].id}-${GROUPS[0].members[0].id}`))

    await waitFor(() => {
      expect(adminRemoveMember).toHaveBeenCalledWith(GROUPS[0].id, GROUPS[0].members[0].id)
    })
  })
})
