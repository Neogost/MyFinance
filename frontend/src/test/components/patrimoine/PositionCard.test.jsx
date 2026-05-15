import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PositionCard from '../../../components/patrimoine/PositionCard'

const BASE_POSITION = {
  id: 1,
  label: 'ETF World',
  category: 'BOURSE',
  status: 'ACTIVE',
  fiscalEnvelope: 'PEA',
  computed: {
    currentValueEur: 10000,
    capitalGainEur: 1500,
    investedAmountEur: 8500,
  },
}

const LIQUIDITE_POSITION = {
  id: 2,
  label: 'Compte courant',
  category: 'LIQUIDITE',
  status: 'ACTIVE',
  fiscalEnvelope: 'NONE',
  computed: {
    currentValueEur: 2000,
    capitalGainEur: 0,
    investedAmountEur: 2000,
  },
}

const IMMO_POSITION = {
  id: 3,
  label: 'Appartement Paris',
  category: 'IMMO_PHYSIQUE',
  status: 'ACTIVE',
  fiscalEnvelope: 'NONE',
  acquisitionDate: '2020-06-01',
  computed: {
    currentValueEur: 250000,
    capitalGainEur: 50000,
    investedAmountEur: 200000,
  },
}

describe('PositionCard', () => {
  const callbacks = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    onUpdateBalance: vi.fn(),
    onUpdateEstimatedValue: vi.fn(),
    onViewOrders: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('affiche le label de la position', () => {
    render(<PositionCard position={BASE_POSITION} {...callbacks} />)
    expect(screen.getByText('ETF World')).toBeInTheDocument()
  })

  it('affiche le badge de catégorie "Bourse"', () => {
    render(<PositionCard position={BASE_POSITION} {...callbacks} />)
    expect(screen.getByText('Bourse')).toBeInTheDocument()
  })

  it('affiche le badge d\'enveloppe fiscale "PEA"', () => {
    render(<PositionCard position={BASE_POSITION} {...callbacks} />)
    expect(screen.getByText('PEA')).toBeInTheDocument()
  })

  it('appelle onEdit au clic sur "Modifier"', () => {
    render(<PositionCard position={BASE_POSITION} {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: /Modifier/ }))
    expect(callbacks.onEdit).toHaveBeenCalledWith(BASE_POSITION)
  })

  it('appelle onViewOrders au clic sur "Mouvements" pour une position BOURSE', () => {
    render(<PositionCard position={BASE_POSITION} {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: /Mouvements/ }))
    expect(callbacks.onViewOrders).toHaveBeenCalledWith(BASE_POSITION)
  })

  it('ouvre la modal de suppression au clic sur "Supprimer"', () => {
    render(<PositionCard position={BASE_POSITION} {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: /Supprimer/ }))
    expect(screen.getByText('Supprimer définitivement')).toBeInTheDocument()
  })

  it('appelle onDelete après confirmation dans la modal', () => {
    render(<PositionCard position={BASE_POSITION} {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: /Supprimer/ }))
    fireEvent.click(screen.getByText('Supprimer définitivement'))
    expect(callbacks.onDelete).toHaveBeenCalledWith(BASE_POSITION)
  })

  it('affiche le bouton "Màj solde" pour une position LIQUIDITE', () => {
    render(<PositionCard position={LIQUIDITE_POSITION} {...callbacks} />)
    expect(screen.getByRole('button', { name: /Màj solde/ })).toBeInTheDocument()
  })

  it('affiche "Crédit lié" quand linkedDebts est fourni', () => {
    const linkedDebt = { id: 10, label: 'Crédit immobilier', remainingCapital: 180000 }
    render(<PositionCard position={IMMO_POSITION} {...callbacks} linkedDebts={[linkedDebt]} />)
    expect(screen.getByText(/Crédit lié/)).toBeInTheDocument()
    expect(screen.getByText(/Crédit immobilier/)).toBeInTheDocument()
  })

  it('n\'affiche pas "Crédit lié" sans linkedDebts', () => {
    render(<PositionCard position={IMMO_POSITION} {...callbacks} />)
    expect(screen.queryByText(/Crédit lié/)).not.toBeInTheDocument()
  })
})
