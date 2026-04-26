import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../../components/ErrorBoundary'

// Composant enfant qui lève une erreur quand throw=true
function BombComponent({ shouldThrow }) {
  if (shouldThrow) throw new Error('Erreur de test dans le rendu')
  return <div data-testid="child-ok">Enfant sans erreur</div>
}

// Supprime les console.error de React pour les tests ErrorBoundary
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})
afterEach(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  it('affiche les enfants quand aucune erreur ne se produit', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child-ok">Contenu normal</div>
      </ErrorBoundary>
    )
    expect(screen.getByTestId('child-ok')).toBeInTheDocument()
  })

  it('capture une erreur JS et affiche la page d\'erreur 500', () => {
    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.queryByTestId('child-ok')).not.toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('affiche le message de l\'erreur dans la page d\'erreur', () => {
    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText(/Erreur de test dans le rendu/)).toBeInTheDocument()
  })

  it('affiche le bouton "Réessayer" après une erreur', () => {
    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('réinitialise l\'état au clic sur "Réessayer"', () => {
    let shouldThrow = true
    function DynamicBomb() {
      if (shouldThrow) throw new Error('Erreur de test dans le rendu')
      return <div data-testid="child-ok">Récupéré</div>
    }

    render(
      <ErrorBoundary>
        <DynamicBomb />
      </ErrorBoundary>
    )

    expect(screen.getByText('500')).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(screen.getByTestId('child-ok')).toBeInTheDocument()
  })

  it('passe en mode fullPage pour l\'ErrorPage', () => {
    const { container } = render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    // fullPage=true ajoute min-h-screen sur le wrapper
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument()
  })
})
