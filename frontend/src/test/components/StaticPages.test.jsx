import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ContactPage from '../../components/ContactPage'
import LandingPage from '../../components/LandingPage'

vi.mock('../../assets/logo.png', () => ({ default: 'logo.png' }))

// ── ContactPage ────────────────────────────────────────────────────────────────

describe('ContactPage', () => {
  it('affiche le titre "À propos"', () => {
    render(<ContactPage onLogin={vi.fn()} onHome={vi.fn()} />)
    expect(screen.getByText('À propos')).toBeInTheDocument()
  })

  it('affiche le bouton "Connexion"', () => {
    render(<ContactPage onLogin={vi.fn()} onHome={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Connexion' })).toBeInTheDocument()
  })

  it('appelle onLogin au clic sur "Connexion"', () => {
    const onLogin = vi.fn()
    render(<ContactPage onLogin={onLogin} onHome={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Connexion' }))
    expect(onLogin).toHaveBeenCalledTimes(1)
  })

  it('appelle onHome au clic sur le logo', () => {
    const onHome = vi.fn()
    render(<ContactPage onLogin={vi.fn()} onHome={onHome} />)
    // Le logo est un bouton contenant une <img> — on cherche via l'image puis le bouton parent
    const logoImg = screen.getByAltText('MyFinance')
    fireEvent.click(logoImg.closest('button'))
    expect(onHome).toHaveBeenCalledTimes(1)
  })

  it('affiche le lien email de contact', () => {
    render(<ContactPage onLogin={vi.fn()} onHome={vi.fn()} />)
    expect(screen.getByText(/kevin\.desmay/)).toBeInTheDocument()
  })

  it('affiche les liens LinkedIn et GitHub', () => {
    render(<ContactPage onLogin={vi.fn()} onHome={vi.fn()} />)
    expect(screen.getByText('LinkedIn')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })
})

// ── LandingPage ────────────────────────────────────────────────────────────────

describe('LandingPage', () => {
  const props = {
    onLogin:         vi.fn(),
    onRegister:      vi.fn(),
    onDocumentation: vi.fn(),
    onContact:       vi.fn(),
  }

  it('affiche le titre principal', () => {
    render(<LandingPage {...props} />)
    expect(screen.getByText(/Prenez le contrôle/)).toBeInTheDocument()
  })

  it('affiche le bouton "Se connecter"', () => {
    render(<LandingPage {...props} />)
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  })

  it('appelle onLogin au clic sur "Se connecter"', () => {
    const onLogin = vi.fn()
    render(<LandingPage {...props} onLogin={onLogin} />)
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(onLogin).toHaveBeenCalledTimes(1)
  })

  it('appelle onRegister au clic sur "Créer un compte"', () => {
    const onRegister = vi.fn()
    render(<LandingPage {...props} onRegister={onRegister} />)
    fireEvent.click(screen.getAllByRole('button', { name: /Créer (un|mon) compte/ })[0])
    expect(onRegister).toHaveBeenCalled()
  })

  it('appelle onContact au clic sur "Contact"', () => {
    const onContact = vi.fn()
    render(<LandingPage {...props} onContact={onContact} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Contact' })[0])
    expect(onContact).toHaveBeenCalledTimes(1)
  })

  it('affiche les 6 fonctionnalités', () => {
    render(<LandingPage {...props} />)
    expect(screen.getByText('Patrimoine')).toBeInTheDocument()
    expect(screen.getByText('Revenus')).toBeInTheDocument()
    expect(screen.getByText('Dépenses')).toBeInTheDocument()
    expect(screen.getByText('Dettes')).toBeInTheDocument()
    expect(screen.getByText('Impôts')).toBeInTheDocument()
    expect(screen.getByText('Simulateurs')).toBeInTheDocument()
  })

  it('affiche le bandeau vie privée', () => {
    render(<LandingPage {...props} />)
    expect(screen.getByText(/Vos données vous appartiennent/)).toBeInTheDocument()
  })
})
