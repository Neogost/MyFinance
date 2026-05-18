import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { ResponsiveGridLayout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { WIDGETS } from './widgets-registry'

// ── Séparateur de section ─────────────────────────────────────────────────────
function SectionDivider({ label, subtitle, editable, onLabelChange, onSubtitleChange }) {
  const [editingLabel,    setEditingLabel]    = useState(false)
  const [editingSubtitle, setEditingSubtitle] = useState(false)
  const [draftLabel,      setDraftLabel]      = useState(label)
  const [draftSubtitle,   setDraftSubtitle]   = useState(subtitle ?? '')

  
  function commitLabel() {
    setEditingLabel(false)
    if (draftLabel.trim() && draftLabel !== label) onLabelChange(draftLabel.trim())
  }

  function commitSubtitle() {
    setEditingSubtitle(false)
    if (draftSubtitle !== subtitle) onSubtitleChange(draftSubtitle)
  }

  return (
    <div className="flex flex-col justify-center gap-0.5 h-full w-full px-2 py-1">
      {/* Ligne titre */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t-2 border-dashed border-gray-200" />
        {editingLabel ? (
          <input
            autoFocus
            className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-transparent border-b border-indigo-400 outline-none text-center w-48"
            value={draftLabel}
            onChange={e => setDraftLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => { if (e.key === 'Enter') commitLabel(); if (e.key === 'Escape') setEditingLabel(false) }}
          />
        ) : (
          <span
            className={`text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap ${editable ? 'cursor-pointer hover:text-indigo-500 transition' : ''}`}
            onClick={() => editable && setEditingLabel(true)}
            title={editable ? 'Cliquer pour renommer' : undefined}
          >
            {label || 'Section'}
          </span>
        )}
        <div className="flex-1 border-t-2 border-dashed border-gray-200" />
      </div>

      {/* Sous-titre */}
      {(subtitle || editable) && (
        <div className="text-center">
          {editingSubtitle ? (
            <input
              autoFocus
              className="text-xs text-gray-400 bg-transparent border-b border-indigo-300 outline-none text-center w-full max-w-lg"
              value={draftSubtitle}
              onChange={e => setDraftSubtitle(e.target.value)}
              onBlur={commitSubtitle}
              onKeyDown={e => { if (e.key === 'Enter') commitSubtitle(); if (e.key === 'Escape') setEditingSubtitle(false) }}
            />
          ) : (
            <span
              className={`text-xs text-gray-400 ${editable ? 'cursor-pointer hover:text-indigo-400 transition' : ''} ${!subtitle && editable ? 'italic opacity-50' : ''}`}
              onClick={() => editable && setEditingSubtitle(true)}
              title={editable ? 'Cliquer pour modifier le sous-titre' : undefined}
            >
              {subtitle || (editable ? 'Ajouter un sous-titre…' : '')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Cellule widget ────────────────────────────────────────────────────────────
function calcSize(w, h, thresholds) {
  const [xsW, xsH] = thresholds?.xs ?? [3, 3]
  const [smW, smH] = thresholds?.sm ?? [4, 4]
  const [mdW, mdH] = thresholds?.md ?? [6, 6]
  if (w <= xsW && h <= xsH) return 'xs'
  if (w <= smW && h <= smH) return 'sm'
  if (w <= mdW && h <= mdH) return 'md'
  return 'lg'
}

const WidgetCell = memo(function WidgetCell({ widgetKey, meta, ctx, editMode, onHide, onSelfHide, recentlyShown, itemW, itemH }) {
  const Component   = meta.component
  const size        = calcSize(itemW ?? meta.defaultSize.w, itemH ?? meta.defaultSize.h, meta.sizeThresholds)
  const canAutoHide = meta.autoHide && !recentlyShown?.current?.has(widgetKey)
  const handleEmpty = useCallback(() => onSelfHide(widgetKey), [onSelfHide, widgetKey])
  const props = { ...meta.getProps(ctx), size, ...(canAutoHide ? { onEmpty: handleEmpty } : {}) }

  // Badge d'édition uniforme : label + ✕, positionné en absolu haut-droite
  const editBadge = editMode && (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-indigo-600 rounded-lg px-2 py-1 shadow-md">
      <span className="text-xs font-medium text-white truncate max-w-[140px]">{meta.label}</span>
      <button
        onClick={() => onHide(widgetKey)}
        className="shrink-0 text-indigo-200 hover:text-white transition"
        title="Masquer ce widget"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )

  if (meta.noCard) {
    return (
      <div className={`h-full relative overflow-hidden rounded-xl transition-all
        ${editMode ? 'ring-2 ring-dashed ring-indigo-300' : ''}`}
      >
        {editBadge}
        <div className="h-full overflow-hidden">
          <Component {...props} className="h-full" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative h-full flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden transition-all
        ${meta.cardClass ?? 'border-gray-200'}
        ${editMode ? 'border-indigo-300 border-dashed ring-1 ring-indigo-200' : ''}`}
    >
      {editBadge}
      {meta.cardTitle && (
        <div className="shrink-0 px-4 pt-4 pb-0">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-800">{meta.cardTitle}</h3>
            {meta.cardSubtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{meta.cardSubtitle}</p>
            )}
          </div>
        </div>
      )}
      <div className={`flex-1 min-h-0 overflow-hidden ${meta.cardTitle ? 'px-4 pb-4' : 'p-4'}`}>
        <Component {...props} />
      </div>
    </div>
  )
})

// ── DashboardGrid ─────────────────────────────────────────────────────────────
export default function DashboardGrid({
  layouts,          // { lg, md, xs }
  hiddenWidgets,    // string[]
  dividers,         // { [id]: { label } }
  editMode,
  ctx,              // { user, familyMode, familyPositions, memberBreakdown, onNavigate, hideValues }
  recentlyShown,    // useRef<Set> — widgets immunisés vs onEmpty
  onLayoutChange,
  onHideWidget,
  onRemoveDivider,
  onDividerLabelChange,
}) {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(1200)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleLayoutChange = useCallback((currentLayout, allLayouts) => {
    onLayoutChange(allLayouts)
  }, [onLayoutChange])

  function renderItem(item) {
    const { i } = item
    if (i.startsWith('divider-')) {
      const d = dividers[i] ?? {}
      return (
        <div key={i} className="flex items-center gap-2 pr-2">
          <SectionDivider
            label={d.label ?? ''}
            subtitle={d.subtitle ?? ''}
            editable={editMode}
            onLabelChange={label => onDividerLabelChange(i, { label, subtitle: d.subtitle ?? '' })}
            onSubtitleChange={subtitle => onDividerLabelChange(i, { label: d.label ?? '', subtitle })}
          />
          {editMode && (
            <button
              onClick={e => { e.stopPropagation(); onRemoveDivider(i) }}
              className="shrink-0 text-gray-400 hover:text-red-500 transition bg-white rounded-full p-0.5 shadow-sm border border-gray-200"
              title="Supprimer ce séparateur"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )
    }
    const meta = WIDGETS[i]
    if (!meta || hiddenWidgets.includes(i)) return null
    return (
      <div key={i}>
        <WidgetCell
          widgetKey={i}
          meta={meta}
          ctx={ctx}
          editMode={editMode}
          onHide={onHideWidget}
          onSelfHide={handleSelfHide}
          recentlyShown={recentlyShown}
          itemW={item.w}
          itemH={item.h}
        />
      </div>
    )
  }

  const [selfHiddenItems, setSelfHiddenItems] = useState(new Set())

  // Fusion : masqués explicitement + masqués automatiquement (onEmpty)
  const allItems = (layouts.lg ?? []).filter(
    item => !hiddenWidgets.includes(item.i) && !selfHiddenItems.has(item.i)
  )

  function handleSelfHide(key) {
    setSelfHiddenItems(prev => new Set([...prev, key]))
    onHideWidget(key)
  }

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches

  // Synchronise minW/minH depuis le registre pour chaque breakpoint
  // (le layout persisté en backend peut avoir des valeurs périmées)
  function syncConstraints(bpItems) {
    return (bpItems ?? []).map(item => {
      // On retire toujours isDraggable/isResizable/static pour éviter qu'une
      // valeur persistée en base ne court-circuite les props de la grille
      const { isDraggable: _d, isResizable: _r, static: _s, ...rest } = item
      const meta = WIDGETS[rest.i]
      const base = meta ? {
        ...rest,
        minW: meta.defaultSize.minW,
        minH: meta.defaultSize.minH,
        ...(meta.defaultSize.maxW != null ? { maxW: meta.defaultSize.maxW } : {}),
        ...(meta.defaultSize.maxH != null ? { maxH: meta.defaultSize.maxH } : {}),
      } : rest
      return isMobile ? { ...base, isDraggable: false, isResizable: false } : base
    })
  }
  const syncedLayouts = {
    lg: syncConstraints(layouts.lg),
    md: syncConstraints(layouts.md),
    xs: syncConstraints(layouts.xs),
  }

  return (
    <div ref={containerRef}>
      <ResponsiveGridLayout
        className="layout"
        layouts={syncedLayouts}
        width={containerWidth}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 8, sm: 6, xs: 1, xxs: 1 }}
        rowHeight={60}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        isDraggable={editMode && !isMobile}
        isResizable={editMode && !isMobile}
        draggableHandle=".drag-handle"
        onLayoutChange={handleLayoutChange}
        useCSSTransforms
      >
        {allItems.map(item => renderItem(item))}
      </ResponsiveGridLayout>
    </div>
  )
}
