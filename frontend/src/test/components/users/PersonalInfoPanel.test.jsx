import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PersonalInfoPanel from '../../../components/profile/PersonalInfoPanel'
import { updatePersonalInfo } from '../../../api/auth'

vi.mock('../../../api/auth', () => ({ updatePersonalInfo: vi.fn() }))

const USER = {
  firstName: 'Jean', lastName: 'Dupont',
  birthDate: '1985-06-15', birthPlace: 'Paris',
  birthPostalCode: '75001', jobTitle: 'Ingénieur logiciel',
}

describe('PersonalInfoPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Affichage ─────────────────────────────────────────────

  it('affiche le titre "Informations personnelles"', () => {
    render(<PersonalInfoPanel user={USER} onUpdate={vi.fn()} />)
    expect(screen.getByText('Informations personnelles')).toBeInTheDocument()
  })

  it('pré-remplit le prénom et le nom', () => {
    render(<PersonalInfoPanel user={USER} onUpdate={vi.fn()} />)
    expect(screen.getByDisplayValue('Jean')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Dupont')).toBeInTheDocument()
  })

  it('pré-remplit le poste actuel', () => {
    render(<PersonalInfoPanel user={USER} onUpdate={vi.fn()} />)
    expect(screen.getByDisplayValue('Ingénieur logiciel')).toBeInTheDocument()
  })

  it('pré-remplit la commune et le code postal de naissance', () => {
    render(<PersonalInfoPanel user={USER} onUpdate={vi.fn()} />)
    expect(screen.getByDisplayValue('Paris')).toBeInTheDocument()
    expect(screen.getByDisplayValue('75001')).toBeInTheDocument()
  })

  // ── Validation ────────────────────────────────────────────

  it('affiche une erreur si le prénom est vide', async () => {
    render(<PersonalInfoPanel user={{ ...USER, firstName: '' }} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText('Le prénom et le nom sont obligatoires.')).toBeInTheDocument()
    })
    expect(updatePersonalInfo).not.toHaveBeenCalled()
  })

  it('affiche une erreur si le nom est vide', async () => {
    render(<PersonalInfoPanel user={{ ...USER, lastName: '' }} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText('Le prénom et le nom sont obligatoires.')).toBeInTheDocument()
    })
    expect(updatePersonalInfo).not.toHaveBeenCalled()
  })

  // ── Sauvegarde ────────────────────────────────────────────

  it('appelle updatePersonalInfo avec les bonnes données', async () => {
    updatePersonalInfo.mockResolvedValue(USER)
    render(<PersonalInfoPanel user={USER} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(updatePersonalInfo).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Jean', lastName: 'Dupont', jobTitle: 'Ingénieur logiciel' })
      )
    })
  })

  it('affiche le message de succès après sauvegarde', async () => {
    updatePersonalInfo.mockResolvedValue(USER)
    render(<PersonalInfoPanel user={USER} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText('Informations enregistrées.')).toBeInTheDocument()
    })
  })

  it('appelle onUpdate après sauvegarde réussie', async () => {
    const onUpdate = vi.fn()
    updatePersonalInfo.mockResolvedValue(USER)
    render(<PersonalInfoPanel user={USER} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(USER))
  })

  it('affiche une erreur générique si l\'API échoue', async () => {
    updatePersonalInfo.mockRejectedValue(new Error('Network error'))
    render(<PersonalInfoPanel user={USER} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText("Impossible d'enregistrer les informations.")).toBeInTheDocument()
    })
  })

  // ── Modification ──────────────────────────────────────────

  it('efface l\'erreur de validation quand l\'utilisateur saisit à nouveau', async () => {
    render(<PersonalInfoPanel user={{ ...USER, firstName: '' }} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(screen.getByText(/obligatoires/)).toBeInTheDocument())
    // Saisir un prénom → l'erreur doit être effacée lors du prochain save réussi
    fireEvent.change(document.querySelector('[name="firstName"]'), { target: { name: 'firstName', value: 'Jean' } })
    updatePersonalInfo.mockResolvedValue(USER)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(screen.getByText('Informations enregistrées.')).toBeInTheDocument())
  })
})
