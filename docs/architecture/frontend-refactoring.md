# Plan de refactoring frontend — Lisibilité et maintenabilité

Audit réalisé le 2026-04-26 sur le code React (`frontend/src/`).  
Score initial : **6/10** — ~1 000 lignes dupliquées, 7 abstractions manquantes, 11 composants > 300 lignes.

---

## Statut global

| Phase | État | Description |
|-------|------|-------------|
| Phase 0 | ✅ Terminée | 492 tests Vitest — utils, formulaires, panels, pages CRUD, graphiques, infrastructure |
| Phase 1 | 🔲 À faire | Quick wins — utils, constantes, composants communs |
| Phase 2 | 🔲 À faire | Hooks réutilisables + pages volumineuses |
| Phase 3 | 🔲 Optionnel | Architecture avancée |

---

## Contexte — Duplications identifiées

### 1. Styles de formulaires — 39 occurrences dans 20+ fichiers

```js
// Copié-collé dans SalaryContractForm, BonusForm, BenefitForm, DebtForm, PossessionForm…
const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'
```

### 2. `MONTHS_FR` — 9 fichiers avec 2 formats incohérents

```js
// Format court — DettePage, OtherIncomePage, PaySlipPanel, BonusPanel…
['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

// Format long — BonusForm uniquement
['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
```

### 3. Fonctions de formatage — redéfinies dans 10+ pages

`patrimoine/utils.jsx` contient une version centralisée mais personne ne l'importe.

```js
// Redéfinie dans RecurringExpensePage, PossessionPage, DettePage, OtherIncomePage…
function fmt(n) { return n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) ?? '—' }
function formatDate(iso) { ... }
function fmtPct(n) { ... }
```

### 4. Composant `KpiCard` — 3 versions quasi-identiques

| Fichier | Nom local | Props |
|---------|-----------|-------|
| `RecurringExpensePage.jsx` | `SavingsCard` | label, value, sub, color, unit, labelTooltip |
| `PossessionPage.jsx` | `KpiCard` | label, value, unit, color, sub |
| `DettePage.jsx` | `KpiCard` | label, value, unit, color, sub |

### 5. Pattern CRUD — ~100 lignes × 11 pages

Structure identique dans SalaryContractPage, OtherIncomePage, RecurringExpensePage, PossessionPage, DettePage, AdminFamilyGroupPage…

```js
const [items, setItems] = useState([])
const [formTarget, setFormTarget] = useState(undefined)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => { fetchAll() }, [])

async function fetchAll() { try { setLoading(true); ... } catch { setError(...) } finally { setLoading(false) } }
async function handleSubmit(payload) { if (formTarget?.id) { /* update */ } else { /* create */ } }
async function handleDelete(item) { if (!confirm(`Supprimer « ${item.label} » ?`)) return; ... }
```

### 6. `confirm()` natif — 16 occurrences

`DeleteConfirmModal.jsx` existe dans `common/` mais n'est utilisé que dans DettePage.

### 7. Métadonnées de catégories — 4 objets similaires non mutualisés

`CATEGORY_META`, `TYPE_META`, `TYPE_LABELS` redéfinis dans chaque page.

---

## Composants trop larges

| Fichier | Lignes | Responsabilités mélangées |
|---------|--------|--------------------------|
| `LoanSimulatorPage.jsx` | 1 410 | Saisie + calcul + affichage + amortissement + export |
| `CompoundInterestSimulatorPage.jsx` | 993 | Modes standard/inversé + graphiques |
| `CrisisSimulatorPage.jsx` | 760 | Scénarios multiples + calculs + UI |
| `PatrimoinePage.jsx` | 716 | Positions + snapshots + modales + stratégie |
| `PatrimoineDeclarationPage.jsx` | 533 | Synthèse + 5 sections + agrégation |
| `PositionForm.jsx` | 542 | Wizard 6 catégories + création instrument à la volée |

---

## Phase 0 — Tests unitaires frontend (filet de sécurité)

> **À réaliser avant toute modification de code.**  
> Objectif : couvrir les composants et la logique qui seront touchés par le refacto.

**Stack recommandée :** Vitest + React Testing Library (natif Vite, cohérent avec le projet)

### Priorités de tests avant refacto

| Cible | Type | Pourquoi tester avant |
|-------|------|----------------------|
| `fmt`, `formatDate`, `fmtPct` (locaux) | Unit | Vérifier le comportement avant centralisation |
| `KpiCard` (les 3 versions) | Composant | Valider l'API de props avant fusion |
| Pattern CRUD dans OtherIncomePage | Intégration | Valider fetch/submit/delete avant extraction en hook |
| `DeleteConfirmModal` | Composant | Valider les cas confirm/cancel avant généralisation |
| `PositionForm` step 1 → step 2 | Composant | Protéger le wizard avant découpage |
| `useCrud` (hook à créer) | Hook | TDD : écrire les tests d'abord |

### Fichiers à créer (Phase 0)

```
frontend/src/
├── test/
│   ├── setup.js
│   ├── utils/
│   │   └── formatting.test.js        ← tester fmt, fmtPct, formatDate
│   └── components/
│       ├── common/
│       │   ├── KpiCard.test.jsx
│       │   └── DeleteConfirmModal.test.jsx
│       ├── income/
│       │   └── OtherIncomePage.test.jsx
│       └── patrimoine/
│           └── PositionForm.test.jsx
```

---

## Phase 1 — Quick wins (1 journée)

**Prérequis :** Phase 0 terminée.

### 1.1 `src/utils/formatting.js` — centraliser les fonctions de formatage

