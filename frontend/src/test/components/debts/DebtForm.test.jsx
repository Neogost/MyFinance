import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DebtForm from '../../../components/debts/DebtForm'
import { getPositions } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getPositions: vi.fn(),
  getInstruments: vi.fn(),
}))

const IMMO_POSITIONS = [
  { id: 10, label: 'Appartement Lyon', category: 'IMMO_PHYSIQUE', estimatedCurrentValue: 280000 },
  { id: 11, label: 'Maison Bordeaux',  category: 'IMMO_PHYSIQUE', estimatedCurrentValue: 450000 },
]

describe('DebtForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPositions.mockResolvedValue(IMMO_POSITIONS)
  })

  // ── Rendu initial ────────────────────────────────────────────────────────

  it('affiche "Ajouter une dette" pour une création', () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Ajouter une dette')).toBeInTheDocument()
  })

  it('affiche "Modifier la dette" en mode édition', () => {
    const debt = {
      id: 1, type: 'IMMOBILIER', label: 'Crédit appart', initialCapital: 200000,
      annualRate: 0.035, monthlyPayment: 950, lender: 'BNP', currency: 'EUR',
    }
    render(<DebtForm debt={debt} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Modifier la dette')).toBeInTheDocument()
  })

  it('préfille le formulaire avec les données de la dette en édition', () => {
    const debt = {
      id: 1, type: 'ETUDIANT', label: 'Prêt étudiant', lender: 'Cetelem',
      initialCapital: 12000, annualRate: 0.025, monthlyPayment: 200, currency: 'EUR',
    }
    render(<DebtForm debt={debt} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('ETUDIANT')
    expect(screen.getByDisplayValue('Cetelem')).toBeInTheDocument()
    // getByDisplayValue('Prêt étudiant') trouve aussi le <select> → cibler l'input label
    const allWithLabel = screen.getAllByDisplayValue('Prêt étudiant')
    const labelInput = allWithLabel.find(el => el.tagName === 'INPUT')
    expect(labelInput).toBeInTheDocument()
  })

  it('type par défaut est IMMOBILIER pour une nouvelle dette', () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('IMMOBILIER')
  })

  // ── Champs obligatoires ───────────────────────────────────────────────────

  it('affiche le champ "Capital initial (€)"', () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    // Les labels n'ont pas d'attribut htmlFor — cibler par placeholder
    expect(screen.getByPlaceholderText(/200000/)).toBeInTheDocument()
    expect(screen.getByText(/Capital initial/)).toBeInTheDocument()
  })

  it('affiche le champ "Libellé"', () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Crédit BNP/)).toBeInTheDocument()
  })

  // ── Fetch positions IMMO ─────────────────────────────────────────────────

  it('charge les positions IMMO_PHYSIQUE au montage (pour type IMMOBILIER)', async () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() => {
      expect(getPositions).toHaveBeenCalledWith({ category: 'IMMO_PHYSIQUE', status: 'ACTIVE' })
    })
  })

  it('affiche le champ de lien immobilier pour le type IMMOBILIER', async () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Lier la dette à un bien immobilier/)).toBeInTheDocument()
    })
  })

  it("n'affiche pas le lien immobilier pour un type non-IMMOBILIER", async () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'VEHICULE' } })

    expect(screen.queryByText(/Lier la dette à un bien immobilier/)).not.toBeInTheDocument()
  })

  // ── Override capital restant ──────────────────────────────────────────────

  it('affiche l\'avertissement override quand un capital manuel est saisi', async () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const overrideInput = screen.getByPlaceholderText(/185000/)
    fireEvent.change(overrideInput, { target: { value: '180000' } })
    expect(screen.getByText(/Mode override actif/)).toBeInTheDocument()
  })

  it("n'affiche pas l'avertissement override quand le champ est vide", () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText(/Mode override actif/)).not.toBeInTheDocument()
  })

  // ── Boutons ───────────────────────────────────────────────────────────────

  it('affiche "Ajouter" comme bouton de soumission pour une création', () => {
    render(<DebtForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument()
  })

  it('affiche "Enregistrer" comme bouton de soumission pour une édition', () => {
    render(<DebtForm debt={{ id: 1 }} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('appelle onCancel au clic sur "Annuler"', () => {
    const onCancel = vi.fn()
    render(<DebtForm onSubmit={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // ── Soumission ────────────────────────────────────────────────────────────

  it('appelle onSubmit avec le payload correct à la soumission', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<DebtForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Crédit BNP/), { target: { value: 'Mon crédit' } })
    fireEvent.change(screen.getByPlaceholderText(/200000/), { target: { value: '150000' } })

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type:           'IMMOBILIER',
          label:          'Mon crédit',
          initialCapital: 150000,
        })
      )
    })
  })

  it('convertit annualRate de % en décimal dans le payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    render(<DebtForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Crédit BNP/), { target: { value: 'Test' } })
    fireEvent.change(screen.getByPlaceholderText(/200000/), { target: { value: '100000' } })
    fireEvent.change(screen.getByPlaceholderText(/3.25/), { target: { value: '3.5' } })

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ annualRate: 0.035 })
      )
    })
  })
})

// ── Tests de la logique pure computeProjectedBalance ──────────────────────────
// Extrait comme constante utilitaire dans le composant — documenter son comportement.

describe('computeProjectedBalance (logique interne DebtForm)', () => {
  function computeProjectedBalance(initialCapital, annualRate, monthlyPayment, startDateStr) {
    if (!initialCapital || !monthlyPayment || !startDateStr) return null
    const start = new Date(startDateStr)
    const now = new Date()
    const n = Math.floor((now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()))
    if (n <= 0) return parseFloat(initialCapital)
    const P = parseFloat(initialCapital)
    const M = parseFloat(monthlyPayment)
    const annualRateNum = parseFloat(annualRate)
    if (isNaN(P) || isNaN(M)) return null
    if (!annualRateNum || annualRateNum === 0) return Math.max(P - M * n, 0)
    const r = annualRateNum / 12
    const pow = Math.pow(1 + r, n)
    return Math.max(P * pow - M * (pow - 1) / r, 0)
  }

  it('retourne null si les paramètres sont manquants', () => {
    expect(computeProjectedBalance(null, 0.035, 900, '2020-01-01')).toBeNull()
    expect(computeProjectedBalance(200000, 0.035, null, '2020-01-01')).toBeNull()
    expect(computeProjectedBalance(200000, 0.035, 900, null)).toBeNull()
  })

  it('retourne le capital initial si date de début est dans le futur (n ≤ 0)', () => {
    const futureDate = new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0]
    const result = computeProjectedBalance(200000, 0.035, 900, futureDate)
    expect(result).toBe(200000)
  })

  it('calcule le capital restant sans taux (remboursement linéaire)', () => {
    const startDate = new Date(new Date().getFullYear() - 2, 0, 1).toISOString().split('T')[0]
    const result = computeProjectedBalance(24000, 0, 1000, startDate)
    // ~24 mois × 1000 = 24000 remboursés → résidu ≈ 0
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThan(24000)
  })

  it('calcule un capital restant > 0 avec un taux positif', () => {
    const startDate = new Date(new Date().getFullYear() - 3, 0, 1).toISOString().split('T')[0]
    const result = computeProjectedBalance(200000, 0.035, 950, startDate)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(200000)
  })

  it('ne descend jamais en dessous de 0', () => {
    const startDate = new Date(new Date().getFullYear() - 30, 0, 1).toISOString().split('T')[0]
    const result = computeProjectedBalance(200000, 0.035, 950, startDate)
    expect(result).toBeGreaterThanOrEqual(0)
  })
})
