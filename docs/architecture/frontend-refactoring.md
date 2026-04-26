# Plan de refactoring frontend — Lisibilité et maintenabilité

Audit réalisé le 2026-04-26 sur le code React (`frontend/src/`).  
Score initial : **6/10** — ~1 000 lignes dupliquées, 7 abstractions manquantes, 11 composants > 300 lignes.

---

## Statut global

| Phase | État | Description |
|-------|------|-------------|
| Phase 0 | ✅ Terminée | 492 tests Vitest — utils, formulaires, panels, pages CRUD, graphiques, infrastructure |
| Phase 1 | ✅ Terminée | Quick wins — ~250 LOC supprimées, 0 régression, 492 tests verts |
| Phase 2 | 🔲 À faire | Hooks réutilisables + pages volumineuses |
| Phase 3 | 🔲 Optionnel | Architecture avancée |

---

## Contexte — Duplications identifiées

### 1. Styles de formulaires — ✅ résolu (Phase 1)

~~39 occurrences dans 20+ fichiers~~ → centralisé dans `src/components/common/formStyles.js`

### 2. `MONTHS_FR` — ✅ résolu (Phase 1)

~~9 fichiers avec 2 formats incohérents~~ → `MONTHS_FR_SHORT` / `MONTHS_FR_LONG` dans `src/utils/constants.js`

### 3. Fonctions de formatage — ✅ résolu (Phase 1)

~~Redéfinies dans 10+ pages~~ → `fmt`, `fmtPct`, `formatDate` dans `src/utils/formatting.js`

### 4. Composant `KpiCard` — ✅ résolu (Phase 1)

~~3 versions locales~~ → `src/components/common/KpiCard.jsx` (label, value, unit, color, sub, labelTooltip)

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

### 6. `confirm()` natif — ✅ partiellement résolu (Phase 1)

~~16 occurrences~~ → `DeleteConfirmModal` branché sur OtherIncomePage, PossessionPage, RecurringExpensePage.  
Reste : panels (BonusPanel, BenefitPanel, OnCallPanel, RevisionPanel, PaySlipPanel), AdminFamilyGroupPage — à traiter en Phase 2 avec `useCrud`.

### 7. Métadonnées de catégories — 4 objets similaires non mutualisés

`CATEGORY_META`, `TYPE_META`, `TYPE_LABELS` redéfinis dans chaque page (non traité en Phase 1 — à évaluer).

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

## Phase 1 — Quick wins ✅ Terminée

**Réalisé le 2026-04-26.** Gain réel : **~250 LOC supprimées**, 492/492 tests verts, 0 régression.

### 1.1 `src/utils/formatting.js` ✅

- [x] `fmt`, `fmtPct`, `formatDate` centralisés
- [x] Remplacer les redéfinitions locales (DettePage, PossessionPage, RecurringExpensePage, OtherIncomePage, DebtForm…)

### 1.2 `src/utils/constants.js` ✅

- [x] `MONTHS_FR_SHORT` / `MONTHS_FR_LONG` — remplacent les 10 définitions locales
- [x] `CATEGORY_META` non mutualisé (chaque page a des couleurs/icônes spécifiques — complexité > gain)

### 1.3 `src/components/common/formStyles.js` ✅

- [x] `inputCls`, `labelCls` — remplacent les 17 définitions identiques
- [x] 16 formulaires migrés (4 variantes avec padding/bg différents conservées localement)

### 1.4 `src/components/common/KpiCard.jsx` ✅

- [x] Composant générique créé (label, value, unit, color, sub, labelTooltip)
- [x] `SavingsCard` (RecurringExpensePage), `KpiCard` (PossessionPage, DettePage) remplacés
- [x] Tooltip élargi à `w-80` pour les breakdowns fiscaux

### 1.5 `DeleteConfirmModal` ✅ partiel

- [x] OtherIncomePage, PossessionPage, RecurringExpensePage migrées
- [ ] Panels (BonusPanel, BenefitPanel, OnCallPanel, RevisionPanel, PaySlipPanel) — à traiter en Phase 2 via `useCrud`
- [ ] AdminFamilyGroupPage — à traiter en Phase 2

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

## Abstractions — récapitulatif

| Fichier | Type | Bénéficiaires | État |
|---------|------|---------------|------|
| `src/utils/formatting.js` | Utils | 10+ pages | ✅ Phase 1 |
| `src/utils/constants.js` | Utils | 9+ fichiers | ✅ Phase 1 |
| `src/components/common/formStyles.js` | Styles | 20+ formulaires | ✅ Phase 1 |
| `src/components/common/KpiCard.jsx` | Composant | 4+ pages | ✅ Phase 1 |
| `src/components/common/FormInput.jsx` | Composant | 20+ formulaires | 🔲 Phase 2 |
| `src/hooks/useCrud.js` | Hook | **11 pages** | 🔲 Phase 2 |
| `src/hooks/useAsyncForm.js` | Hook | 20+ formulaires | 🔲 Phase 2 |
