# Patterns de développement — Frontend

Référence de démarrage rapide pour implémenter un nouveau module frontend.
Tous les exemples sont tirés du code existant et représentent les conventions du projet.

---

## 1. Couche API (`src/api/`)

Un fichier par domaine métier. Une fonction exportée par endpoint.

```js
import axios from 'axios'

// Instance partagée — withCredentials obligatoire pour le cookie JSESSIONID
const api = axios.create({ baseURL: '/', withCredentials: true })

// ── Convention de nommage : verbe + nom entité ─────────────────
export const getMonEntites    = ()          => api.get('/api/mon-entite').then(r => r.data)
export const createMonEntite  = (data)      => api.post('/api/mon-entite', data).then(r => r.data)
export const updateMonEntite  = (id, data)  => api.put(`/api/mon-entite/${id}`, data).then(r => r.data)
export const deleteMonEntite  = (id)        => api.delete(`/api/mon-entite/${id}`)
// Endpoint secondaire (ex : résumé, synthèse)
export const getMonEntiteSummary = ()       => api.get('/api/mon-entite/summary').then(r => r.data)
```

**Règles :**
- Pas de gestion d'erreur dans la couche API — elle remonte au composant appelant
- `delete` ne retourne pas `.then(r => r.data)` (204 No Content)
- Nommage : `get` / `create` / `update` / `delete` + nom PascalCase

---

## 2. Page principale (`src/components/<domaine>/MaPage.jsx`)

```jsx
import { useState, useEffect } from 'react'
import { getMonEntites, createMonEntite, updateMonEntite, deleteMonEntite } from '../../api/monEntite'
import MonEntiteForm from './MonEntiteForm'

export default function MaPage() {
  const [items,      setItems]      = useState([])
  const [formTarget, setFormTarget] = useState(undefined) // undefined = fermé | null = création | objet = édition
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      setItems(await getMonEntites())
    } catch {
      setError('Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateMonEntite(formTarget.id, payload)
      setItems(is => is.map(i => i.id === updated.id ? updated : i))
    } else {
      const created = await createMonEntite(payload)
      setItems(is => [created, ...is])
    }
    setFormTarget(undefined)
  }

  async function handleDelete(item) {
    if (!confirm(`Supprimer « ${item.label} » ?`)) return
    await deleteMonEntite(item.id)
    setItems(is => is.filter(i => i.id !== item.id))
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Titre de la page</h2>
        <button
          onClick={() => setFormTarget(null)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter
        </button>
      </div>

      {/* ── Liste vide ── */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucun élément</p>
          <p className="text-sm">Cliquez sur « + Ajouter » pour commencer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Libellé</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm text-gray-800">{item.label}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {item.amount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setFormTarget(item)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(item)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition">
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal formulaire — toujours en fin de JSX ── */}
      {formTarget !== undefined && (
        <MonEntiteForm
          item={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
```

**Règles :**
- `formTarget` : `undefined` = modal fermée, `null` = création, `objet` = édition
- `fetchAll()` appelé dans `useEffect` au montage
- Pas de state manager global — `useState` local + prop drilling
- Gestion d'erreur par message inline (pas de toast/notification)

---

## 3. Formulaire modal (`src/components/<domaine>/MonEntiteForm.jsx`)

