import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OrderPanel from '../../../components/patrimoine/OrderPanel'
import { getOrders, createOrder, updateOrder, deleteOrder } from '../../../api/patrimoine'

vi.mock('../../../api/patrimoine', () => ({
  getOrders:    vi.fn(),
  createOrder:  vi.fn(),
  updateOrder:  vi.fn(),
  deleteOrder:  vi.fn(),
}))

const BOURSE_POSITION = {
  id: 1,
  label: 'ETF World',
  category: 'BOURSE',
  status: 'ACTIVE',
  computed: { currentValueEur: 10000 },
}

const ORDER = {
  id: 10,
  orderType: 'BUY',
  orderDate: '2024-01-15',
  quantity: 5,
  unitPriceEur: 100,
  amountEur: 500,
  feesEur: 2,
  label: null,
}

describe('OrderPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('affiche "Chargement…" pendant le fetch des ordres', () => {
    getOrders.mockReturnValue(new Promise(() => {}))
    render(<OrderPanel position={BOURSE_POSITION} onClose={vi.fn()} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it("affiche une erreur si l'API échoue", async () => {
    getOrders.mockRejectedValue(new Error('network'))
    render(<OrderPanel position={BOURSE_POSITION} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger/)).toBeInTheDocument()
    })
  })

  it('affiche "Aucun mouvement enregistré" quand la liste est vide', async () => {
    getOrders.mockResolvedValue([])
    render(<OrderPanel position={BOURSE_POSITION} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Aucun mouvement enregistré/)).toBeInTheDocument()
    })
  })

  it('affiche le nom de la position dans le titre', async () => {
    getOrders.mockResolvedValue([])
    render(<OrderPanel position={BOURSE_POSITION} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/ETF World/)).toBeInTheDocument()
    })
  })

  it('affiche un ordre existant (libellé traduit "Achat")', async () => {
    getOrders.mockResolvedValue([ORDER])
    render(<OrderPanel position={BOURSE_POSITION} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Achat')).toBeInTheDocument()
    })
  })

  it('ouvre le formulaire d\'ajout au clic sur "+ Ajouter"', async () => {
    getOrders.mockResolvedValue([])
    render(<OrderPanel position={BOURSE_POSITION} onClose={vi.fn()} />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: '+ Ajouter' })))
    expect(screen.getByText('Ajouter un mouvement')).toBeInTheDocument()
  })

  it('appelle onClose au clic sur le bouton ×', async () => {
    getOrders.mockResolvedValue([])
    const onClose = vi.fn()
    render(<OrderPanel position={BOURSE_POSITION} onClose={onClose} />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: '×' })))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('supprime un ordre après confirmation "Suppr." → "Oui"', async () => {
    getOrders.mockResolvedValue([ORDER])
    deleteOrder.mockResolvedValue()
    render(<OrderPanel position={BOURSE_POSITION} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Achat')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Suppr.' }))
    fireEvent.click(screen.getByRole('button', { name: 'Oui' }))
    await waitFor(() => expect(deleteOrder).toHaveBeenCalledWith(BOURSE_POSITION.id, ORDER.id))
  })
})
