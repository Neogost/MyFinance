import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getEngagementSummary, getRetention, getTopEvents, getTimeline, getJourney, getJourneyErrors, getErrors, getErrorOccurrences, getHealth, purgeAnalytics } from '../../api/analytics'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'

// ── Helpers ────────────────────────────────────────────────

function periodDates(days) {
  const to   = new Date()
  const from = new Date(Date.now() - days * 86400000)
  return { from: from.toISOString().slice(0, 19), to: to.toISOString().slice(0, 19) }
}

function previousPeriodDates(days) {
  const to   = new Date(Date.now() - days * 86400000)
  const from = new Date(Date.now() - 2 * days * 86400000)
  return { from: from.toISOString().slice(0, 19), to: to.toISOString().slice(0, 19) }
}

// ── Labels lisibles ────────────────────────────────────────

const EVENT_LABELS = {
  'dashboard.main.view': 'Tableau de bord', 'patrimoine.main.view': 'Patrimoine',
  'revenus.salary_contract.view': 'Contrats salariaux', 'revenus.other_income.view': 'Revenus complémentaires',
  'expenses.recurring.view': 'Dépenses récurrentes', 'debts.main.view': 'Dettes',
  'possessions.main.view': 'Possessions', 'tools.tax_simulator.view': 'Simulateur impôts',
  'tools.bilan.view': 'Bilan financier', 'tools.loan.view': 'Simulateur emprunt',
  'tools.lombard.view': 'Simulateur Lombard', 'tools.crisis.view': 'Simulateur crise',
  'tools.fiscal_envelope.view': 'Enveloppes fiscales', 'tools.retirement.view': 'Simulateur retraite',
  'tools.compound_interest.view': 'Intérêts composés',
  'tools.patrimoine_declaration.view': 'Déclaration patrimoine',
  'admin.instrument.view': 'Instruments', 'admin.snapshot.view': 'Relevés',
  'admin.login_history.view': 'Connexions', 'admin.user.view': 'Utilisateurs',
  'admin.analytics.view': 'Analytics', 'auth.profile.view': 'Mon profil',
  'admin.family_group.view': 'Groupes familiaux', 'admin.registration.view': "Inscriptions",
  'app.documentation.view': 'Documentation',
  'patrimoine.position.create': 'Créer position', 'patrimoine.position.edit': 'Modifier position',
  'patrimoine.position.delete': 'Supprimer position', 'patrimoine.position.close': 'Clôturer position',
  'patrimoine.order.create': 'Passer un ordre', 'patrimoine.order.edit': 'Modifier un ordre',
  'patrimoine.order.delete': 'Supprimer un ordre', 'patrimoine.strategy.save': 'Sauvegarder stratégie',
  'revenus.salary_contract.create': 'Créer contrat', 'revenus.salary_contract.edit': 'Modifier contrat',
  'revenus.salary_contract.delete': 'Supprimer contrat',
  'revenus.pay_slip.create': 'Ajouter bulletin', 'revenus.pay_slip.edit': 'Modifier bulletin', 'revenus.pay_slip.delete': 'Supprimer bulletin',
  'revenus.bonus.create': 'Ajouter prime', 'revenus.bonus.edit': 'Modifier prime', 'revenus.bonus.delete': 'Supprimer prime',
  'revenus.revision.create': 'Ajouter révision', 'revenus.revision.edit': 'Modifier révision', 'revenus.revision.delete': 'Supprimer révision',
  'revenus.benefit.create': 'Ajouter avantage', 'revenus.benefit.edit': 'Modifier avantage', 'revenus.benefit.delete': 'Supprimer avantage',
  'revenus.other_income.create': 'Ajouter revenu', 'revenus.other_income.edit': 'Modifier revenu', 'revenus.other_income.delete': 'Supprimer revenu',
  'expenses.recurring.create': 'Ajouter dépense', 'expenses.recurring.edit': 'Modifier dépense', 'expenses.recurring.delete': 'Supprimer dépense',
  'debts.debt.create': 'Créer dette', 'debts.debt.edit': 'Modifier dette', 'debts.debt.delete': 'Supprimer dette',
  'debts.balance_entry.submit': 'Saisir capital restant',
  'possessions.possession.create': 'Ajouter bien', 'possessions.possession.edit': 'Modifier bien', 'possessions.possession.delete': 'Supprimer bien',
  'tools.tax_simulator.simulate': 'Simuler imposition', 'tools.loan.save': 'Sauvegarder simulation', 'tools.loan.load': 'Charger simulation',
  'admin.registration.approve': 'Approuver inscription', 'admin.registration.reject': 'Rejeter inscription',
  'admin.user.create': 'Créer utilisateur', 'admin.user.edit': 'Modifier utilisateur', 'admin.user.delete': 'Supprimer utilisateur',
  'admin.instrument.update_prices': 'Mettre à jour les cours',
  'family.group.create': 'Créer groupe', 'family.group.rename': 'Renommer groupe',
  'family.group.dissolve': 'Dissoudre groupe', 'family.group.leave': 'Quitter groupe',
  'family.group.remove_member': 'Retirer un membre',
  'family.invitation.send': 'Envoyer invitation', 'family.invitation.accept': 'Accepter invitation', 'family.invitation.refuse': 'Refuser invitation',
  'app.ui.toggle_dark_mode': 'Mode nuit', 'app.ui.toggle_hide_values': 'Masquer valeurs',
  'app.ui.toggle_family_mode': 'Mode foyer', 'app.ui.open_release_notes': 'Notes de version',
  'patrimoine.position.open_form': '+ Ajouter position', 'revenus.salary_contract.open_form': '+ Nouveau contrat',
  'expenses.recurring.open_form': '+ Ajouter dépense', 'debts.debt.open_form': '+ Ajouter dette',
  'possessions.possession.open_form': '+ Ajouter bien',
  'auth.profile.change_password': 'Changer mot de passe', 'auth.profile.update_fiscal': 'Profil fiscal',
  'auth.profile.update_personal': 'Infos personnelles', 'auth.profile.update_safety_net': 'Matelas sécurité',
}

