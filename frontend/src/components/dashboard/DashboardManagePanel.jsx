import { useState } from 'react'

export default function DashboardManagePanel({
  dashboards,
  activeDashboardId,
  onClose,
  onRename,
  onSetDefault,
  onDelete,
  onCreate,
}) {
  const [editingId,   setEditingId]   = useState(null)
  const [draftName,   setDraftName]   = useState('')
  const [deletingId,  setDeletingId]  = useState(null)

  function startEdit(d) {
    setEditingId(d.id)
    setDraftName(d.name)
  }

  async function commitRename(d) {
    if (draftName.trim() && draftName.trim() !== d.name) {
      await onRename(d.id, draftName.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 bg-white w-full max-w-sm h-full shadow-xl flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Tableaux de bord</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {dashboards.map(d => (
            <div
              key={d.id}
              className={`rounded-xl border p-3 transition
                ${d.id === activeDashboardId
                  ? 'border-indigo-200 bg-indigo-50'
                  : 'border-gray-100 bg-gray-50'}`}
            >
              {/* Nom éditable */}
              <div className="flex items-center gap-2 mb-2">
                {editingId === d.id ? (
                  <input
                    autoFocus
                    maxLength={50}
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                    onBlur={() => commitRename(d)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(d)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 text-sm border border-indigo-300 rounded-lg px-2 py-1
                               outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-gray-800 flex items-center gap-1.5">
                    {d.name}
                    {d.isDefault && <span className="text-amber-500 text-xs">★</span>}
                    {d.id === activeDashboardId && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">
                        actif
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => startEdit(d)}
                  className="text-[11px] text-gray-500 hover:text-indigo-600 transition
                             px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200"
                >
                  ✏️ Renommer
                </button>

                {!d.isDefault && (
                  <button
                    onClick={() => onSetDefault(d.id)}
                    className="text-[11px] text-gray-500 hover:text-amber-600 transition
                               px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200"
                  >
                    ★ Définir par défaut
                  </button>
                )}

                {dashboards.length > 1 && (
                  deletingId === d.id ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[11px] text-red-600">Confirmer ?</span>
                      <button
                        onClick={() => { onDelete(d.id); setDeletingId(null) }}
                        className="text-[11px] text-red-600 font-semibold hover:underline"
                      >Oui</button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-[11px] text-gray-400 hover:underline"
                      >Non</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(d.id)}
                      className="text-[11px] text-red-400 hover:text-red-600 transition ml-auto
                                 px-2 py-1 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200"
                    >
                      🗑 Supprimer
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer — créer */}
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={onCreate}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                       border-2 border-dashed border-gray-300 text-sm text-gray-500
                       hover:border-indigo-400 hover:text-indigo-600 transition font-medium"
          >
            + Nouveau tableau de bord
          </button>
        </div>
      </div>
    </div>
  )
}
