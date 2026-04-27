import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RegistrationForm from '../../components/RegistrationForm'
import { submitRegistration } from '../../api/registrations'

vi.mock('../../api/registrations', () => ({ submitRegistration: vi.fn() }))

describe('RegistrationForm', () => {
  const onBack = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  // ── Rendu ─────────────────────────────────────────────────────────────────

  it('affiche le titre "Créer un compte"', () => {
    render(<RegistrationForm onBack={onBack} />)
    expect(screen.getByText('Créer un compte')).toBeInTheDocument()
  })

  it('affiche les champs prénom, nom, login, mot de passe, confirmation', () => {
    render(<RegistrationForm onBack={onBack} />)
    expect(screen.getByPlaceholderText('Jean')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Dupont')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('jean.dupont')).toBeInTheDocument()
  })

  it('affiche le bouton "Envoyer la demande"', () => {
    render(<RegistrationForm onBack={onBack} />)
    expect(screen.getByRole('button', { name: 'Envoyer la demande' })).toBeInTheDocument()
  })

  it('affiche "← Retour à la connexion"', () => {
    render(<RegistrationForm onBack={onBack} />)
    expect(screen.getByText(/Retour à la connexion/)).toBeInTheDocument()
  })

  // ── Indicateur de complexité mot de passe ─────────────────────────────────

  it("n'affiche pas l'indicateur tant que le mot de passe est vide", () => {
    render(<RegistrationForm onBack={onBack} />)
    expect(screen.queryByText('12 caractères minimum')).not.toBeInTheDocument()
  })

  it('affiche les règles de mot de passe dès la première saisie', () => {
    render(<RegistrationForm onBack={onBack} />)
    const [passwordInput] = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(passwordInput, { target: { value: 'a' } })
    expect(screen.getByText('12 caractères minimum')).toBeInTheDocument()
    expect(screen.getByText('Une majuscule')).toBeInTheDocument()
    expect(screen.getByText('Un chiffre')).toBeInTheDocument()
  })

  it('valide toutes les règles avec un mot de passe fort', () => {
    render(<RegistrationForm onBack={onBack} />)
    const [passwordInput] = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(passwordInput, { target: { value: 'MonMdpRobuste123!' } })

    const checks = screen.getAllByText('✓')
    expect(checks.length).toBe(5)
  })

  // ── Validation ────────────────────────────────────────────────────────────

  it('affiche une erreur si le mot de passe ne respecte pas les règles', async () => {
    render(<RegistrationForm onBack={onBack} />)

    fireEvent.change(screen.getByPlaceholderText('jean.dupont'), { target: { value: 'test' } })
    const [passwordInput] = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(passwordInput, { target: { value: 'faible' } })

    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(screen.getByText(/règles de sécurité/)).toBeInTheDocument()
    })
    expect(submitRegistration).not.toHaveBeenCalled()
  })

  it('affiche une erreur si les mots de passe ne correspondent pas', async () => {
    render(<RegistrationForm onBack={onBack} />)

    const passwords = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(passwords[0], { target: { value: 'MonMdpRobuste123!' } })
    fireEvent.change(passwords[1], { target: { value: 'Diff1234!' } })

    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(screen.getByText(/ne correspondent pas/)).toBeInTheDocument()
    })
    expect(submitRegistration).not.toHaveBeenCalled()
  })

  // ── Soumission ────────────────────────────────────────────────────────────

  it('appelle submitRegistration avec les champs corrects', async () => {
    submitRegistration.mockResolvedValue({})
    render(<RegistrationForm onBack={onBack} />)

    fireEvent.change(screen.getByPlaceholderText('Jean'),         { target: { value: 'Jean' } })
    fireEvent.change(screen.getByPlaceholderText('Dupont'),       { target: { value: 'Dupont' } })
    fireEvent.change(screen.getByPlaceholderText('jean.dupont'),  { target: { value: 'jean.dupont' } })
    const passwords = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(passwords[0], { target: { value: 'MonMdpRobuste123!' } })
    fireEvent.change(passwords[1], { target: { value: 'MonMdpRobuste123!' } })

    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(submitRegistration).toHaveBeenCalledWith({
        login: 'jean.dupont', firstName: 'Jean', lastName: 'Dupont', password: 'MonMdpRobuste123!',
      })
    })
  })

  it('affiche la confirmation après soumission réussie', async () => {
    submitRegistration.mockResolvedValue({})
    render(<RegistrationForm onBack={onBack} />)

    const passwords = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(screen.getByPlaceholderText('Jean'),        { target: { value: 'Jean' } })
    fireEvent.change(screen.getByPlaceholderText('Dupont'),      { target: { value: 'Dupont' } })
    fireEvent.change(screen.getByPlaceholderText('jean.dupont'), { target: { value: 'j.d' } })
    fireEvent.change(passwords[0], { target: { value: 'MonMdpRobuste123!' } })
    fireEvent.change(passwords[1], { target: { value: 'MonMdpRobuste123!' } })

    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(screen.getByText('Demande envoyée')).toBeInTheDocument()
    })
  })

  it('affiche un message générique en cas d\'erreur réseau ou serveur', async () => {
    // Le backend retourne désormais 202 même en cas de doublon (anti-énumération).
    // Toute rejection correspond à une erreur technique → message générique.
    submitRegistration.mockRejectedValue({ response: { status: 500 } })
    render(<RegistrationForm onBack={onBack} />)

    const passwords = screen.getAllByPlaceholderText('••••••••')
    fireEvent.change(screen.getByPlaceholderText('Jean'),        { target: { value: 'Jean' } })
    fireEvent.change(screen.getByPlaceholderText('Dupont'),      { target: { value: 'Dupont' } })
    fireEvent.change(screen.getByPlaceholderText('jean.dupont'), { target: { value: 'jean' } })
    fireEvent.change(passwords[0], { target: { value: 'MonMdpRobuste123!' } })
    fireEvent.change(passwords[1], { target: { value: 'MonMdpRobuste123!' } })

    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(screen.getByText(/Une erreur est survenue/)).toBeInTheDocument()
    })
  })

  // ── Navigation ────────────────────────────────────────────────────────────

  it('appelle onBack au clic sur "← Retour à la connexion"', () => {
    render(<RegistrationForm onBack={onBack} />)
    fireEvent.click(screen.getByText(/Retour à la connexion/))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
