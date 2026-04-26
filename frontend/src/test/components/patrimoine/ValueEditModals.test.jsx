import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BalanceEditModal, EstimatedValueModal } from '../../../components/patrimoine/ValueEditModals'

// Pas d'appel API — les modales délèguent à onSave via prop

const POSITION_LIQUIDITE = {
  id: 1, label: 'Compte courant BNP',
  currentBalance: 5000, category: 'LIQUIDITE',
}

const POSITION_IMMO = {
  id: 2, label: 'Appartement Paris',
  estimatedCurrentValue: 320000, category: 'IMMO_PHYSIQUE',
}

describe('BalanceEditModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche le titre "Mettre à jour le solde"', () => {
    render(<BalanceEditModal position={POSITION_LIQUIDITE} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Mettre à jour le solde')).toBeInTheDocument()
  })

  it('affiche le libellé de la position', () => {
    render(<BalanceEditModal position={POSITION_LIQUIDITE} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Compte courant BNP')).toBeInTheDocument()
  })

  it('pré-remplit la valeur du solde actuel', () => {
    render(<BalanceEditModal position={POSITION_LIQUIDITE} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('5000')).toBeInTheDocument()
  })

  it('désactive le bouton Enregistrer si la valeur est vide', () => {
    const position = { ...POSITION_LIQUIDITE, currentBalance: '' }
    render(<BalanceEditModal position={position} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('appelle onSave avec la valeur saisie', async () => {
    const onSave = vi.fn().mockResolvedValue()
    render(<BalanceEditModal position={POSITION_LIQUIDITE} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Nouveau solde en €'), { target: { value: '6000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(6000))
  })

  it('appelle onCancel au clic sur Annuler', () => {
    const onCancel = vi.fn()
    render(<BalanceEditModal position={POSITION_LIQUIDITE} onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('EstimatedValueModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche le titre "Mettre à jour la valeur estimée"', () => {
    render(<EstimatedValueModal position={POSITION_IMMO} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Mettre à jour la valeur estimée')).toBeInTheDocument()
  })

  it('affiche le libellé de la position', () => {
    render(<EstimatedValueModal position={POSITION_IMMO} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Appartement Paris')).toBeInTheDocument()
  })

  it('pré-remplit la valeur estimée actuelle', () => {
    render(<EstimatedValueModal position={POSITION_IMMO} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByDisplayValue('320000')).toBeInTheDocument()
  })

  it('désactive le bouton Enregistrer si la valeur est vide', () => {
    const position = { ...POSITION_IMMO, estimatedCurrentValue: '' }
    render(<EstimatedValueModal position={position} onSave={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('appelle onSave avec la valeur saisie', async () => {
    const onSave = vi.fn().mockResolvedValue()
    render(<EstimatedValueModal position={POSITION_IMMO} onSave={onSave} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Valeur estimée en €'), { target: { value: '350000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(350000))
  })

  it('appelle onCancel au clic sur Annuler', () => {
    const onCancel = vi.fn()
    render(<EstimatedValueModal position={POSITION_IMMO} onSave={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
