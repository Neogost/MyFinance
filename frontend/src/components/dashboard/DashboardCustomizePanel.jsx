import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { WIDGET_GROUPS, DEFAULT_WIDGET_CONFIG } from './widgets-registry'

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

function DragHandle() {
  return (
    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
    </svg>
  )
}

function SortableSection({ group, config, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-gray-50 rounded-lg border border-gray-100">
      {/* En-tête section — poignée de drag */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 touch-none"
          aria-label={`Réordonner la section ${group.title}`}
        >
          <DragHandle />
        </button>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex-1">{group.title}</p>
      </div>

      {/* Toggles widgets */}
      <div className="px-3 py-2 space-y-2.5">
        {group.widgets.map(w => (
          <div key={w.key} className="flex items-center justify-between gap-3">
            <span className={`text-sm ${config.visibility[w.key] ? 'text-gray-700' : 'text-gray-400'}`}>
              {w.label}
            </span>
            <Toggle enabled={!!config.visibility[w.key]} onToggle={() => onToggle(w.key)} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardCustomizePanel({ config, onChange, onClose }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = config.sectionOrder.indexOf(active.id)
    const newIndex = config.sectionOrder.indexOf(over.id)
    onChange({ ...config, sectionOrder: arrayMove(config.sectionOrder, oldIndex, newIndex) })
  }

  function toggleWidget(key) {
    onChange({
      ...config,
      visibility: { ...config.visibility, [key]: !config.visibility[key] },
    })
  }

  function resetAll() {
    onChange({ ...DEFAULT_WIDGET_CONFIG })
  }

  // Groupes triés selon sectionOrder courant
  const orderedGroups = config.sectionOrder
    .map(key => WIDGET_GROUPS.find(g => g.key === key))
    .filter(Boolean)

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

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

        {/* Hint réordonnement */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-xs text-gray-400">
            Glissez <span className="inline-block align-middle"><DragHandle /></span> pour réordonner les sections. Activez ou désactivez les widgets ci-dessous.
          </p>
        </div>

        {/* Liste sections drag & drop */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={config.sectionOrder} strategy={verticalListSortingStrategy}>
              {orderedGroups.map(group => (
                <SortableSection
                  key={group.key}
                  group={group}
                  config={config}
                  onToggle={toggleWidget}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Pied */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={resetAll}
            className="w-full text-sm text-gray-500 hover:text-indigo-600 transition text-center"
          >
            Tout réafficher
          </button>
        </div>

      </div>
    </>
  )
}
