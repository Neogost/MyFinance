import { useState, useEffect, useRef } from 'react'

export function useCrud({
  fetchAll,
  create,
  update,
  remove,
  errorMessage = 'Impossible de charger les données.',
}) {
  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [formTarget,   setFormTarget]   = useState(undefined)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  // Ref pour éviter les closures obsolètes si fetchAll change après le montage
  const fetchAllRef = useRef(fetchAll)
  fetchAllRef.current = fetchAll

  async function refresh() {
    try {
      setLoading(true)
      const data = await fetchAllRef.current()
      if (data !== undefined) setItems(data)
    } catch {
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      await update(formTarget.id, payload)
    } else {
      await create(payload)
    }
    setFormTarget(undefined)
    await refresh()
  }

  function handleDelete(item) { setDeleteTarget(item) }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await remove(deleteTarget.id)
      await refresh()
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return {
    items, setItems, loading, error,
    formTarget, setFormTarget,
    deleteTarget, setDeleteTarget,
    deleting, handleSubmit, handleDelete, confirmDelete,
    refresh,
  }
}
