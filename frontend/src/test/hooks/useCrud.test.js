import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCrud } from '../../hooks/useCrud'

const ITEMS = [
  { id: 1, label: 'A' },
  { id: 2, label: 'B' },
]

function makeOpts(overrides = {}) {
  return {
    fetchAll:     vi.fn().mockResolvedValue(ITEMS),
    create:       vi.fn().mockResolvedValue({ id: 3, label: 'C' }),
    update:       vi.fn().mockResolvedValue({ id: 1, label: 'A modifié' }),
    remove:       vi.fn().mockResolvedValue(),
    errorMessage: 'Erreur test.',
    ...overrides,
  }
}

describe('useCrud', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Chargement initial ─────────────────────────────────────────────────────

  it('démarre en état loading=true', () => {
    const opts = makeOpts({ fetchAll: vi.fn(() => new Promise(() => {})) })
    const { result } = renderHook(() => useCrud(opts))
    expect(result.current.loading).toBe(true)
    expect(result.current.items).toEqual([])
  })

  it('charge les items au montage et passe loading=false', async () => {
    const opts = makeOpts()
    const { result } = renderHook(() => useCrud(opts))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual(ITEMS)
    expect(opts.fetchAll).toHaveBeenCalledTimes(1)
  })

  it("affiche l'erreur si fetchAll échoue", async () => {
    const opts = makeOpts({ fetchAll: vi.fn().mockRejectedValue(new Error('network')) })
    const { result } = renderHook(() => useCrud(opts))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Erreur test.')
    expect(result.current.items).toEqual([])
  })

  // ── État du formulaire ─────────────────────────────────────────────────────

  it('formTarget est undefined par défaut (formulaire fermé)', async () => {
    const { result } = renderHook(() => useCrud(makeOpts()))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.formTarget).toBeUndefined()
  })

  it('setFormTarget(null) ouvre le formulaire de création', async () => {
    const { result } = renderHook(() => useCrud(makeOpts()))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setFormTarget(null))
    expect(result.current.formTarget).toBeNull()
  })

  it('setFormTarget(item) ouvre le formulaire d\'édition', async () => {
    const { result } = renderHook(() => useCrud(makeOpts()))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setFormTarget(ITEMS[0]))
    expect(result.current.formTarget).toEqual(ITEMS[0])
  })

  // ── handleSubmit création ──────────────────────────────────────────────────

  it('handleSubmit sans id appelle create et refresh', async () => {
    const opts = makeOpts()
    const { result } = renderHook(() => useCrud(opts))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setFormTarget(null))
    await act(async () => { await result.current.handleSubmit({ label: 'C' }) })

    expect(opts.create).toHaveBeenCalledWith({ label: 'C' })
    expect(opts.fetchAll).toHaveBeenCalledTimes(2)
    expect(result.current.formTarget).toBeUndefined()
  })

  // ── handleSubmit édition ───────────────────────────────────────────────────

  it('handleSubmit avec id appelle update et refresh', async () => {
    const opts = makeOpts()
    const { result } = renderHook(() => useCrud(opts))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setFormTarget(ITEMS[0]))
    await act(async () => { await result.current.handleSubmit({ label: 'A modifié' }) })

    expect(opts.update).toHaveBeenCalledWith(ITEMS[0].id, { label: 'A modifié' })
    expect(opts.fetchAll).toHaveBeenCalledTimes(2)
    expect(result.current.formTarget).toBeUndefined()
  })

  // ── handleDelete / confirmDelete ───────────────────────────────────────────

  it('handleDelete positionne deleteTarget', async () => {
    const { result } = renderHook(() => useCrud(makeOpts()))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.handleDelete(ITEMS[0]))
    expect(result.current.deleteTarget).toEqual(ITEMS[0])
  })

  it('confirmDelete appelle remove, refresh et vide deleteTarget', async () => {
    const opts = makeOpts()
    const { result } = renderHook(() => useCrud(opts))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.handleDelete(ITEMS[0]))
    await act(async () => { await result.current.confirmDelete() })

    expect(opts.remove).toHaveBeenCalledWith(ITEMS[0].id)
    expect(opts.fetchAll).toHaveBeenCalledTimes(2)
    expect(result.current.deleteTarget).toBeNull()
  })

  it('deleting=true pendant confirmDelete, false après', async () => {
    let resolve
    const slowRemove = vi.fn(() => new Promise(r => { resolve = r }))
    const opts = makeOpts({ remove: slowRemove })
    const { result } = renderHook(() => useCrud(opts))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.handleDelete(ITEMS[0]))

    let confirmPromise
    act(() => { confirmPromise = result.current.confirmDelete() })
    expect(result.current.deleting).toBe(true)

    await act(async () => { resolve(); await confirmPromise })
    expect(result.current.deleting).toBe(false)
  })

  // ── refresh ────────────────────────────────────────────────────────────────

  it('refresh ré-appelle fetchAll et met à jour items', async () => {
    const opts = makeOpts()
    const { result } = renderHook(() => useCrud(opts))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const newItems = [{ id: 9, label: 'X' }]
    opts.fetchAll.mockResolvedValue(newItems)

    await act(async () => { await result.current.refresh() })

    expect(result.current.items).toEqual(newItems)
    expect(opts.fetchAll).toHaveBeenCalledTimes(2)
  })
})
