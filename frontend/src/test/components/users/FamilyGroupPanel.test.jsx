import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FamilyGroupPanel from '../../../components/profile/FamilyGroupPanel'
import {
  getMyGroup, getPendingInvitations,
  createGroup, dissolveGroup, leaveGroup, sendInvitation,
  acceptInvitation, refuseInvitation,
} from '../../../api/familyGroup'

vi.mock('../../../api/familyGroup', () => ({
  getMyGroup:            vi.fn(),
  getPendingInvitations: vi.fn(),
  getMyGroupMembers:     vi.fn(),
  getMemberPositions:    vi.fn(),
  createGroup:           vi.fn(),
  renameGroup:           vi.fn(),
  dissolveGroup:         vi.fn(),
  leaveGroup:            vi.fn(),
  removeMember:          vi.fn(),
  sendInvitation:        vi.fn(),
  acceptInvitation:      vi.fn(),
  refuseInvitation:      vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const GROUP = {
  id: 1, name: 'Famille Dupont',
  owner: { id: 1, firstName: 'Jean', lastName: 'Dupont', login: 'jean.dupont' },
  members: [
    { id: 1, firstName: 'Jean',  lastName: 'Dupont',  login: 'jean.dupont'  },
    { id: 2, firstName: 'Marie', lastName: 'Dupont',  login: 'marie.dupont' },
  ],
  invitations: [],
}

const INVITATION = {
  id: 10, ownerFirstName: 'Paul', ownerLastName: 'Martin',
  groupName: 'Famille Martin',
}

describe('FamilyGroupPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
  })

  // ── Chargement ────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getMyGroup.mockReturnValue(new Promise(() => {}))
    getPendingInvitations.mockResolvedValue([])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche une erreur si le chargement échoue', async () => {
    getMyGroup.mockRejectedValue(new Error('Network error'))
    getPendingInvitations.mockResolvedValue([])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  // ── Titre ─────────────────────────────────────────────────

  it('affiche le titre "Regroupement familial"', async () => {
    getMyGroup.mockResolvedValue(null)
    getPendingInvitations.mockResolvedValue([])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    // Le composant fait un early return si loading=true — attendre la fin du chargement
    await waitFor(() => expect(screen.getByText('Regroupement familial')).toBeInTheDocument())
  })

  // ── Cas 1 : pas de groupe ─────────────────────────────────

  it('affiche le formulaire de création si l\'utilisateur n\'a pas de groupe', async () => {
    getMyGroup.mockResolvedValue(null)
    getPendingInvitations.mockResolvedValue([])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('ex : Famille Desmay')).toBeInTheDocument()
      expect(screen.getByText('Créer le groupe')).toBeInTheDocument()
    })
  })

  it('crée un groupe au submit du formulaire', async () => {
    createGroup.mockResolvedValue(GROUP)
    getMyGroup.mockResolvedValue(null)
    getPendingInvitations.mockResolvedValue([])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByPlaceholderText('ex : Famille Desmay')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('ex : Famille Desmay'), { target: { value: 'Famille Dupont' } })
    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => expect(createGroup).toHaveBeenCalledWith({ name: 'Famille Dupont' }))
  })

  // ── Cas 2 : membre d'un groupe ────────────────────────────

  it('affiche le nom du groupe quand l\'utilisateur est membre', async () => {
    getMyGroup.mockResolvedValue(GROUP)
    getPendingInvitations.mockResolvedValue([])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Famille Dupont')).toBeInTheDocument()
    })
  })

  it('affiche la liste des membres', async () => {
    getMyGroup.mockResolvedValue(GROUP)
    getPendingInvitations.mockResolvedValue([])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
      expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
    })
  })

  it('dissout le groupe après confirmation (owner)', async () => {
    dissolveGroup.mockResolvedValue()
    getMyGroup.mockResolvedValueOnce(GROUP).mockResolvedValue(null)
    getPendingInvitations.mockResolvedValue([])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Famille Dupont')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Dissoudre le groupe'))
    await waitFor(() => expect(dissolveGroup).toHaveBeenCalled())
  })

  it('envoie une invitation par login', async () => {
    const inv = { id: 20, login: 'bob.smith' }
    sendInvitation.mockResolvedValue(inv)
    getMyGroup.mockResolvedValue(GROUP)
    getPendingInvitations.mockResolvedValue([])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Famille Dupont')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText("Login de l'utilisateur"), { target: { value: 'bob.smith' } })
    // Chercher le formulaire d'invitation (celui qui a le champ invite)
    const inviteInput = screen.getByPlaceholderText("Login de l'utilisateur")
    fireEvent.submit(inviteInput.closest('form'))

    await waitFor(() => {
      expect(sendInvitation).toHaveBeenCalledWith({ login: 'bob.smith' })
    })
  })

  // ── Cas 3 : invitations reçues ────────────────────────────

  it('affiche les invitations reçues en attente', async () => {
    getMyGroup.mockResolvedValue(null)
    getPendingInvitations.mockResolvedValue([INVITATION])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Paul Martin/)).toBeInTheDocument()
      expect(screen.getByText('Accepter')).toBeInTheDocument()
      expect(screen.getByText('Refuser')).toBeInTheDocument()
    })
  })

  it('accepte une invitation au clic sur Accepter', async () => {
    acceptInvitation.mockResolvedValue(GROUP)
    getMyGroup
      .mockResolvedValueOnce(null)
      .mockResolvedValue(GROUP)
    getPendingInvitations.mockResolvedValue([INVITATION])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Accepter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Accepter'))
    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledWith(INVITATION.id))
  })

  it('refuse une invitation au clic sur Refuser', async () => {
    refuseInvitation.mockResolvedValue()
    getMyGroup.mockResolvedValue(null)
    getPendingInvitations.mockResolvedValue([INVITATION])
    render(<FamilyGroupPanel onGroupChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Refuser')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Refuser'))
    await waitFor(() => expect(refuseInvitation).toHaveBeenCalledWith(INVITATION.id))
  })
})