```jsx
import { useState, useEffect } from 'react'

// Constantes CSS réutilisées dans tout le projet
const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

const TYPES = [
  { value: 'VALEUR_A', label: 'Valeur A' },
  { value: 'VALEUR_B', label: 'Valeur B' },
]

// État initial vide — correspond aux champs du formulaire (pas du DTO)
const EMPTY = { type: 'VALEUR_A', label: '', amount: '' }

export default function MonEntiteForm({ item, onSubmit, onCancel }) {
  const isEdit = Boolean(item)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Pré-remplissage en édition
  useEffect(() => {
    setForm(item
      ? { type: item.type, label: item.label, amount: item.amount }
      : EMPTY
    )
  }, [item])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        ...form,
        amount: parseFloat(form.amount),  // conversion String → Float avant envoi
      })
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier' : 'Ajouter'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Type *</label>
            <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Libellé *</label>
            <input name="label" type="text" value={form.label} onChange={handleChange}
              required placeholder="ex : Description" className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Montant (€) *</label>
            <input name="amount" type="number" min="0.01" step="0.01" value={form.amount}
              onChange={handleChange} required placeholder="0.00" className={inputCls} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Règles :**
- `item` en prop : `null` = création, `objet` = édition — `isEdit = Boolean(item)`
- `useEffect([item])` pour le pré-remplissage
- `handleChange` générique — `e.target.name` doit correspondre aux clés de `form`
- Toujours convertir les nombres avant envoi (`parseFloat`, `parseInt`)
- Modal plein écran avec `fixed inset-0 bg-black/40 z-50`

---

## 4. Classes CSS récurrentes

| Usage | Classe(s) |
|-------|-----------|
| Input / select | `w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white` |
| Label champ | `text-sm font-semibold text-gray-700` |
| Bouton primaire | `px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition` |
| Bouton secondaire | `px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition` |
| Bouton action tableau | `px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition` |
| Bouton danger tableau | `px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition` |
| Badge catégorie | `text-xs font-semibold px-2 py-0.5 rounded-full <bg-color> <text-color>` |
| Card blanche | `bg-white rounded-xl shadow-sm p-5` |
| Table wrapper | `bg-white rounded-xl shadow-sm overflow-hidden` |
| En-tête table | `bg-gray-50` + `px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide` |
| Ligne table | `border-t border-gray-100 hover:bg-gray-50 transition` |
| Erreur inline | `text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2` |
| État vide | `bg-white rounded-xl shadow-sm p-12 text-center text-gray-400` |

**Palette principale :**
- Primaire : `indigo-600` (boutons, focus, nav active)
- Fond page : `gray-100`
- Cartes : `white` + `shadow-sm`
- Rôle USER : `bg-violet-100 text-violet-800`
- Danger : `red-500` / `red-600`

---

## 5. Ajout d'une nouvelle page dans la navigation

### `Navigation.jsx` — bouton simple

```jsx
// Dans le <nav>, après le bouton existant le plus proche
<NavBtn page="ma-page" label="Mon module" currentPage={currentPage} onNavigate={onNavigate} onClose={closeAll} />
```

### `Navigation.jsx` — dropdown (si plusieurs sous-pages)

```jsx
<div className="relative">
  <button
    onClick={() => { setMonDropdownOpen(v => !v); /* fermer les autres */ }}
    className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${
      isMonModulePage ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
    }`}
  >
    Mon module <span className="text-xs">{open ? '▲' : '▼'}</span>
  </button>
  {monDropdownOpen && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setMonDropdownOpen(false)} />
      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px] py-1">
        <button onClick={() => { onNavigate('sous-page-1'); setMonDropdownOpen(false) }}
          className={`w-full text-left px-4 py-2 text-sm transition ${
            currentPage === 'sous-page-1' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
          }`}>
          Sous-page 1
        </button>
      </div>
    </>
  )}
</div>
```

### `App.jsx` — routing

```jsx
// 1. Import du composant
import MaPage from './components/mon-module/MaPage'

// 2. Dans le JSX, après les pages existantes
{currentPage === 'ma-page' && <MaPage />}
```

---

## 6. Formatage des valeurs

```js
// Montant monétaire français — toujours 2 décimales
amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })  // → "1 234,56"

// Helper réutilisé dans les pages
function fmt(n) {
  return n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) ?? '—'
}

// Date ISO → affichage français
const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
function formatDate(iso) {
  const [year, month, day] = iso.split('-')
  return `${parseInt(day)} ${MONTHS_FR[parseInt(month) - 1]} ${year}`  // → "5 Avr 2026"
}
```

---

## 7. Analytics — instrumentation systématique

Toute nouvelle page **et** toute nouvelle action métier doivent être instrumentées dans la PR
qui les livre. Référence complète : [`docs/architecture/analytics.md`](../analytics.md).

### Convention de nommage `event_name`

Format hiérarchique strict en **3 segments** séparés par des points :

