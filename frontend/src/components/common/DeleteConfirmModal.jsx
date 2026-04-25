export default function DeleteConfirmModal({ title, description, warnings = [], onConfirm, onCancel, loading = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}

        {warnings.length > 0 && (
          <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5">
              ⚠ Données supprimées en cascade
            </p>
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-amber-700 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 transition"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  )
}
