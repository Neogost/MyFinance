import { WIDGETS, WIDGET_GROUPS, SECTION_META } from './widgets-registry'

const SECTION_ICONS = {
  revenues:   '💰',
  patrimoine: '📊',
  objectifs:  '🎯',
}

function WidgetRow({ widgetKey, label, visible, onShow, onHide }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className={`text-sm truncate ${visible ? 'text-gray-700' : 'text-gray-400'}`}>
        {label}
      </span>
      <button
        onClick={() => visible ? onHide(widgetKey) : onShow(widgetKey)}
        title={visible ? 'Masquer ce widget' : 'Afficher ce widget'}
        className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full border transition font-bold text-sm
          ${visible
            ? 'border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50'
            : 'border-indigo-300 text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50'}`}
      >
        {visible ? '−' : '+'}
      </button>
    </div>
  )
}

export default function DashboardCustomizePanel({
  hiddenWidgets,
  dividers,
  onShowWidget,
  onHideWidget,
  onAddDivider,
  onRemoveDivider,
  onAddPrebuiltSection,
  onReset,
  onClose,
}) {
  const hiddenSet      = new Set(hiddenWidgets)
  const dividerEntries = Object.entries(dividers ?? {})
  const dividerLabels  = new Set(dividerEntries.map(([, d]) => d.label?.trim().toLowerCase()))

  return (
    <>
      {/* Panneau */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-80 bg-white shadow-xl z-60 flex flex-col">

        {/* En-tête */}
        <div className="flex items-center justify-between px-5 pt-safe pb-4 sm:pt-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Personnaliser le tableau de bord</h2>
          <button
            onClick={onClose}
            data-testid="dashboard-customize-close-button"
            aria-label="Fermer le panneau de personnalisation"
            className="text-gray-400 hover:text-gray-600 transition p-1 -m-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">

          {/* ── Aide rapide ───────────────────────────────────── */}
          <div className="px-5 py-3 space-y-1">
            <p className="text-xs text-gray-500">• <strong>Déplacer</strong> : glisser un widget dans la grille</p>
            <p className="text-xs text-gray-500">• <strong>Redimensionner</strong> : poignée bas-droite</p>
            <p className="text-xs text-gray-500">• <strong>+</strong> affiche un widget · <strong>−</strong> le masque</p>
          </div>

          {/* ── Widgets par section ───────────────────────────── */}
          {WIDGET_GROUPS.map(group => {
            const groupWidgets = group.widgets.filter(w => WIDGETS[w.key])
            if (groupWidgets.length === 0) return null
            return (
              <div key={group.key} className="px-5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <span>{SECTION_ICONS[group.key]}</span>
                    {group.title}
                  </p>
                  {!dividerLabels.has(group.title.trim().toLowerCase()) && (
                    <button
                      onClick={() => onAddPrebuiltSection(group.key)}
                      className="text-xs text-indigo-500 hover:text-indigo-700 transition"
                      title={`Ajouter la section ${group.title}`}
                    >
                      + section
                    </button>
                  )}
                </div>
                <div>
                  {groupWidgets.map(w => (
                    <WidgetRow
                      key={w.key}
                      widgetKey={w.key}
                      label={w.label}
                      visible={!hiddenSet.has(w.key)}
                      onShow={onShowWidget}
                      onHide={onHideWidget}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* ── Sections personnalisées (séparateurs) ─────────── */}
          <div className="px-5 py-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Séparateurs de section</p>

            {dividerEntries.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {dividerEntries.map(([id, d]) => (
                  <div key={id} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-sm text-gray-700 truncate">{d.label || 'Sans titre'}</span>
                    <button
                      onClick={() => onRemoveDivider(id)}
                      className="shrink-0 text-gray-400 hover:text-red-500 transition"
                      title="Supprimer ce séparateur"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => onAddDivider()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 bg-indigo-50 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-100 transition"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Créer une section vide
            </button>
          </div>
        </div>

        {/* Pied */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
          >
            Terminer la personnalisation
          </button>
          <button
            onClick={() => { if (window.confirm('Réinitialiser la disposition par défaut ? Tous vos changements seront perdus.')) onReset() }}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition text-center"
          >
            Réinitialiser la disposition par défaut
          </button>
        </div>
      </div>
    </>
  )
}
