import { useState, useEffect, useCallback, useRef } from 'react'
import { getMyGroupMembers, getMemberPositions } from '../../api/familyGroup'
import { getPositions } from '../../api/patrimoine'
import {
  getDashboards, getDashboard,
  createDashboard, updateDashboard, deleteDashboard,
  saveDashboardLayoutV3,
  // Rétrocompatibilité Palier 2 (migration)
  getDashboardLayout, saveDashboardLayout,
} from '../../api/dashboard'
import DashboardGrid from './DashboardGrid'
import DashboardCustomizePanel from './DashboardCustomizePanel'
import DashboardSelector from './DashboardSelector'
import DashboardCreateModal from './DashboardCreateModal'
import DashboardManagePanel from './DashboardManagePanel'
import { DEFAULT_STATE, WIDGETS, SECTION_META, migrateConfig } from './widgets-registry'
import { DASHBOARD_TEMPLATES } from './dashboard-templates'
import { useAnalytics } from '../../hooks/useAnalytics'

// ── Helpers ───────────────────────────────────────────────────────────────────

function sumActive(positions) {
  return positions
    .filter(p => p.status === 'ACTIVE')
    .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
}

function parseStoredLayout(raw) {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function buildStateFromLayoutJson(layoutJson) {
  if (!layoutJson) return null
  const parsed = parseStoredLayout(layoutJson)
  if (parsed?.layouts) return parsed
  return null
}

// Migration Palier 2 localStorage → Palier 3
function buildStateFromLegacy(serverData, lsRaw) {
  if (serverData?.layoutJson) {
    const parsed = parseStoredLayout(serverData.layoutJson)
    if (parsed?.layouts) return parsed
  }
  if (lsRaw) {
    const palier1       = migrateConfig(parseStoredLayout(lsRaw))
    const hiddenWidgets = Object.entries(palier1.visibility ?? {})
      .filter(([, v]) => !v).map(([k]) => k)
    return { ...DEFAULT_STATE, hiddenWidgets }
  }
  return DEFAULT_STATE
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function DashboardPage({ user, familyMode, onNavigate, hideValues = false }) {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('dashboard.main') }, [])

  const [familyPositions, setFamilyPositions] = useState(null)
  const [memberBreakdown, setMemberBreakdown] = useState(null)
  const [editMode,        setEditMode]        = useState(false)
  const [serverSynced,    setServerSynced]    = useState(false)

  // ── État multi-dashboard ──────────────────────────────────────────────────
  const [dashboards,          setDashboards]          = useState([])
  const [activeDashboardId,   setActiveDashboardId]   = useState(null)
  const [dashboardLoading,    setDashboardLoading]    = useState(false)
  const [showCreateModal,     setShowCreateModal]     = useState(false)
  const [showManagePanel,     setShowManagePanel]     = useState(false)

  // ── État de la grille ─────────────────────────────────────────────────────
  const [layouts,        setLayouts]        = useState(DEFAULT_STATE.layouts)
  const [hiddenWidgets,  setHiddenWidgets]  = useState([])
  const [dividers,       setDividers]       = useState({})
  const nextDividerId = useRef(1)
  const recentlyShown = useRef(new Set())

  // ── Chargement initial : liste des dashboards ─────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const list = await getDashboards()
        if (cancelled) return

        if (list.length === 0) {
          // Utilisateur Palier 2 sans dashboard encore créé — migration
          await migratePalier2Legacy(cancelled)
          return
        }

        setDashboards(list)
        const defaultDash = list.find(d => d.isDefault) ?? list[0]
        setActiveDashboardId(defaultDash.id)
      } catch {
        setServerSynced(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function migratePalier2Legacy(cancelled) {
    try {
      const serverData = await getDashboardLayout()
      const lsRaw = (() => { try { return localStorage.getItem('dashboardWidgets') } catch { return null } })()
      const state  = buildStateFromLegacy(serverData, lsRaw)

      if (!cancelled) {
        setLayouts(state.layouts)
        setHiddenWidgets(state.hiddenWidgets ?? [])
        setDividers(state.dividers ?? {})
        setServerSynced(true)
      }
      // Nettoyage localStorage
      if (lsRaw) try { localStorage.removeItem('dashboardWidgets') } catch { /* ignore */ }
    } catch {
      if (!cancelled) setServerSynced(true)
    }
  }

  // ── Chargement du layout quand activeDashboardId change ──────────────────
  useEffect(() => {
    if (!activeDashboardId) return
    let cancelled = false
    async function load() {
      setDashboardLoading(true)
      try {
        const data = await getDashboard(activeDashboardId)
        if (cancelled) return

        const state = buildStateFromLayoutJson(data.layoutJson) ?? DEFAULT_STATE
        setLayouts(state.layouts)
        setHiddenWidgets(state.hiddenWidgets ?? [])
        setDividers(state.dividers ?? {})
        nextDividerId.current = 1
        setServerSynced(true)
      } catch {
        if (!cancelled) setServerSynced(true)
      } finally {
        if (!cancelled) setDashboardLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeDashboardId])

  // ── Persistance auto-debounced ────────────────────────────────────────────
  const saveTimer = useRef(null)

  const persist = useCallback((state, dashId) => {
    const payload = JSON.stringify({
      version: 1,
      layouts:       state.layouts,
      hiddenWidgets: state.hiddenWidgets,
      dividers:      state.dividers,
    })
    if (dashId) {
      return saveDashboardLayoutV3(dashId, payload, 1).catch(() => { /* silencieux */ })
    }
    // Fallback rétrocompat si pas encore de dashboardId
    return saveDashboardLayout(payload, 1).catch(() => { /* silencieux */ })
  }, [])

  function scheduleAutoSave(newLayouts, newHidden, newDividers) {
    if (!serverSynced) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(
      () => persist({ layouts: newLayouts, hiddenWidgets: newHidden, dividers: newDividers }, activeDashboardId),
      1000,
    )
  }

  // ── Handlers layout ───────────────────────────────────────────────────────
  function handleLayoutChange(allLayouts) {
    setLayouts(allLayouts)
    scheduleAutoSave(allLayouts, hiddenWidgets, dividers)
  }

  function handleHideWidget(key) {
    const next = [...hiddenWidgets, key]
    setHiddenWidgets(next)
    scheduleAutoSave(layouts, next, dividers)
  }

  function handleShowWidget(key) {
    recentlyShown.current.add(key)
    setTimeout(() => recentlyShown.current.delete(key), 5000)

    const next = hiddenWidgets.filter(k => k !== key)
    setHiddenWidgets(next)

    const alreadyInLayout = (layouts.lg ?? []).some(item => item.i === key)
    if (!alreadyInLayout) {
      const meta = WIDGETS[key]
      if (meta) {
        const { w, h, minW, minH } = meta.defaultSize
        const yEnd   = maxY(layouts.lg ?? [])
        const newItem = { i: key, x: 0, y: yEnd, w, h, minW, minH }
        const newLayouts = {
          lg: [...(layouts.lg ?? []), newItem],
          md: [...(layouts.md ?? []), { ...newItem, w: Math.max(minW ?? 2, Math.round(w * 8 / 12)) }],
          xs: [...(layouts.xs ?? []), { i: key, x: 0, y: (layouts.xs ?? []).length, w: 1, h }],
        }
        setLayouts(newLayouts)
        scheduleAutoSave(newLayouts, next, dividers)
        return
      }
    }
    scheduleAutoSave(layouts, next, dividers)
  }

  function maxY(lgItems) {
    return lgItems.reduce((m, item) => Math.max(m, item.y + item.h), 0)
  }

  function appendToGrid(label, widgetKeys, currentLayouts, currentHidden, currentDividers, subtitle) {
    const id          = `divider-${nextDividerId.current++}`
    const newDividers = { ...currentDividers, [id]: { label, subtitle: subtitle ?? '' } }
    const yEnd        = maxY(currentLayouts.lg ?? [])

    const dividerItem = { i: id, x: 0, y: yEnd, w: 12, h: 1, minH: 1, minW: 12, isResizable: false }
    const widgetItems = widgetKeys.flatMap((key, idx) => {
      const meta = WIDGETS[key]
      if (!meta) return []
      const { w, h, minW, minH } = meta.defaultSize
      return [{ i: key, x: 0, y: yEnd + 1 + idx * h, w, h, minW, minH }]
    })

    const newLg = [...(currentLayouts.lg ?? []), dividerItem, ...widgetItems]
    const newMd = [
      ...(currentLayouts.md ?? []),
      { ...dividerItem, w: 8 },
      ...widgetItems.map(it => ({ ...it, w: Math.max(it.minW ?? 2, Math.round(it.w * 8 / 12)) })),
    ]
    const newXs = [
      ...(currentLayouts.xs ?? []),
      { ...dividerItem, w: 1, y: (currentLayouts.xs ?? []).length },
      ...widgetItems.map((it, idx) => ({ i: it.i, x: 0, y: (currentLayouts.xs ?? []).length + 1 + idx, w: 1, h: it.h })),
    ]
    const newLayouts = { ...currentLayouts, lg: newLg, md: newMd, xs: newXs }
    const newHidden  = currentHidden.filter(k => !widgetKeys.includes(k))
    return { newLayouts, newHidden, newDividers }
  }

  function handleAddDivider(label = 'Nouvelle section') {
    const { newLayouts, newHidden, newDividers } = appendToGrid(label, [], layouts, hiddenWidgets, dividers)
    setDividers(newDividers)
    setLayouts(newLayouts)
    scheduleAutoSave(newLayouts, newHidden, newDividers)
  }

  function handleAddPrebuiltSection(sectionKey) {
    const meta     = SECTION_META[sectionKey]
    const label    = meta?.title ?? sectionKey
    const subtitle = meta?.subtitle ?? ''
    const sectionWidgetKeys = Object.entries(WIDGETS)
      .filter(([key, m]) => m.section === sectionKey && hiddenWidgets.includes(key))
      .map(([key]) => key)

    const { newLayouts, newHidden, newDividers } = appendToGrid(
      label, sectionWidgetKeys, layouts, hiddenWidgets, dividers, subtitle,
    )
    setDividers(newDividers)
    setLayouts(newLayouts)
    setHiddenWidgets(newHidden)
    scheduleAutoSave(newLayouts, newHidden, newDividers)
  }

  function handleRemoveDivider(id) {
    const newDividers = { ...dividers }
    delete newDividers[id]
    const newLayouts = {
      lg: (layouts.lg ?? []).filter(item => item.i !== id),
      md: (layouts.md ?? []).filter(item => item.i !== id),
      xs: (layouts.xs ?? []).filter(item => item.i !== id),
    }
    setDividers(newDividers)
    setLayouts(newLayouts)
    scheduleAutoSave(newLayouts, hiddenWidgets, newDividers)
  }

  function handleDividerLabelChange(id, patch) {
    const newDividers = { ...dividers, [id]: { ...dividers[id], ...patch } }
    setDividers(newDividers)
    scheduleAutoSave(layouts, hiddenWidgets, newDividers)
  }

  function handleReset() {
    const s = DEFAULT_STATE
    setLayouts(s.layouts)
    setHiddenWidgets(s.hiddenWidgets)
    setDividers(s.dividers)
    nextDividerId.current = 1
    scheduleAutoSave(s.layouts, s.hiddenWidgets, s.dividers)
  }

  // ── Handlers multi-dashboard ──────────────────────────────────────────────

  async function handleSelectDashboard(id) {
    if (id === activeDashboardId) return
    setActiveDashboardId(id)
  }

  async function handleCreateDashboard(name, templateKey) {
    const data    = await createDashboard(name)
    const template = DASHBOARD_TEMPLATES[templateKey]
    if (template) {
      const state   = template.getState()
      const payload = JSON.stringify({ version: 1, ...state })
      await saveDashboardLayoutV3(data.id, payload, 1)
    }
    const list = await getDashboards()
    setDashboards(list)
    setActiveDashboardId(data.id)
  }

  async function handleRenameDashboard(id, name) {
    const d = dashboards.find(d => d.id === id)
    if (!d) return
    await updateDashboard(id, { name, sortOrder: d.sortOrder, isDefault: d.isDefault })
    const list = await getDashboards()
    setDashboards(list)
  }

  async function handleSetDefaultDashboard(id) {
    const d = dashboards.find(d => d.id === id)
    if (!d) return
    await updateDashboard(id, { name: d.name, sortOrder: d.sortOrder, isDefault: true })
    const list = await getDashboards()
    setDashboards(list)
  }

  async function handleDeleteDashboard(id) {
    await deleteDashboard(id)
    const list = await getDashboards()
    setDashboards(list)
    if (id === activeDashboardId) {
      const next = list.find(d => d.isDefault) ?? list[0]
      if (next) setActiveDashboardId(next.id)
    }
  }

  // ── Mode famille ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function run() {
      if (!familyMode) { setFamilyPositions(null); setMemberBreakdown(null); return }
      try {
        const [ownPositions, members] = await Promise.all([getPositions(), getMyGroupMembers()])
        const memberPositions = await Promise.all(members.map(m => getMemberPositions(m.id)))
        setFamilyPositions([...ownPositions, ...memberPositions.flat()])
        const total = sumActive(ownPositions) + memberPositions.reduce((s, mp) => s + sumActive(mp), 0)
        const breakdown = [
          { name: user.firstName, value: Math.round(sumActive(ownPositions)) },
          ...members.map((m, i) => ({ name: m.firstName, value: Math.round(sumActive(memberPositions[i])) })),
        ]
          .filter(d => d.value > 0)
          .map(d => ({ ...d, pct: total > 0 ? (d.value / total * 100).toFixed(1) : '0.0' }))
        setMemberBreakdown(breakdown)
      } catch { setFamilyPositions(null); setMemberBreakdown(null) }
    }
    run()
  }, [familyMode, user.firstName])

  const ctx = { user, familyMode, familyPositions, memberBreakdown, onNavigate, hideValues }

  return (
    <div className="space-y-3">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-gray-500 text-sm mt-1">
            Bonjour <strong>{user.firstName}</strong> — une vue d'ensemble de vos revenus, dépenses et patrimoine.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editMode && (
            <button
              onClick={() => setEditMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              Terminer
            </button>
          )}
          <button
            onClick={() => setEditMode(e => !e)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition shadow-sm
              ${editMode
                ? 'text-indigo-600 bg-indigo-50 border-indigo-300'
                : 'text-gray-500 bg-white border-gray-200 hover:border-indigo-400 hover:text-indigo-600'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {editMode ? 'Mode édition' : 'Personnaliser'}
          </button>
        </div>
      </div>

      {/* ── Sélecteur de dashboards ─────────────────────────────────── */}
      {dashboards.length > 0 && (
        <DashboardSelector
          dashboards={dashboards}
          activeDashboardId={activeDashboardId}
          onSelect={handleSelectDashboard}
          onCreate={() => setShowCreateModal(true)}
          onManage={() => setShowManagePanel(true)}
        />
      )}

      {familyMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 dark:text-indigo-300 font-medium">
          <span>🏠</span>
          <span>Mode Foyer activé — les graphiques patrimoniaux agrègent les données de tous les membres du groupe.</span>
        </div>
      )}

      {editMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Faites glisser les widgets pour les réordonner. Redimensionnez par la poignée en bas à droite. Les modifications sont sauvegardées automatiquement.</span>
        </div>
      )}

      {/* ── Panneau de personnalisation ──────────────────────────────── */}
      {editMode && (
        <DashboardCustomizePanel
          hiddenWidgets={hiddenWidgets}
          dividers={dividers}
          onShowWidget={handleShowWidget}
          onHideWidget={handleHideWidget}
          onAddDivider={handleAddDivider}
          onRemoveDivider={handleRemoveDivider}
          onAddPrebuiltSection={handleAddPrebuiltSection}
          onReset={handleReset}
          onClose={() => setEditMode(false)}
        />
      )}

      {/* ── Grille principale ─────────────────────────────────────────── */}
      {dashboardLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          Chargement du tableau de bord…
        </div>
      ) : (
        <DashboardGrid
          layouts={layouts}
          hiddenWidgets={hiddenWidgets}
          dividers={dividers}
          editMode={editMode}
          ctx={ctx}
          recentlyShown={recentlyShown}
          onLayoutChange={handleLayoutChange}
          onHideWidget={handleHideWidget}
          onRemoveDivider={handleRemoveDivider}
          onDividerLabelChange={handleDividerLabelChange}
        />
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <DashboardCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateDashboard}
        />
      )}

      {showManagePanel && (
        <DashboardManagePanel
          dashboards={dashboards}
          activeDashboardId={activeDashboardId}
          onClose={() => setShowManagePanel(false)}
          onRename={handleRenameDashboard}
          onSetDefault={handleSetDefaultDashboard}
          onDelete={handleDeleteDashboard}
          onCreate={() => { setShowManagePanel(false); setShowCreateModal(true) }}
        />
      )}
    </div>
  )
}