const MODULE_LABELS = {
  patrimoine: 'Patrimoine', revenus: 'Revenus', expenses: 'Dépenses', debts: 'Dettes',
  possessions: 'Possessions', tools: 'Outils', admin: 'Administration',
  auth: 'Profil', app: 'Application', family: 'Famille', dashboard: 'Tableau de bord',
}

const MODULE_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4',
]

function eventLabel(name) { return EVENT_LABELS[name] ?? name }
function moduleLabel(mod)  { return MODULE_LABELS[mod] ?? mod }

function trendIcon(curr, prev) {
  if (!prev || prev === 0) return null
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (Math.abs(pct) < 5) return <span className="text-gray-400 text-xs">≈</span>
  return pct > 0
    ? <span className="text-green-600 text-xs font-semibold">↑ {pct}%</span>
    : <span className="text-red-500 text-xs font-semibold">↓ {Math.abs(pct)}%</span>
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function fmtNum(n) {
  return n?.toLocaleString('fr-FR') ?? '—'
}

const LEVEL_COLOR = { ERROR: 'text-red-600', WARN: 'text-orange-500', FATAL: 'text-red-800' }
const SOURCE_BADGE = { BACKEND: 'bg-indigo-100 text-indigo-700', FRONTEND: 'bg-orange-100 text-orange-700' }

// ── Onglet Engagement ──────────────────────────────────────

function EventBar({ e, prevMap, max, onTimeline }) {
  const prev = prevMap?.[e.eventName]
  return (
    <li>
      <div className="flex items-center justify-between mb-0.5 gap-1">
        <button
          onClick={() => onTimeline(e.eventName)}
          className="text-xs text-gray-700 hover:text-indigo-600 transition truncate text-left flex-1"
          title={e.eventName}
        >
          {eventLabel(e.eventName)}
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {trendIcon(e.count, prev)}
          <span className="text-xs font-semibold text-gray-500">{fmtNum(e.count)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(e.count / max) * 100}%` }} />
      </div>
    </li>
  )
}

function EngagementTab({ period }) {
  const [summary,       setSummary]       = useState(null)
  const [topFeatures,   setTopFeatures]   = useState([])
  const [topButtons,    setTopButtons]    = useState([])
  const [topPages,      setTopPages]      = useState([])
  const [prevFeatures,  setPrevFeatures]  = useState({})
  const [prevButtons,   setPrevButtons]   = useState({})
  const [prevPages,     setPrevPages]     = useState({})
  const [retention,     setRetention]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [timeline,      setTimeline]      = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [moduleExpand,  setModuleExpand]  = useState({})
  const [search,        setSearch]        = useState('')

  useEffect(() => {
    setLoading(true)
    const p  = periodDates(period)
    const pp = previousPeriodDates(period)
    Promise.all([
      getEngagementSummary(p),
      getTopEvents({ type: 'FEATURE_USE',  ...p,  limit: 20 }),
      getTopEvents({ type: 'BUTTON_CLICK', ...p,  limit: 20 }),
      getTopEvents({ type: 'PAGE_VIEW',    ...p,  limit: 30 }),
      getTopEvents({ type: 'FEATURE_USE',  ...pp, limit: 20 }),
      getTopEvents({ type: 'BUTTON_CLICK', ...pp, limit: 20 }),
      getTopEvents({ type: 'PAGE_VIEW',    ...pp, limit: 30 }),
      getRetention(p),
    ]).then(([sum, feat, btn, pv, pfeat, pbtn, ppv, ret]) => {
      setSummary(sum)
      setTopFeatures(feat)
      setTopButtons(btn)
      setTopPages(pv)
      setPrevFeatures(Object.fromEntries(pfeat.map(e => [e.eventName, e.count])))
      setPrevButtons(Object.fromEntries(pbtn.map(e => [e.eventName, e.count])))
      setPrevPages(Object.fromEntries(ppv.map(e => [e.eventName, e.count])))
      setRetention(ret)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [period])

  function loadTimeline(name) {
    setSelectedEvent(name)
    getTimeline({ name, ...periodDates(period) }).then(setTimeline).catch(() => setTimeline([]))
  }

  // ── Groupement par module ─────────────────────────────────
  function groupByModule(events) {
    const groups = {}
    events.forEach(e => {
      const mod = e.eventName.split('.')[0]
      if (!groups[mod]) groups[mod] = { module: mod, total: 0, items: [] }
      groups[mod].total += e.count
      groups[mod].items.push(e)
    })
    return Object.values(groups).sort((a, b) => b.total - a.total)
  }

  // ── Funnel open_form → action ─────────────────────────────
  function computeFunnel() {
    const allEvents = [...topFeatures, ...topButtons]
    const countMap = Object.fromEntries(allEvents.map(e => [e.eventName, e.count]))
    const funnelPairs = [
      ['patrimoine.position.open_form',          'patrimoine.position.create'],
      ['revenus.salary_contract.open_form',       'revenus.salary_contract.create'],
      ['expenses.recurring.open_form',            'expenses.recurring.create'],
      ['debts.debt.open_form',                    'debts.debt.create'],
      ['possessions.possession.open_form',        'possessions.possession.create'],
    ]
    return funnelPairs
      .filter(([from]) => countMap[from] > 0)
      .map(([from, to]) => {
        const opens   = countMap[from] ?? 0
        const creates = countMap[to]   ?? 0
        return { from, to, opens, creates, rate: opens === 0 ? 0 : Math.round((creates / opens) * 100) }
      })
  }

  // Filtre recherche (sur event_name ET label lisible)
  const q = search.toLowerCase().trim()
  function filtered(list) {
    if (!q) return list
    return list.filter(e => e.eventName.toLowerCase().includes(q) || eventLabel(e.eventName).toLowerCase().includes(q))
  }

  const filteredFeatures = filtered(topFeatures)
  const filteredButtons  = filtered(topButtons)
  const filteredPages    = filtered(topPages)

  const modules = groupByModule(topFeatures)
  const funnel  = computeFunnel()
  const maxFeat = filteredFeatures[0]?.count ?? 1
  const maxBtn  = filteredButtons[0]?.count  ?? 1
  const maxPage = filteredPages[0]?.count    ?? 1

  // Données camembert pages vues
  const pieData = topPages.slice(0, 10).map(e => ({
    name: eventLabel(e.eventName),
    value: e.count,
  }))
  const PIE_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Chargement…</p>

  return (
    <div className="space-y-6">

      {/* ── KPIs globaux ─────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Événements',        value: fmtNum(summary.totalEvents),    color: 'text-indigo-600' },
            { label: 'Sessions uniques',  value: fmtNum(summary.uniqueSessions), color: 'text-teal-600'   },
            { label: 'Events / session',  value: summary.avgEventsPerSession,    color: 'text-amber-600'  },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Barre de recherche ───────────────────────────────── */}
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher un event ou une fonctionnalité…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white shadow-sm"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
        )}
      </div>

      {/* ── Features + Boutons + Pages ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: 'Features les plus utilisées', data: filteredFeatures, max: maxFeat, prevMap: prevFeatures },
          { title: 'Boutons les plus cliqués',    data: filteredButtons,  max: maxBtn,  prevMap: prevButtons  },
          { title: 'Pages les plus vues',         data: filteredPages.slice(0,10), max: maxPage, prevMap: prevPages },
        ].map(({ title, data, max, prevMap }) => (
          <div key={title} className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
            {data.length === 0
              ? <p className="text-xs text-gray-400">{search ? 'Aucun résultat' : 'Aucune donnée'}</p>
              : <ul className="space-y-2">{data.map(e => <EventBar key={e.eventName} e={e} prevMap={prevMap} max={max} onTimeline={loadTimeline} />)}</ul>}
          </div>
        ))}
      </div>

      {/* ── Rétention — sessions actives par jour ────────────── */}
      {retention.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Sessions actives par jour</h3>
              <p className="text-xs text-gray-400 mt-0.5">Sessions uniques (barre) · Events totaux (ligne)</p>
            </div>
            {(() => {
              const avg = Math.round(retention.reduce((s, d) => s + d.sessions, 0) / retention.length * 10) / 10
              return <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-2.5 py-1 rounded-full">Moy. {avg} sessions/jour</span>
            })()}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={retention} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                formatter={(v, n) => [fmtNum(v), n === 'sessions' ? 'Sessions' : 'Events']}
                labelFormatter={l => l}
              />
              <Bar dataKey="sessions" fill="#14b8a6" radius={[3,3,0,0]} name="sessions" />
              <Line type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2} dot={false} name="events" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Camembert pages vues ─────────────────────────────── */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition des pages vues</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ''}
                labelLine={false}
              >
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [fmtNum(v), n]} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-gray-600">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Funnel open_form → create ────────────────────────── */}
      {funnel.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Funnel — Intention → Création</h3>
          <div className="space-y-3">
            {funnel.map(f => (
              <div key={f.from} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4">
                <span className="text-xs text-gray-600 truncate">{eventLabel(f.from).replace('+ ', '')}</span>
                <div className="text-right">
                  <span className="text-xs text-gray-400">{fmtNum(f.opens)} ouvertures</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">→ {fmtNum(f.creates)} créations</span>
                </div>
                <div className="text-right min-w-[52px]">
                  <span className={`text-sm font-bold ${f.rate >= 70 ? 'text-green-600' : f.rate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                    {f.rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Taux de conversion : ouvertures du formulaire → actions créées</p>
        </div>
      )}

      {/* ── Groupement par module ────────────────────────────── */}
      {modules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Actions par module (FEATURE_USE)</h3>
          <div className="space-y-2">
            {modules.map((g, i) => (
              <div key={g.module}>
                <button
                  onClick={() => setModuleExpand(m => ({ ...m, [g.module]: !m[g.module] }))}
                  className="w-full flex items-center gap-3 py-1.5 hover:bg-gray-50 rounded-lg transition px-2"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MODULE_COLORS[i % MODULE_COLORS.length] }} />
                  <span className="text-sm font-medium text-gray-700 flex-1 text-left">{moduleLabel(g.module)}</span>
                  <span className="text-sm font-semibold text-gray-500">{fmtNum(g.total)}</span>
                  <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(g.total / (modules[0]?.total ?? 1)) * 100}%`, background: MODULE_COLORS[i % MODULE_COLORS.length] }} />
                  </div>
                  <span className="text-xs text-gray-400">{moduleExpand[g.module] ? '▲' : '▼'}</span>
                </button>
                {moduleExpand[g.module] && (
                  <ul className="ml-7 mt-1 space-y-1 pb-2">
                    {g.items.map(e => (
                      <li key={e.eventName} className="flex items-center justify-between text-xs text-gray-500 py-0.5">
                        <button onClick={() => loadTimeline(e.eventName)} className="hover:text-indigo-600 transition text-left truncate flex-1">
                          {eventLabel(e.eventName)}
                        </button>
                        <span className="font-semibold ml-2 shrink-0">{fmtNum(e.count)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Timeline de l'event sélectionné ─────────────────── */}
      {selectedEvent && timeline && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Évolution — <span className="text-indigo-600">{eventLabel(selectedEvent)}</span>
            </h3>
            <button onClick={() => { setSelectedEvent(null); setTimeline(null) }} className="text-xs text-gray-400 hover:text-gray-600">✕ fermer</button>
          </div>
          {timeline.length === 0
            ? <p className="text-xs text-gray-400">Pas de données sur cette période</p>
            : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 h-24 min-w-max">
                  {timeline.map(pt => {
                    const maxCount = Math.max(...timeline.map(p => p.count))
                    return (
                      <div key={pt.day} className="flex flex-col items-center gap-0.5">
                        <span className="text-xs text-gray-400">{pt.count}</span>
                        <div className="w-6 bg-indigo-400 rounded-t" style={{ height: `${(pt.count / maxCount) * 72}px` }} title={`${pt.day} : ${pt.count}`} />
                        <span className="text-xs text-gray-400" style={{ writingMode: 'vertical-rl', fontSize: 9 }}>{pt.day?.slice(5)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  )
}

// ── Onglet Parcours ────────────────────────────────────────

function JourneyTab({ initialSessionId }) {
  const [sessionId, setSessionId] = useState(initialSessionId ?? '')
  const [timeline,  setTimeline]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [stats,     setStats]     = useState(null)

  useEffect(() => {
    if (initialSessionId) { setSessionId(initialSessionId); load(initialSessionId) }
  }, [initialSessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  function load(id) {
    const sid = (id ?? sessionId).trim()
    if (!sid) return
    setLoading(true)
    Promise.all([getJourney(sid), getJourneyErrors(sid)])
      .then(([events, errors]) => {
        // Fusion et tri chronologique — on tague chaque item avec son type source
        const merged = [
          ...events.map(e => ({ ...e, _kind: 'event' })),
          ...errors.map(e => ({ ...e, _kind: 'error' })),
        ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        setTimeline(merged)
        setStats({ events: events.length, errors: errors.length })
      })
      .catch(() => setTimeline([]))
      .finally(() => setLoading(false))
  }

  const TYPE_COLOR = {
    PAGE_VIEW:    'bg-blue-100 text-blue-700',
    FEATURE_USE:  'bg-green-100 text-green-700',
    BUTTON_CLICK: 'bg-amber-100 text-amber-700',
    FORM_SUBMIT:  'bg-purple-100 text-purple-700',
  }
  const LEVEL_COLOR = { ERROR: 'text-red-600', WARN: 'text-orange-500', FATAL: 'text-red-800' }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Session ID (UUID)"
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition font-mono"
        />
        <button
          onClick={() => load()}
          disabled={loading || !sessionId.trim()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          Charger
        </button>
      </div>

      {/* KPIs de la session */}
      {stats && (
        <div className="flex gap-3 text-xs">
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium">
            {stats.events} événement{stats.events !== 1 ? 's' : ''}
          </span>
          <span className={`px-2.5 py-1 rounded-full font-medium ${
            stats.errors > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {stats.errors} erreur{stats.errors !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>}

      {timeline && !loading && (
        timeline.length === 0
          ? <p className="text-sm text-gray-400 text-center py-4">Aucun événement pour cette session</p>
          : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Ligne de temps verticale */}
              <div className="divide-y divide-gray-50">
                {timeline.map((item, i) => {
                  const isError = item._kind === 'error'
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 px-5 py-3 ${isError ? 'bg-red-50/60' : ''}`}
                    >
                      {/* Indicateur timeline */}
                      <div className="flex flex-col items-center pt-0.5 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${
                          isError ? 'bg-red-500' : 'bg-indigo-300'
                        }`} />
                        {i < timeline.length - 1 && (
                          <div className={`w-px flex-1 mt-1 min-h-[12px] ${
                            isError ? 'bg-red-200' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pb-1">
                        {/* Ligne principale */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400 shrink-0">{fmtDate(item.createdAt)}</span>

                          {isError ? (
                            <>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 shrink-0">
                                {item.source} {item.level}
                              </span>
                              <span className={`text-xs font-semibold shrink-0 ${LEVEL_COLOR[item.level] ?? 'text-red-600'}`}>
                                {item.errorType}
                              </span>
                              {item.requestMethod && item.requestPath && (
                                <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                                  {item.requestMethod} {item.requestPath}
                                </span>
                              )}
                              {item.httpStatus && (
                                <span className="text-xs font-bold text-red-500 shrink-0">
                                  HTTP {item.httpStatus}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TYPE_COLOR[item.eventType] ?? 'bg-gray-100 text-gray-600'}`}>
                                {item.eventType}
                              </span>
                              <span className="text-sm text-gray-700 font-mono truncate">{item.eventName}</span>
                              {item.page && <span className="text-xs text-gray-400 shrink-0">— {item.page}</span>}
                            </>
                          )}
                        </div>

                        {/* Message d'erreur (si présent) */}
                        {isError && item.message && (
                          <p className="text-xs text-red-600 mt-1 truncate">{item.message}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
      )}
    </div>
  )
}

// ── Modal détail d'une erreur ──────────────────────────────

function CopyButton({ text, title = 'Copier' }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  return (
    <button
      onClick={handleCopy}
      title={title}
      className="shrink-0 text-gray-400 hover:text-indigo-600 transition"
    >
      {copied ? '✓' : '📋'}
    </button>
  )
}

function ErrorDetailModal({ fingerprint, onClose, onViewJourney }) {
  const [occurrences, setOccurrences] = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    getErrorOccurrences(fingerprint, { page: 0, size: 10 })
      .then(data => setOccurrences(data.content ?? []))
      .catch(() => setOccurrences([]))
      .finally(() => setLoading(false))
  }, [fingerprint])

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Détail des occurrences</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading && <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>}
          {!loading && occurrences?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucune occurrence</p>}
          {occurrences?.map((occ, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-2">

              {/* Ligne 1 — date, requête HTTP, statut */}
              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                <span>{fmtDate(occ.createdAt)}</span>
                {occ.requestMethod && (
                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                    {occ.requestMethod} {occ.requestPath}
                  </span>
                )}
                {occ.httpStatus && <span className="font-semibold text-red-500">HTTP {occ.httpStatus}</span>}
              </div>

              {/* Ligne 2 — session ID avec copier + lien parcours */}
              {occ.sessionId && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 shrink-0">Session</span>
                  <span className="font-mono text-gray-600 truncate">{occ.sessionId}</span>
                  <CopyButton text={occ.sessionId} title="Copier le session ID" />
                  {onViewJourney && (
                    <button
                      onClick={() => { onViewJourney(occ.sessionId); onClose() }}
                      className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                    >
                      Voir le parcours →
                    </button>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-700">{occ.message}</p>
              {occ.stackTrace && (
                <pre className="text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                  {occ.stackTrace}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Onglet Santé ───────────────────────────────────────────

function HealthTab({ period, onViewJourney }) {
  const [health,          setHealth]          = useState(null)
  const [errorGroups,     setErrorGroups]     = useState([])
  const [loading,         setLoading]         = useState(true)
  const [selectedFingerprint, setSelectedFingerprint] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const p = periodDates(period)
    Promise.all([
      getHealth(p),
      getErrors(p),
    ]).then(([h, groups]) => {
      setHealth(h)
      setErrorGroups(groups)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [period])

  useEffect(() => { load() }, [load])

  // Badge "Nouvelle erreur" — firstSeen dans les dernières 24h
  const now24h = Date.now() - 24 * 3600 * 1000
  function isNew(g) { return g.firstSeen && new Date(g.firstSeen).getTime() > now24h }
  const newCount = errorGroups.filter(isNew).length

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Chargement…</p>

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Events (période)',  value: fmtNum(health.totalEvents7d),  color: 'text-indigo-600' },
            { label: 'Erreurs (période)', value: fmtNum(health.totalErrors7d),  color: 'text-red-600'    },
            { label: 'Backend',           value: fmtNum(health.backendErrors7d), color: 'text-orange-600' },
            { label: 'Taux d\'erreur',    value: `${health.errorRatePercent} %`, color: health.errorRatePercent > 5 ? 'text-red-600' : 'text-green-600' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Graphique erreurs/jour (BACKEND vs FRONTEND) */}
      {health?.errorTimeline?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Erreurs par jour</h3>
          {(() => {
            // Transformer [{day, source, count}] en [{day, BACKEND, FRONTEND}]
            const byDay = {}
            health.errorTimeline.forEach(({ day, source, count }) => {
              if (!byDay[day]) byDay[day] = { day }
              byDay[day][source] = count
            })
            const chartData = Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day))
            return (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(v, n) => [fmtNum(v), n]} />
                  <Bar dataKey="BACKEND"  fill="#6366f1" radius={[3,3,0,0]} name="Backend"  stackId="a" />
                  <Bar dataKey="FRONTEND" fill="#f59e0b" radius={[3,3,0,0]} name="Frontend" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
      )}

      {/* Tableau des erreurs groupées */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Erreurs groupées par type</h3>
            {newCount > 0 && (
              <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                {newCount} nouvelle{newCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">{errorGroups.length} groupe{errorGroups.length !== 1 ? 's' : ''}</span>
        </div>
        {errorGroups.length === 0
          ? <p className="text-sm text-gray-400 text-center py-8">Aucune erreur sur cette période</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Source</th>
                    <th className="px-3 py-3 font-medium">Niveau</th>
                    <th className="px-3 py-3 font-medium">Occurrences</th>
                    <th className="px-3 py-3 font-medium">Dernier vu</th>
                    <th className="px-3 py-3 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {errorGroups.map(g => (
                    <tr
                      key={g.fingerprint}
                      className="hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => setSelectedFingerprint(g.fingerprint)}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-700 max-w-[200px]">
                        <div className="flex items-center gap-1.5 truncate">
                          {isNew(g) && (
                            <span className="shrink-0 text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded">Nouveau</span>
                          )}
                          <span className="truncate">{g.errorType}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_BADGE[g.source] ?? ''}`}>{g.source}</span>
                      </td>
                      <td className={`px-3 py-3 text-xs font-semibold ${LEVEL_COLOR[g.level] ?? ''}`}>{g.level}</td>
                      <td className="px-3 py-3 font-semibold text-gray-700">{fmtNum(g.count)}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(g.lastSeen)}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 max-w-[250px] truncate">{g.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {selectedFingerprint && (
        <ErrorDetailModal
          fingerprint={selectedFingerprint}
          onClose={() => setSelectedFingerprint(null)}
          onViewJourney={onViewJourney}
        />
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────

const TABS = [
  { id: 'engagement', label: 'Engagement' },
  { id: 'parcours',   label: 'Parcours'   },
  { id: 'sante',      label: 'Santé'      },
]

const PERIODS = [
  { label: '7 jours',  value: 7  },
  { label: '30 jours', value: 30 },
  { label: '90 jours', value: 90 },
]

import { useAnalytics } from '../../hooks/useAnalytics'

export default function AnalyticsPage() {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('admin.analytics') }, [])
  const [tab,              setTab]              = useState('engagement')
  const [period,           setPeriod]           = useState(7)
  const [journeySessionId, setJourneySessionId] = useState(null)

  function handleViewJourney(sessionId) {
    setJourneySessionId(sessionId)
    setTab('parcours')
  }
  const [purging,     setPurging]     = useState(false)
  const [purgeResult, setPurgeResult] = useState(null)
  const [purgeError,  setPurgeError]  = useState(null)
  const [showPurge,   setShowPurge]   = useState(false)
  const [eventsDays,  setEventsDays]  = useState(90)
  const [errorsDays,  setErrorsDays]  = useState(180)
  const [purgeAll,    setPurgeAll]    = useState(false)

  async function handlePurge() {
    setPurging(true)
    setPurgeError(null)
    setPurgeResult(null)
    try {
      // eventsDays=0 / errorsDays=0 → cutoff = now → supprime tout
      const params = purgeAll ? { eventsDays: 0, errorsDays: 0 } : { eventsDays, errorsDays }
      const result = await purgeAnalytics(params)
      setPurgeResult({ ...result, all: purgeAll })
      setShowPurge(false)
    } catch {
      setPurgeError('Erreur lors de la suppression.')
    } finally {
      setPurging(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Usage et santé technique de l'application</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Bouton nettoyage */}
          <button
            onClick={() => { setShowPurge(true); setPurgeResult(null); setPurgeError(null) }}
            className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition font-medium"
          >
            🗑 Nettoyer
          </button>

          {/* Sélecteur période (masqué pour l'onglet Parcours) */}
          {tab !== 'parcours' && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-sm rounded-md transition font-medium ${
                    period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Résultat purge */}
      {purgeResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <span>
            {purgeResult.all
              ? <>Toutes les données supprimées — <strong>{purgeResult.deletedEvents}</strong> événement{purgeResult.deletedEvents !== 1 ? 's' : ''} et <strong>{purgeResult.deletedErrors}</strong> erreur{purgeResult.deletedErrors !== 1 ? 's' : ''}.</>
              : <>Nettoyage terminé — <strong>{purgeResult.deletedEvents}</strong> événement{purgeResult.deletedEvents !== 1 ? 's' : ''} et <strong>{purgeResult.deletedErrors}</strong> erreur{purgeResult.deletedErrors !== 1 ? 's' : ''} supprimés (antérieurs à {purgeResult.olderThanDays} jours).</>
            }
          </span>
          <button onClick={() => setPurgeResult(null)} className="text-green-500 hover:text-green-700 ml-4">✕</button>
        </div>
      )}

      {/* Modal confirmation purge */}
      {showPurge && createPortal(
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPurge(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
            <h3 className="text-base font-semibold text-gray-900">Nettoyer les données analytics</h3>
            <p className="text-sm text-gray-500">
              {purgeAll
                ? 'Toutes les données analytics seront supprimées définitivement.'
                : 'Supprime définitivement les événements et erreurs antérieurs aux seuils choisis.'
              }
              {' '}Cette action est irréversible.
            </p>

            {/* Sélecteurs de rétention — désactivés si "Tout supprimer" */}
            <div className={`grid grid-cols-2 gap-4 transition-opacity ${purgeAll ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Événements — garder les</label>
                <select
                  value={eventsDays}
                  onChange={e => setEventsDays(Number(e.target.value))}
                  disabled={purgeAll}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 transition disabled:bg-gray-50"
                >
                  {[7, 30, 60, 90, 180, 365].map(d => (
                    <option key={d} value={d}>{d} derniers jours</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Erreurs — garder les</label>
                <select
                  value={errorsDays}
                  onChange={e => setErrorsDays(Number(e.target.value))}
                  disabled={purgeAll}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 transition disabled:bg-gray-50"
                >
                  {[30, 60, 90, 180, 365].map(d => (
                    <option key={d} value={d}>{d} derniers jours</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toggle "Tout supprimer" */}
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div
                onClick={() => setPurgeAll(v => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${purgeAll ? 'bg-red-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${purgeAll ? 'translate-x-[18px]' : 'translate-x-1'}`} />
              </div>
              <span className={`text-sm font-medium ${purgeAll ? 'text-red-600' : 'text-gray-600'}`}>
                Tout supprimer <span className="font-normal text-gray-400">(ignorer les seuils)</span>
              </span>
            </label>

            {purgeAll && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <span className="shrink-0">⚠️</span>
                <span>L'intégralité de l'historique analytics sera supprimée. Les graphiques et statistiques seront vides jusqu'à la prochaine activité.</span>
              </div>
            )}

            {purgeError && <p className="text-sm text-red-600">{purgeError}</p>}

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => { setShowPurge(false); setPurgeAll(false) }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handlePurge}
                disabled={purging}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition ${
                  purgeAll ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {purging ? 'Suppression…' : purgeAll ? 'Tout supprimer' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu */}
      {tab === 'engagement' && <EngagementTab period={period} />}
      {tab === 'parcours'   && <JourneyTab initialSessionId={journeySessionId} />}
      {tab === 'sante'      && <HealthTab period={period} onViewJourney={handleViewJourney} />}
    </div>
  )
}