```
{module}.{feature}.{action}
```

- `module` — grand domaine fonctionnel (`patrimoine`, `revenus`, `tools`, `expenses`, `debts`, `admin`, `auth`, `family`, `app`)
- `feature` — fonctionnalité précise (`position`, `lombard`, `salary_contract`, `recurring`, …)
- `action` — verbe (`view`, `create`, `edit`, `delete`, `simulate`, `submit`, `export`)

Tout en `snake_case`, validation regex côté backend — un event mal formé est rejeté.

### Pattern de référence

```jsx
import { useAnalytics } from '../../hooks/useAnalytics'

export default function MaPage() {
  const { trackPageView, trackEvent } = useAnalytics()

  // 1. Page view au montage — préfixe sur 2 segments (module.feature)
  useEffect(() => { trackPageView('patrimoine.position') }, [])

  // 2. Action métier — event_name complet 3 segments + metadata sans données financières
  async function handleCreate(data) {
    await createPosition(data)
    trackEvent('FEATURE_USE', 'patrimoine.position.create', { category: data.category })
    fetchAll()
  }
}
```

### Whitelist des clés `metadata`

**Interdites :** tout montant, prix, taux, salaire, valeur d'actif, ISIN, ticker, label personnel.

**Autorisées :** `duration_ms`, `result_count`, `filter_used`, `category`, `view_mode`, `contract_type`, `envelope`.

Toute clé hors whitelist est silencieusement ignorée côté backend — pas d'erreur visible, mais
aucune donnée persistée non plus.

### Quand utiliser quel `event_type`

| Type | Quand l'utiliser |
|------|------------------|
| `PAGE_VIEW` | Toujours, dès le montage de la page (méthode `trackPageView`) |
| `FEATURE_USE` | Action métier qui produit un effet (créer, simuler, exporter, sauvegarder) |
| `BUTTON_CLICK` | Clic sur un bouton secondaire qui ne déclenche pas une feature complète (toggle, ouverture de modal) |
| `FORM_SUBMIT` | Soumission de formulaire — préférer `FEATURE_USE` si l'effet métier est central |

---

## 8. Tests frontend (`src/test/components/`)

Les tests s'exécutent avec **Vitest + Testing Library**. Convention : un fichier de test par composant, mock systématique de la couche API et des composants enfants non testés.

### 8.1 Hiérarchie des sélecteurs (priorité descendante)

Cette hiérarchie suit la philosophie Testing Library — privilégier ce que l'utilisateur perçoit (rôles, labels) avant les détails d'implémentation (testid, classes CSS).

| Priorité | Sélecteur | Quand l'utiliser |
|---|---|---|
| 1 | `getByRole('button', { name: ... })` · `getByRole('heading', { name: ... })` | Défaut pour boutons, titres, liens, inputs typés. Aligné sur l'accessibilité. |
| 2 | `getByLabelText(...)` · `getByPlaceholderText(...)` | Inputs et champs de formulaire (préférer le label si présent). |
| 3 | `getByText(...)` | Texte pur **unique et stable** : titre de page, valeur d'un KPI, message d'erreur. |
| 4 | `getByTestId(...)` | Quand 1-3 sont ambigus — typiquement boutons d'action répétés en liste (`Supprimer`, `Modifier`, `+ Ajouter`) ou éléments sans rôle ARIA distinctif. |

**Bannis :**
- `container.querySelector('.classCSS')` — couple le test à Tailwind, casse à chaque refonte de palette. Remplacer par un sélecteur sémantique ou un `data-testid`.
- `getAllByText('label')[N]` indexé — révèle un libellé ambigu non couvert par un testid. Ajouter un `data-testid` au composant prod plutôt que d'indexer.

### 8.2 Convention `data-testid` + `aria-label`

Pour tout **bouton d'action répété** (lignes de tableau, items de liste, en-tête multi-actions), ajouter sur le composant production **les deux attributs en parallèle** :

```jsx
<button
  onClick={...}
  data-testid="add-instrument-button"   // ← cible test stable
  aria-label="Ajouter un instrument"    // ← lecteurs d'écran distinguent les deux boutons "+ Ajouter"
  className="..."
>
  + Ajouter
</button>
```

