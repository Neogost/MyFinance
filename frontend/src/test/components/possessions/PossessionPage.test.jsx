import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PossessionPage from '../../../components/possessions/PossessionPage'
import {
  getPossessions,
  getPossessionsSummary,
  createPossession,
  updatePossession,
  deletePossession,
} from '../../../api/possessions'

// ── Mocks API ─────────────────────────────────────────────────────────────────

vi.mock('../../../api/possessions', () => ({
  getPossessions: vi.fn(),
  getPossessionsSummary: vi.fn(),
  createPossession: vi.fn(),
  updatePossession: vi.fn(),
  deletePossession: vi.fn(),
}))

// PossessionForm simplifié pour isoler les tests de la page
vi.mock('../../../components/possessions/PossessionForm', () => ({
  default: ({ possession, onSubmit, onCancel }) => (
    <div data-testid="possession-form">
      <span data-testid="form-mode">{possession?.id ? 'edit' : 'create'}</span>
      <button
        data-testid="form-submit"
        onClick={() => onSubmit({
          category: 'VEHICULE',
          label: 'Ma voiture test',
          purchasePrice: 15000,
          purchaseDate: '2020-01-15',
        })}
      >
        Soumettre
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>Annuler</button>
    </div>
  ),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SUMMARY = {
  totalPurchasePrice: 20000,
  totalEffectiveValue: 14000,
  totalDepreciation: 6000,
  globalDepreciationRate: 30,
  byCategory: [],
}

const POSSESSIONS = [
  {
    id: 1,
    category: 'VEHICULE',
    label: 'Toyota Yaris',
    purchasePrice: 15000,
    purchaseDate: '2020-03-10',
    estimatedCurrentValue: null,
    // Champs calculés par PossessionDto (retournés par l'API, attendus par le composant)
    effectiveCurrentValue: 9000,
    isManualOverride: false,
    cumulatedDepreciation: 6000,
    depreciationRate: 40,
    yearsOwned: 5.1,
  },
  {
    id: 2,
    category: 'INFORMATIQUE',
    label: 'MacBook Pro',
    purchasePrice: 2500,
    purchaseDate: '2022-09-01',
    estimatedCurrentValue: null,
    effectiveCurrentValue: 1500,
    isManualOverride: false,
    cumulatedDepreciation: 1000,
    depreciationRate: 40,
    yearsOwned: 2.6,
  },
]

function mockFetchAll(possessions = POSSESSIONS, summary = SUMMARY) {
  getPossessions.mockResolvedValue(possessions)
  getPossessionsSummary.mockResolvedValue(summary)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PossessionPage — pattern CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
  })

  // ── États de chargement ───────────────────────────────────────────────────

  it('affiche "Chargement…" pendant le fetch initial', () => {
    getPossessions.mockReturnValue(new Promise(() => {}))
    getPossessionsSummary.mockReturnValue(new Promise(() => {}))
    render(<PossessionPage />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche les possessions après chargement', async () => {
    mockFetchAll()
    render(<PossessionPage />)
    await waitFor(() => {
      expect(screen.getByText('Toyota Yaris')).toBeInTheDocument()
      expect(screen.getByText('MacBook Pro')).toBeInTheDocument()
    })
  })

  it("affiche le message d'erreur si l'API échoue", async () => {
    getPossessions.mockRejectedValue(new Error('Network error'))
    getPossessionsSummary.mockRejectedValue(new Error('Network error'))
    render(<PossessionPage />)
    await waitFor(() => {
      expect(screen.getByText('Impossible de charger les possessions.')).toBeInTheDocument()
    })
  })

  it('affiche "Aucune possession enregistrée" quand la liste est vide', async () => {
    mockFetchAll([])
    render(<PossessionPage />)
    await waitFor(() => {
      expect(screen.getByText('Aucune possession enregistrée')).toBeInTheDocument()
    })
  })

  // ── Ouverture / fermeture du formulaire ───────────────────────────────────

  it('ouvre le formulaire de création au clic sur "+ Ajouter"', async () => {
    mockFetchAll([])
    render(<PossessionPage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))

    expect(screen.getByTestId('possession-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('create')
  })

  it('ouvre le formulaire d\'édition au clic sur "Modifier"', async () => {
    mockFetchAll()
    render(<PossessionPage />)
    await waitFor(() => expect(screen.getAllByText('Modifier')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Modifier')[0])

    expect(screen.getByTestId('possession-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-mode')).toHaveTextContent('edit')
  })

  it('ferme le formulaire au clic sur Annuler', async () => {
    mockFetchAll([])
    render(<PossessionPage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))
    expect(screen.getByTestId('possession-form')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('form-cancel'))
    expect(screen.queryByTestId('possession-form')).not.toBeInTheDocument()
  })

  // ── Création ──────────────────────────────────────────────────────────────

  it('appelle createPossession puis refetch la liste', async () => {
    // Premier fetch : liste vide
    mockFetchAll([])
    // Après création : liste avec le nouveau bien
    const newPossession = { id: 10, category: 'VEHICULE', label: 'Ma voiture test', purchasePrice: 15000, purchaseDate: '2020-01-15', effectiveCurrentValue: 12000, yearsOwned: 4.0, cumulatedDepreciation: 3000, depreciationRate: 20, isManualOverride: false }
    createPossession.mockResolvedValue(newPossession)

    render(<PossessionPage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    // Préparer le refetch pour retourner la nouvelle possession
    getPossessions.mockResolvedValue([newPossession])

    fireEvent.click(screen.getByText('+ Ajouter'))
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(createPossession).toHaveBeenCalledWith({
        category: 'VEHICULE',
        label: 'Ma voiture test',
        purchasePrice: 15000,
        purchaseDate: '2020-01-15',
      })
      // Vérifie que fetchAll est rappelé (getPossessions appelé 2 fois)
      expect(getPossessions).toHaveBeenCalledTimes(2)
    })
  })

  it('ferme le formulaire après création réussie', async () => {
    mockFetchAll([])
    createPossession.mockResolvedValue({ id: 10, category: 'VEHICULE', label: 'Ma voiture test', purchasePrice: 15000, purchaseDate: '2020-01-15', effectiveCurrentValue: 12000, yearsOwned: 4.0, cumulatedDepreciation: 3000, depreciationRate: 20, isManualOverride: false })
    getPossessions.mockResolvedValue([])

    render(<PossessionPage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(screen.queryByTestId('possession-form')).not.toBeInTheDocument()
    })
  })

  // ── Modification ──────────────────────────────────────────────────────────

  it('appelle updatePossession puis refetch la liste', async () => {
    mockFetchAll()
    updatePossession.mockResolvedValue({ ...POSSESSIONS[0], label: 'Ma voiture test' })
    getPossessions.mockResolvedValue(POSSESSIONS)

    render(<PossessionPage />)
    await waitFor(() => expect(screen.getAllByText('Modifier')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Modifier')[0])
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(updatePossession).toHaveBeenCalledWith(POSSESSIONS[0].id, expect.any(Object))
      expect(getPossessions).toHaveBeenCalledTimes(2)
    })
  })

  // ── Suppression ───────────────────────────────────────────────────────────

  it('supprime une possession après confirmation dans la modale', async () => {
    mockFetchAll()
    deletePossession.mockResolvedValue()

    getPossessions.mockResolvedValueOnce(POSSESSIONS)
      .mockResolvedValue(POSSESSIONS.slice(1))
    getPossessionsSummary.mockResolvedValue(SUMMARY)

    render(<PossessionPage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Supprimer')[0])
    expect(screen.getByText('Supprimer définitivement')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Supprimer définitivement'))

    await waitFor(() => {
      expect(deletePossession).toHaveBeenCalledWith(POSSESSIONS[0].id)
      expect(getPossessions).toHaveBeenCalledTimes(2)
    })
  })

  it("n'appelle pas deletePossession si l'utilisateur annule la modale", async () => {
    mockFetchAll()

    render(<PossessionPage />)
    await waitFor(() => expect(screen.getAllByText('Supprimer')[0]).toBeInTheDocument())

    fireEvent.click(screen.getAllByText('Supprimer')[0])
    expect(screen.getByText('Supprimer définitivement')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(deletePossession).not.toHaveBeenCalled()
    expect(screen.queryByText('Supprimer définitivement')).not.toBeInTheDocument()
  })

  // ── Différence vs OtherIncomePage : pas d'optimistic update ──────────────

  it('refetch TOUJOURS après mutation (pas d\'optimistic update)', async () => {
    mockFetchAll()
    createPossession.mockResolvedValue({ id: 10, category: 'VEHICULE', label: 'Ma voiture test', purchasePrice: 15000, purchaseDate: '2020-01-15' })
    getPossessions.mockResolvedValue(POSSESSIONS)

    render(<PossessionPage />)
    await waitFor(() => expect(screen.getByText('+ Ajouter')).toBeInTheDocument())

    fireEvent.click(screen.getByText('+ Ajouter'))
    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      // getPossessions appelé 2 fois : montage + après création
      expect(getPossessions.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it("appelle getPossessions et getPossessionsSummary au montage", async () => {
    mockFetchAll()
    render(<PossessionPage />)
    await waitFor(() => {
      expect(getPossessions).toHaveBeenCalledTimes(1)
      expect(getPossessionsSummary).toHaveBeenCalledTimes(1)
    })
  })
})
