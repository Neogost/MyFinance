import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginHistoryPage from '../../../components/admin/LoginHistoryPage'
import { getLoginHistory } from '../../../api/admin'

vi.mock('../../../api/admin', () => ({ getLoginHistory: vi.fn() }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePage(events, { totalElements = events.length, totalPages = 1, page = 0 } = {}) {
  return { content: events, totalElements, totalPages, number: page }
}

const EVENTS = [
  { id: 1, login: 'jean.dupont', eventType: 'SUCCESS', timestamp: '2026-04-26T10:00:00', ipAddress: '192.168.1.1', failureCount: 0, userAgent: 'Mozilla/5.0' },
  { id: 2, login: 'marie.martin', eventType: 'FAILURE', timestamp: '2026-04-25T09:00:00', ipAddress: '192.168.1.2', failureCount: 3, userAgent: 'Chrome/120' },
  { id: 3, login: 'hacker',       eventType: 'BLOCKED', timestamp: '2026-04-24T08:00:00', ipAddress: '10.0.0.1',   failureCount: 5, userAgent: null },
]

describe('LoginHistoryPage', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Chargement ────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getLoginHistory.mockReturnValue(new Promise(() => {}))
    render(<LoginHistoryPage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche l\'erreur si le chargement échoue', async () => {
    getLoginHistory.mockRejectedValue(new Error('Network error'))
    render(<LoginHistoryPage />)
    await waitFor(() => {
      expect(screen.getByText("Impossible de charger l'historique.")).toBeInTheDocument()
    })
  })

  it('affiche "Aucun événement" si la liste est vide', async () => {
    getLoginHistory.mockResolvedValue(makePage([]))
    render(<LoginHistoryPage />)
    await waitFor(() => {
      expect(screen.getByText('Aucun événement')).toBeInTheDocument()
    })
  })

  // ── Affichage ─────────────────────────────────────────────

  it('affiche le titre "Historique des connexions"', async () => {
    getLoginHistory.mockResolvedValue(makePage([]))
    render(<LoginHistoryPage />)
    expect(screen.getByText('Historique des connexions')).toBeInTheDocument()
  })

  it('affiche les événements après chargement', async () => {
    getLoginHistory.mockResolvedValue(makePage(EVENTS))
    render(<LoginHistoryPage />)
    await waitFor(() => {
      expect(screen.getByText('jean.dupont')).toBeInTheDocument()
      expect(screen.getByText('marie.martin')).toBeInTheDocument()
      expect(screen.getByText('hacker')).toBeInTheDocument()
    })
  })

  it('affiche les badges typés (Succès, Échec, Bloqué)', async () => {
    getLoginHistory.mockResolvedValue(makePage(EVENTS))
    render(<LoginHistoryPage />)
    await waitFor(() => {
      expect(screen.getByText('Succès')).toBeInTheDocument()
      expect(screen.getByText('Échec')).toBeInTheDocument()
      expect(screen.getByText('Bloqué')).toBeInTheDocument()
    })
  })

  it('affiche le nombre total d\'événements', async () => {
    getLoginHistory.mockResolvedValue(makePage(EVENTS, { totalElements: 42 }))
    render(<LoginHistoryPage />)
    await waitFor(() => {
      expect(screen.getByText('42 événements')).toBeInTheDocument()
    })
  })

  // ── Filtres ───────────────────────────────────────────────

  it('affiche les champs de filtrage', async () => {
    getLoginHistory.mockResolvedValue(makePage([]))
    render(<LoginHistoryPage />)
    expect(screen.getByPlaceholderText('Rechercher…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filtrer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réinitialiser' })).toBeInTheDocument()
  })

  it('applique le filtre login et re-fetch au clic sur Filtrer', async () => {
    getLoginHistory.mockResolvedValue(makePage([]))
    render(<LoginHistoryPage />)
    await waitFor(() => expect(getLoginHistory).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByPlaceholderText('Rechercher…'), { target: { value: 'jean' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrer' }))

    await waitFor(() => {
      expect(getLoginHistory).toHaveBeenCalledTimes(2)
      expect(getLoginHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ login: 'jean', page: 0 })
      )
    })
  })

  it('réinitialise les filtres au clic sur Réinitialiser', async () => {
    getLoginHistory.mockResolvedValue(makePage([]))
    render(<LoginHistoryPage />)
    await waitFor(() => expect(getLoginHistory).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByPlaceholderText('Rechercher…'), { target: { value: 'jean' } })
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))

    await waitFor(() => expect(getLoginHistory).toHaveBeenCalledTimes(2))
    expect(screen.getByPlaceholderText('Rechercher…').value).toBe('')
  })

  // ── Pagination ────────────────────────────────────────────

  it('n\'affiche pas la pagination si une seule page', async () => {
    getLoginHistory.mockResolvedValue(makePage(EVENTS, { totalPages: 1 }))
    render(<LoginHistoryPage />)
    await waitFor(() => expect(screen.getByText('jean.dupont')).toBeInTheDocument())
    expect(screen.queryByText('← Précédent')).not.toBeInTheDocument()
  })

  it('affiche la pagination si plusieurs pages', async () => {
    getLoginHistory.mockResolvedValue(makePage(EVENTS, { totalPages: 3, totalElements: 150 }))
    render(<LoginHistoryPage />)
    await waitFor(() => {
      expect(screen.getByText('← Précédent')).toBeInTheDocument()
      expect(screen.getByText('Suivant →')).toBeInTheDocument()
      expect(screen.getByText('Page 1 / 3')).toBeInTheDocument()
    })
  })
})
