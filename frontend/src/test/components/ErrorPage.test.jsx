import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorPage from '../../components/ErrorPage'

describe('ErrorPage', () => {
  // ── Rendu par code HTTP ───────────────────────────────────────────────────

  it('affiche le code 404', () => {
    render(<ErrorPage status={404} />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('affiche le titre correct pour 404', () => {
    render(<ErrorPage status={404} />)
    expect(screen.getByText('Ressource introuvable')).toBeInTheDocument()
  })

  it('affiche le titre correct pour 500', () => {
    render(<ErrorPage status={500} />)
    expect(screen.getByText('Erreur interne du serveur')).toBeInTheDocument()
  })

  it('affiche le titre correct pour 401', () => {
    render(<ErrorPage status={401} />)
    expect(screen.getByText('Session expirée')).toBeInTheDocument()
  })

  it('affiche le titre correct pour 403', () => {
    render(<ErrorPage status={403} />)
    expect(screen.getByText('Accès refusé')).toBeInTheDocument()
  })

  it('affiche le titre correct pour 503', () => {
    render(<ErrorPage status={503} />)
    expect(screen.getByText('Service indisponible')).toBeInTheDocument()
  })

  // ── Familles HTTP ─────────────────────────────────────────────────────────

  it('famille 4xx : data-family=4', () => {
    render(<ErrorPage status={403} />)
    expect(screen.getByTestId('error-page')).toHaveAttribute('data-family', '4')
  })

  it('famille 5xx : data-family=5', () => {
    render(<ErrorPage status={500} />)
    expect(screen.getByTestId('error-page')).toHaveAttribute('data-family', '5')
  })

  it('famille 3xx : data-family=3', () => {
    render(<ErrorPage status={301} />)
    expect(screen.getByTestId('error-page')).toHaveAttribute('data-family', '3')
  })

  // ── Message personnalisé ──────────────────────────────────────────────────

  it('affiche un message personnalisé à la place de la description par défaut', () => {
    render(<ErrorPage status={500} message="Message spécifique de l'application." />)
    expect(screen.getByText("Message spécifique de l'application.")).toBeInTheDocument()
  })

  // ── Boutons d'action ──────────────────────────────────────────────────────

  it("n'affiche pas les boutons si onRetry et onHome sont absents", () => {
    render(<ErrorPage status={404} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('affiche le bouton "Réessayer" si onRetry est fourni', () => {
    render(<ErrorPage status={500} onRetry={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('affiche le bouton "Tableau de bord" si onHome est fourni', () => {
    render(<ErrorPage status={404} onHome={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tableau de bord' })).toBeInTheDocument()
  })

  it('appelle onRetry au clic', () => {
    const onRetry = vi.fn()
    render(<ErrorPage status={500} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('appelle onHome au clic', () => {
    const onHome = vi.fn()
    render(<ErrorPage status={404} onHome={onHome} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tableau de bord' }))
    expect(onHome).toHaveBeenCalledTimes(1)
  })

  it('affiche les deux boutons quand onRetry ET onHome sont fournis', () => {
    render(<ErrorPage status={500} onRetry={vi.fn()} onHome={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tableau de bord' })).toBeInTheDocument()
  })

  // ── Mode fullPage ─────────────────────────────────────────────────────────

  it('occupe tout l\'écran si fullPage=true', () => {
    render(<ErrorPage status={500} fullPage />)
    expect(screen.getByTestId('error-page-fullpage')).toBeInTheDocument()
  })

  it("n'ajoute pas le wrapper fullPage si fullPage=false (défaut)", () => {
    render(<ErrorPage status={500} />)
    expect(screen.queryByTestId('error-page-fullpage')).not.toBeInTheDocument()
  })
})
