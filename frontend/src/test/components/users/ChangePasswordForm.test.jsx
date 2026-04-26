import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChangePasswordForm from '../../../components/users/ChangePasswordForm'
import { changePassword } from '../../../api/users'

vi.mock('../../../api/users', () => ({ changePassword: vi.fn() }))

// Les panels de profil ont leurs propres appels API — on les isole
vi.mock('../../../components/profile/FamilyGroupPanel',  () => ({ default: () => <div data-testid="family-panel" /> }))
vi.mock('../../../components/profile/FiscalProfilePanel', () => ({ default: () => <div data-testid="fiscal-panel" /> }))
vi.mock('../../../components/profile/PersonalInfoPanel',  () => ({ default: () => <div data-testid="personal-panel" /> }))
vi.mock('../../../components/profile/SafetyNetPanel',     () => ({ default: () => <div data-testid="safety-panel" /> }))

const USER = { login: 'jean.dupont', role: 'USER', firstName: 'Jean', lastName: 'Dupont' }

// Les labels n'ont pas d'attribut htmlFor — on cible par name
function fill(currentPassword, newPassword, confirm) {
  fireEvent.change(document.querySelector('[name="currentPassword"]'), { target: { name: 'currentPassword', value: currentPassword } })
  fireEvent.change(document.querySelector('[name="newPassword"]'),     { target: { name: 'newPassword',     value: newPassword } })
  fireEvent.change(document.querySelector('[name="confirm"]'),         { target: { name: 'confirm',         value: confirm } })
}

describe('ChangePasswordForm', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Affichage ──────────────────────────────────────────────

  it('affiche le login et le rôle de l\'utilisateur', () => {
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    expect(screen.getByText('jean.dupont')).toBeInTheDocument()
    expect(screen.getByText('USER')).toBeInTheDocument()
  })

  it('affiche les panels de profil', () => {
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    expect(screen.getByTestId('family-panel')).toBeInTheDocument()
    expect(screen.getByTestId('fiscal-panel')).toBeInTheDocument()
    expect(screen.getByTestId('personal-panel')).toBeInTheDocument()
    expect(screen.getByTestId('safety-panel')).toBeInTheDocument()
  })

  // ── Indicateurs de sécurité ───────────────────────────────

  it('affiche les indicateurs de règles en saisissant un mot de passe', () => {
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    fireEvent.change(document.querySelector('[name="newPassword"]'), { target: { name: 'newPassword', value: 'ab' } })
    expect(screen.getByText('8 caractères minimum')).toBeInTheDocument()
    expect(screen.getByText('Une majuscule')).toBeInTheDocument()
  })

  it('coche les règles respectées', () => {
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    fireEvent.change(document.querySelector('[name="newPassword"]'), { target: { name: 'newPassword', value: 'Abcdefg1' } })
    const items = screen.getAllByRole('listitem')
    // Toutes les 4 règles doivent être cochées (✓)
    expect(items.filter(li => li.textContent.includes('✓'))).toHaveLength(4)
  })

  // ── Validations front ─────────────────────────────────────

  it('affiche une erreur si le nouveau mot de passe ne respecte pas les règles', async () => {
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    fill('ancienMdp', 'faible', 'faible')
    fireEvent.submit(screen.getByRole('button', { name: /Changer le mot de passe/i }).closest('form'))
    await waitFor(() => {
      expect(screen.getByText(/ne respecte pas les règles/i)).toBeInTheDocument()
    })
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('affiche une erreur si les mots de passe ne correspondent pas', async () => {
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    fill('ancienMdp', 'NewPass1', 'NewPass2')
    fireEvent.submit(screen.getByRole('button', { name: /Changer le mot de passe/i }).closest('form'))
    await waitFor(() => {
      expect(screen.getByText(/ne correspondent pas/i)).toBeInTheDocument()
    })
    expect(changePassword).not.toHaveBeenCalled()
  })

  // ── Soumission ────────────────────────────────────────────

  it('appelle changePassword avec les bons paramètres', async () => {
    changePassword.mockResolvedValue()
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    fill('ancienMdp', 'NewPass1', 'NewPass1')
    fireEvent.submit(screen.getByRole('button', { name: /Changer le mot de passe/i }).closest('form'))
    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({ currentPassword: 'ancienMdp', newPassword: 'NewPass1' })
    })
  })

  it('affiche le message de succès après changement réussi', async () => {
    changePassword.mockResolvedValue()
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    fill('ancienMdp', 'NewPass1', 'NewPass1')
    fireEvent.submit(screen.getByRole('button', { name: /Changer le mot de passe/i }).closest('form'))
    await waitFor(() => {
      expect(screen.getByText(/Mot de passe modifié avec succès/i)).toBeInTheDocument()
    })
  })

  it('vide les champs après changement réussi', async () => {
    changePassword.mockResolvedValue()
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    fill('ancienMdp', 'NewPass1', 'NewPass1')
    fireEvent.submit(screen.getByRole('button', { name: /Changer le mot de passe/i }).closest('form'))
    await waitFor(() => expect(screen.getByText(/succès/i)).toBeInTheDocument())
    expect(document.querySelector('[name="currentPassword"]').value).toBe('')
  })

  it('affiche "Mot de passe actuel incorrect" sur erreur 401', async () => {
    changePassword.mockRejectedValue({ response: { status: 401 } })
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    fill('mauvaisMdp', 'NewPass1', 'NewPass1')
    fireEvent.submit(screen.getByRole('button', { name: /Changer le mot de passe/i }).closest('form'))
    await waitFor(() => {
      expect(screen.getByText('Mot de passe actuel incorrect.')).toBeInTheDocument()
    })
  })

  it('affiche une erreur générique sur erreur non-401', async () => {
    changePassword.mockRejectedValue({ response: { status: 500 } })
    render(<ChangePasswordForm user={USER} onGroupChange={vi.fn()} onUserUpdate={vi.fn()} />)
    fill('ancienMdp', 'NewPass1', 'NewPass1')
    fireEvent.submit(screen.getByRole('button', { name: /Changer le mot de passe/i }).closest('form'))
    await waitFor(() => {
      expect(screen.getByText('Une erreur est survenue.')).toBeInTheDocument()
    })
  })
})