Convention de nommage `data-testid` : `<entité>-<action>-<élément>` en kebab-case (ex : `add-instrument-button`, `delete-debt-row`, `edit-position-link`).

### 8.3 Mock de la couche API

`vi.mock('../../../api/<domaine>', () => ({...}))` **remplace tout le module** — toute fonction non listée devient `undefined` et plante au runtime (souvent silencieusement dans un `catch` global). Lister **toutes** les fonctions importées par le composant testé, même celles non appelées dans le scénario, en les initialisant avec `vi.fn()`.

```jsx
vi.mock('../../../api/patrimoine', () => ({
  getInstruments:                vi.fn(),
  getExchangeRates:              vi.fn().mockResolvedValue([]),  // si appelée au montage
  // ... toutes les autres fonctions importées par le composant
}))
```

### 8.4 Mock des composants enfants

Mocker les sous-composants non testés (formulaires modaux, modales, charts complexes) avec un `data-testid` pour pouvoir vérifier leur ouverture/fermeture sans tester leur contenu :

```jsx
vi.mock('../../../components/admin/AdminInstrumentForm', () => ({
  default: ({ onCancel }) => (
    <div data-testid="instrument-form">
      <button onClick={onCancel}>Annuler form</button>
    </div>
  ),
}))
```

### 8.5 Checklist tests frontend

- [ ] Un fichier de test par composant graphique (`src/test/components/<domaine>/<Composant>.test.jsx`)
- [ ] Mock complet de la couche API (toutes les fonctions importées par le composant)
- [ ] Mock des composants enfants non testés avec `data-testid`
- [ ] Sélecteurs respectent la hiérarchie (Role > Label > Text > TestId), pas de `container.querySelector`, pas de `getAllByText[N]` indexé
- [ ] Pour chaque bouton d'action répété ajouté en prod : `data-testid` + `aria-label` distincts
- [ ] `npm test` retourne 0 échec et 0 unhandled rejection avant commit

---

## 9. Checklist ajout d'un nouveau module

- [ ] `src/api/<domaine>.js` — couche API
- [ ] `src/components/<domaine>/MaPage.jsx` — page principale
- [ ] `src/components/<domaine>/MonForm.jsx` — formulaire modal
- [ ] Import + route dans `App.jsx`
- [ ] Bouton ou dropdown dans `Navigation.jsx`
- [ ] **Tests** — `src/test/components/<domaine>/MaPage.test.jsx` (cf. section 8 pour la convention sélecteurs)
- [ ] **Analytics** — `trackPageView('<module>.<feature>')` au montage de la page
- [ ] **Analytics** — `trackEvent('FEATURE_USE', '<module>.<feature>.<action>')` sur chaque action métier (CRUD, simulation, export)
- [ ] **Analytics** — `trackEvent('BUTTON_CLICK', '<module>.<feature>.<action>')` sur chaque bouton secondaire (ouverture de modal, toggle, navigation)
- [ ] **Analytics** — `trackEvent('FORM_SUBMIT', '<module>.<feature>.<action>')` sur les soumissions de formulaire profil / paramètres
- [ ] **Analytics** — vérifier que les `metadata` ne contiennent aucune donnée financière (whitelist)
- [ ] `isMonModulePage` dans `Navigation.jsx` si bouton actif requis

### Analytics — ajout d'une fonctionnalité sur un module existant

Même règle, même obligation. Chaque action utilisateur doit être instrumentée :

| Cas | Type d'événement |
|-----|-----------------|
| Nouvelle action métier (créer, supprimer, valider) | `FEATURE_USE` |
| Nouveau bouton ouvrant un modal ou un panel | `BUTTON_CLICK` |
| Nouveau formulaire soumis | `FORM_SUBMIT` |
| Nouvelle sous-page / onglet | `PAGE_VIEW` |

> **Règle non négociable** : une fonctionnalité sans événement analytics est considérée comme incomplète, au même titre qu'une fonctionnalité sans test.
