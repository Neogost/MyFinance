import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UserList from '../../../components/users/UserList'
import UserForm from '../../../components/users/UserForm'
import { getUsers, createUser, updateUser, deleteUser } from '../../../api/users'

vi.mock('../../../api/users', () => ({
  getUsers:    vi.fn(),
  createUser:  vi.fn(),
  updateUser:  vi.fn(),
  deleteUser:  vi.fn(),
}))

const USER = {
  id: 1,
  firstName: 'Jean',
  lastName: 'Dupont',
  login: 'jean.dupont',
  role: 'USER',
  birthDate: '1990-05-15',
}

// ── UserList ───────────────────────────────────────────────────────────────────

describe('UserList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch', () => {
    getUsers.mockReturnValue(new Promise(() => {}))
    render(<UserList />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getUsers.mockRejectedValue(new Error('network'))
    render(<UserList />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger les utilisateurs/)).toBeInTheDocument()
    })
  })

  it('affiche le titre et le bouton "+ Nouvel utilisateur"', async () => {
    getUsers.mockResolvedValue([])
    render(<UserList />)
    await waitFor(() => {
      expect(screen.getByText('Gestion des utilisateurs')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Nouvel utilisateur/ })).toBeInTheDocument()
    })
  })

  it('affiche le nom complet d\'un utilisateur', async () => {
    getUsers.mockResolvedValue([USER])
    render(<UserList />)
    await waitFor(() => {
      expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    })
  })

  it('ouvre le formulaire de création au clic sur "+ Nouvel utilisateur"', async () => {
    getUsers.mockResolvedValue([])
    render(<UserList />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Nouvel utilisateur/ })))
    expect(screen.getByText('Créer un utilisateur')).toBeInTheDocument()
  })

  it('ouvre la modal de suppression au clic sur "Supprimer"', async () => {
    getUsers.mockResolvedValue([USER])
    render(<UserList />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Supprimer/ })))
    expect(screen.getByText('Supprimer définitivement')).toBeInTheDocument()
  })

  it('appelle deleteUser après confirmation dans la modal', async () => {
    getUsers.mockResolvedValue([USER])
    deleteUser.mockResolvedValue()
    render(<UserList />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Supprimer/ })))
    getUsers.mockResolvedValue([])
    fireEvent.click(screen.getByText('Supprimer définitivement'))
    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith(USER.id))
  })
})

// ── UserForm ───────────────────────────────────────────────────────────────────

describe('UserForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Créer un utilisateur" en mode création', () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Créer un utilisateur')).toBeInTheDocument()
  })

  it('affiche "Modifier un utilisateur" en mode édition', () => {
    render(<UserForm userToEdit={USER} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Modifier un utilisateur')).toBeInTheDocument()
  })

  it('préfille le prénom et le nom en mode édition', () => {
    render(<UserForm userToEdit={USER} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('Jean')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Dupont')).toBeInTheDocument()
  })

  it('préfille le login en mode édition', () => {
    render(<UserForm userToEdit={USER} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('jean.dupont')).toBeInTheDocument()
  })

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<UserForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('affiche les indicateurs de complexité mot de passe lors de la saisie', () => {
    render(<UserForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    // labels sans htmlFor → on cible l'input par name
    fireEvent.change(document.querySelector('[name="password"]'), { target: { value: 'test' } })
    expect(screen.getByText('12 caractères minimum')).toBeInTheDocument()
    expect(screen.getByText('Une majuscule')).toBeInTheDocument()
  })

  it('appelle onSubmit avec les données du formulaire', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<UserForm onSubmit={onSubmit} onCancel={vi.fn()} />)
    // labels sans htmlFor → on cible les inputs par name
    fireEvent.change(document.querySelector('[name="firstName"]'), { target: { value: 'Alice' } })
    fireEvent.change(document.querySelector('[name="lastName"]'),  { target: { value: 'Martin' } })
    fireEvent.change(document.querySelector('[name="login"]'),     { target: { value: 'alice.martin' } })
    fireEvent.change(document.querySelector('[name="password"]'),  { target: { value: 'ValidPassword123!' } })
    fireEvent.submit(document.querySelector('form'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Alice', lastName: 'Martin', login: 'alice.martin',
      }))
    })
  })
})