- [ ] Déplacer `fmt`, `fmtCompact`, `fmtPct`, `formatDate` depuis `patrimoine/utils.jsx`
- [ ] Exporter `MONTHS_FR_SHORT` et `MONTHS_FR_LONG` depuis `src/utils/constants.js`
- [ ] Remplacer les 10+ redéfinitions locales par l'import centralisé
- **Gain estimé :** -150 LOC

### 1.2 `src/utils/constants.js` — constantes partagées

- [ ] Centraliser `MONTHS_FR_SHORT` / `MONTHS_FR_LONG`
- [ ] Centraliser `CATEGORY_META`, `TYPE_META`, `TYPE_LABELS` (avec labelisation commune)
- **Gain estimé :** -80 LOC, cohérence des formats

### 1.3 `src/components/common/formStyles.js` — styles de formulaires

- [ ] Créer et exporter `inputCls`, `labelCls`, `selectCls`, `textareaCls`
- [ ] Remplacer les définitions locales dans les 20+ formulaires
- **Gain estimé :** -100 LOC

### 1.4 `src/components/common/KpiCard.jsx` — composant unique

```jsx
export default function KpiCard({ label, value, unit = '€', color, sub, tooltip }) { ... }
```

- [ ] Créer le composant générique
- [ ] Remplacer `SavingsCard` (RecurringExpensePage), `KpiCard` (PossessionPage, DettePage)
- **Gain estimé :** -60 LOC

### 1.5 `DeleteConfirmModal` — généraliser sur les 16 `confirm()`

- [ ] Brancher `DeleteConfirmModal` dans OtherIncomePage, PossessionPage, RecurringExpensePage
- [ ] Brancher dans PositionCard, AdminInstrumentPage, AdminFamilyGroupPage
- **Gain estimé :** UX uniforme, suppression des `confirm()` natifs

---

## Phase 2 — Hooks et découpage (2–3 jours)

**Prérequis :** Phase 1 terminée.

### 2.1 `src/hooks/useCrud.js` — hook CRUD générique

```js
// Signature
export function useCrud({ getAll, create, update, remove }) {
  // Retourne : { items, formTarget, setFormTarget, loading, error, handleSubmit, handleDelete, refresh }
}
```

- [ ] Écrire les tests du hook (TDD)
- [ ] Implémenter le hook
- [ ] Migrer : OtherIncomePage, RecurringExpensePage, PossessionPage
- [ ] Migrer : DettePage, SalaryContractPage, AdminFamilyGroupPage
- **Gain estimé :** **-800 LOC** (80 lignes × 10 pages)

### 2.2 `src/components/common/FormInput.jsx`

```jsx
export default function FormInput({ label, name, type = 'text', value, onChange, placeholder, required, min, step, tooltip }) { ... }
```

- [ ] Créer le composant
- [ ] Migrer les formulaires principaux (OtherIncomeForm, RecurringExpenseForm, PossessionForm, DebtForm)
- **Gain estimé :** -150 LOC

### 2.3 `src/hooks/useAsyncForm.js` — boilerplate formulaires

```js
export function useAsyncForm(initialState, onSubmit) {
  // Retourne : { form, setForm, error, loading, handleChange, handleSubmit, reset }
}
```

- [ ] Implémenter
- [ ] Migrer les formulaires à fort boilerplate
- **Gain estimé :** -400 LOC

### 2.4 Refactoriser `PatrimoinePage.jsx` (716 → ~400 lignes)

- [ ] Extraire `<PositionFilters />` (filtres + toggles de vue)
- [ ] Extraire `<PatrimoineHeader />` (statistiques globales + YTD)
- [ ] Extraire `<SnapshotHistory />` (tableau + déclenchement)
- [ ] Extraire `<StrategyObjectives />` (radar + modale stratégie)
- **Gain estimé :** Meilleure testabilité, 4 responsabilités séparées

---

## Phase 3 — Architecture avancée (optionnel)

**Prérequis :** Phase 2 terminée. À décider selon les besoins.

### 3.1 Refactoriser `LoanSimulatorPage.jsx` (1 410 → ~600 lignes)

- [ ] Extraire `<LoanResultSummary />`
- [ ] Extraire `<AmortizationChart />`
- [ ] Extraire hook `useLoanCalculations()` pour la logique pure
- `AmortizationTable.jsx` existe déjà — consolider

### 3.2 `src/hooks/useFetch.js` — couche réseau avancée

- [ ] Cache côté client, retry automatique, état global des erreurs réseau

### 3.3 Tests unitaires frontend — couverture complète

- [ ] Composants communs (KpiCard, FormInput, DeleteConfirmModal)
- [ ] Hooks (useCrud, useAsyncForm)
- [ ] Pages principales (OtherIncomePage, RecurringExpensePage)

---

## Abstractions à créer — récapitulatif

| Fichier à créer | Type | Bénéficiaires | Priorité |
|----------------|------|---------------|----------|
| `src/utils/formatting.js` | Utils | 10+ pages | Phase 1 |
| `src/utils/constants.js` | Utils | 9+ fichiers | Phase 1 |
| `src/components/common/formStyles.js` | Styles | 20+ formulaires | Phase 1 |
| `src/components/common/KpiCard.jsx` | Composant | 4+ pages | Phase 1 |
| `src/components/common/FormInput.jsx` | Composant | 20+ formulaires | Phase 2 |
| `src/hooks/useCrud.js` | Hook | **11 pages** | Phase 2 |
| `src/hooks/useAsyncForm.js` | Hook | 20+ formulaires | Phase 2 |
