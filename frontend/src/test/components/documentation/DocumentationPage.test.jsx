import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DocumentationPage from '../../../components/documentation/DocumentationPage'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-markdown', () => ({
  default: ({ children }) => <div data-testid="markdown">{children}</div>,
}))
vi.mock('remark-gfm', () => ({ default: () => {} }))

// DOC_TREE simplifié pour les tests
vi.mock('../../../docs/index.js', () => ({
  DOC_TREE: [
    {
      id: 'demarrage-rapide',
      label: 'Démarrage rapide',
      load: () => Promise.resolve('# Démarrage rapide\n\nContenu du démarrage.'),
    },
    {
      id: 'patrimoine',
      label: 'Patrimoine',
      children: [
        {
          id: 'positions',
          label: 'Positions',
          load: () => Promise.resolve('# Positions\n\nGérez vos positions.'),
        },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      load: () => Promise.resolve('# Administration'),
    },
  ],
  findFirstLeaf: (tree) => tree[0],
}))

const USER      = { id: 1, firstName: 'Jean', role: 'USER' }
const ADMIN     = { id: 2, firstName: 'Admin', role: 'ADMIN' }

describe('DocumentationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  // ── Affichage général ─────────────────────────────────────

  it('affiche le titre "Documentation"', async () => {
    render(<DocumentationPage user={USER} />)
    expect(screen.getByText('Documentation')).toBeInTheDocument()
  })

  it('affiche le sous-titre', async () => {
    render(<DocumentationPage user={USER} />)
    expect(screen.getByText("Guide d'utilisation de MyFinance")).toBeInTheDocument()
  })

  // ── Sidebar desktop ───────────────────────────────────────

  it('affiche les entrées de la sidebar', async () => {
    render(<DocumentationPage user={USER} />)
    expect(screen.getAllByText('Démarrage rapide').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Patrimoine').length).toBeGreaterThan(0)
  })

  it('masque la section Administration pour un USER', async () => {
    render(<DocumentationPage user={USER} />)
    expect(screen.queryByText('Administration')).not.toBeInTheDocument()
  })

  it('affiche la section Administration pour un ADMIN', async () => {
    render(<DocumentationPage user={ADMIN} />)
    expect(screen.getAllByText('Administration').length).toBeGreaterThan(0)
  })

  // ── Chargement du contenu ─────────────────────────────────

  it('charge et affiche le contenu de la page par défaut', async () => {
    render(<DocumentationPage user={USER} />)
    await waitFor(() => {
      expect(screen.getByTestId('markdown')).toBeInTheDocument()
    })
  })

  it('charge le contenu au clic sur un nœud de la sidebar', async () => {
    render(<DocumentationPage user={USER} />)
    await waitFor(() => expect(screen.getByTestId('markdown')).toBeInTheDocument())

    // Déplier la section "Patrimoine" pour voir "Positions"
    fireEvent.click(screen.getAllByText('Patrimoine')[0])
    await waitFor(() => expect(screen.getByText('Positions')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Positions'))
    await waitFor(() => {
      expect(screen.getByTestId('markdown')).toBeInTheDocument()
    })
  })

  // ── Sélecteur mobile ──────────────────────────────────────

  it('affiche le sélecteur mobile (select)', async () => {
    render(<DocumentationPage user={USER} />)
    // Le <select> de MobilePageSelector est toujours dans le DOM
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  // ── Utilisateur null (page publique) ─────────────────────

  it('fonctionne sans utilisateur connecté', async () => {
    render(<DocumentationPage user={null} />)
    expect(screen.getByText('Documentation')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('markdown')).toBeInTheDocument())
  })
})
