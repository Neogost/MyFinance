import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginForm from '../../components/LoginForm'
import { login } from '../../api/auth'

vi.mock('../../api/auth', () => ({ login: vi.fn() }))

vi.mock('../../components/RegistrationForm', () => ({
  default: ({ onBack }) => (
    <div data-testid="registration-form">
      <button onClick={onBack}>Retour</button>
    </div>
  ),
}))

describe('LoginForm', () => {
  const onSuccess = vi.fn()
  const onBackToHome = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendu ─────────────────────────────────────────────────────────────────

  it('affiche le titre "MyFinance"', () => {
    render(<LoginForm onSuccess={onSuccess} />)
    expect(screen.getByText('MyFinance')).toBeInTheDocument()
  })

  it('affiche les champs Identifiant et Mot de passe', () => {
    render(<LoginForm onSuccess={onSuccess} />)
    expect(screen.getByLabelText('Identifiant')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
  })

  it('affiche le bouton "Se connecter"', () => {
    render(<LoginForm onSuccess={onSuccess} />)
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  })

  it('affiche le lien "Faire une demande"', () => {
    render(<LoginForm onSuccess={onSuccess} />)
    expect(screen.getByText('Faire une demande')).toBeInTheDocument()
  })

  it('affiche le bouton "← Retour à l\'accueil" si onBackToHome est fourni', () => {
    render(<LoginForm onSuccess={onSuccess} onBackToHome={onBackToHome} />)
    expect(screen.getByText(/Retour à l'accueil/)).toBeInTheDocument()
  })

  it("n'affiche pas le bouton retour si onBackToHome est absent", () => {
    render(<LoginForm onSuccess={onSuccess} />)
    expect(screen.queryByText(/Retour à l'accueil/)).not.toBeInTheDocument()
  })

  // ── Connexion réussie ─────────────────────────────────────────────────────

  it('appelle login avec les identifiants saisis', async () => {
    const user = { id: 1, role: 'USER' }
    login.mockResolvedValue(user)

    render(<LoginForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText('Identifiant'), { target: { value: 'jean.dupont' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'MonMdp1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('jean.dupont', 'MonMdp1')
      expect(onSuccess).toHaveBeenCalledWith(user)
    })
  })

  it('affiche "Connexion…" pendant le chargement', async () => {
    login.mockReturnValue(new Promise(() => {}))

    render(<LoginForm onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText('Identifiant'), { target: { value: 'user' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(screen.getByText('Connexion…')).toBeInTheDocument()
  })

  // ── Identifiants incorrects ───────────────────────────────────────────────

  it('affiche "Identifiants incorrects" sur une erreur 401', async () => {
    login.mockRejectedValue({ response: { status: 401 } })

    render(<LoginForm onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText('Identifiant'), { target: { value: 'user' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(screen.getByText('Identifiants incorrects')).toBeInTheDocument()
    })
  })

  // ── Brute-force lockout ───────────────────────────────────────────────────

  it('désactive le formulaire et affiche le compte à rebours sur erreur 429', async () => {
    login.mockRejectedValue({
      response: {
        status: 429,
        data: { secondesRestantes: 300, message: 'Trop de tentatives.' },
      },
    })

    render(<LoginForm onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText('Identifiant'), { target: { value: 'user' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(screen.getByText('Trop de tentatives.')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Identifiant')).toBeDisabled()
    expect(screen.getByLabelText('Mot de passe')).toBeDisabled()
  })

  it('affiche "Bloqué (…)" sur le bouton quand le compte est verrouillé', async () => {
    login.mockRejectedValue({
      response: {
        status: 429,
        data: { secondesRestantes: 60 },
      },
    })

    render(<LoginForm onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText('Identifiant'), { target: { value: 'user' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bloqué/ })).toBeInTheDocument()
    })
  })

  // ── Navigation ────────────────────────────────────────────────────────────

  it('affiche le formulaire d\'inscription au clic sur "Faire une demande"', () => {
    render(<LoginForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('Faire une demande'))
    expect(screen.getByTestId('registration-form')).toBeInTheDocument()
  })

  it('revient au formulaire de connexion depuis l\'inscription', () => {
    render(<LoginForm onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('Faire une demande'))
    expect(screen.getByTestId('registration-form')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Retour'))
    expect(screen.queryByTestId('registration-form')).not.toBeInTheDocument()
    expect(screen.getByText('MyFinance')).toBeInTheDocument()
  })

  it('affiche directement le formulaire d\'inscription si initialShowRegister=true', () => {
    render(<LoginForm onSuccess={onSuccess} initialShowRegister={true} />)
    expect(screen.getByTestId('registration-form')).toBeInTheDocument()
  })

  it('appelle onBackToHome au clic sur "← Retour à l\'accueil"', () => {
    render(<LoginForm onSuccess={onSuccess} onBackToHome={onBackToHome} />)
    fireEvent.click(screen.getByText(/Retour à l'accueil/))
    expect(onBackToHome).toHaveBeenCalledTimes(1)
  })
})
