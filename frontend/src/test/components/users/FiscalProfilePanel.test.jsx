import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FiscalProfilePanel from '../../../components/profile/FiscalProfilePanel'
import { updateFiscalProfile, getBaremeKilometrique } from '../../../api/auth'
import { getSalaryContracts } from '../../../api/income'

vi.mock('../../../api/auth', () => ({
  updateFiscalProfile:   vi.fn(),
  getBaremeKilometrique: vi.fn(),
}))
vi.mock('../../../api/income', () => ({ getSalaryContracts: vi.fn() }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_FLAT = {
  id: 1,
  fiscalParts: 1.5,
  useFlatRateDeduction: true,
}

const USER_REAL = {
  id: 1,
  fiscalParts: 1.0,
  useFlatRateDeduction: false,
  realExpensesTransportKm: 8000,
  realExpensesTransportCv: 5,
}

describe('FiscalProfilePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSalaryContracts.mockResolvedValue([])
    getBaremeKilometrique.mockResolvedValue([])
  })

  // ── Affichage général ─────────────────────────────────────

  it('affiche le titre "Profil fiscal"', () => {
    render(<FiscalProfilePanel user={USER_FLAT} onUpdate={vi.fn()} />)
    expect(screen.getByText('Profil fiscal')).toBeInTheDocument()
  })

  it('pré-remplit les parts fiscales', () => {
    render(<FiscalProfilePanel user={USER_FLAT} onUpdate={vi.fn()} />)
    const input = screen.getByDisplayValue('1.5')
    expect(input).toBeInTheDocument()
  })

  it('sélectionne "Abattement forfaitaire 10 %" par défaut si useFlatRateDeduction=true', () => {
    render(<FiscalProfilePanel user={USER_FLAT} onUpdate={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    // Premier radio = forfaitaire (true), second = frais réels (false)
    expect(radios[0]).toBeChecked()
  })

  it('sélectionne "Frais réels" si useFlatRateDeduction=false', () => {
    render(<FiscalProfilePanel user={USER_REAL} onUpdate={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    expect(radios[1]).toBeChecked()
  })

  // ── Bascule vers frais réels ──────────────────────────────

  it('affiche le formulaire frais réels au clic sur "Frais réels"', async () => {
    render(<FiscalProfilePanel user={USER_FLAT} onUpdate={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1])
    await waitFor(() => {
      // Le formulaire de frais réels doit apparaître
      expect(screen.getByText(/Transport domicile/i)).toBeInTheDocument()
    })
  })

  it('charge le barème kilométrique au passage en frais réels', async () => {
    getBaremeKilometrique.mockResolvedValue([{ cv: 5, km1: 100, rate1: 0.636 }])
    render(<FiscalProfilePanel user={USER_FLAT} onUpdate={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1])
    await waitFor(() => {
      expect(getBaremeKilometrique).toHaveBeenCalled()
    })
  })

  // ── Sauvegarde ────────────────────────────────────────────

  it('appelle updateFiscalProfile avec les bons paramètres', async () => {
    updateFiscalProfile.mockResolvedValue({ ...USER_FLAT })
    render(<FiscalProfilePanel user={USER_FLAT} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(updateFiscalProfile).toHaveBeenCalledWith(
        expect.objectContaining({ fiscalParts: 1.5, useFlatRateDeduction: true })
      )
    })
  })

  it('affiche le message de succès après sauvegarde', async () => {
    updateFiscalProfile.mockResolvedValue({ ...USER_FLAT })
    render(<FiscalProfilePanel user={USER_FLAT} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText('Profil fiscal enregistré.')).toBeInTheDocument()
    })
  })

  it('appelle onUpdate après sauvegarde réussie', async () => {
    const onUpdate = vi.fn()
    updateFiscalProfile.mockResolvedValue({ ...USER_FLAT })
    render(<FiscalProfilePanel user={USER_FLAT} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(USER_FLAT))
  })

  it('affiche un message d\'erreur en cas d\'échec', async () => {
    updateFiscalProfile.mockRejectedValue(new Error('Server error'))
    render(<FiscalProfilePanel user={USER_FLAT} onUpdate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => {
      expect(screen.getByText(/Impossible d'enregistrer/i)).toBeInTheDocument()
    })
  })
})
