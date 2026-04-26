# Plan de refactoring frontend — Lisibilité et maintenabilité

Audit réalisé le 2026-04-26 sur le code React (`frontend/src/`).  
Score initial : **6/10** — ~1 000 lignes dupliquées, 7 abstractions manquantes, 11 composants > 300 lignes.

---

## Statut global

| Phase | État | Description |
|-------|------|-------------|
| Phase 0 | ✅ Terminée | 492 tests Vitest — utils, formulaires, panels, pages CRUD, graphiques, infrastructure |
| Phase 1 | ✅ Terminée | Quick wins — ~250 LOC supprimées, 0 régression, 492 tests verts |
| Phase 2 | ✅ Terminée | useCrud (TDD) + migrations PossessionPage/OtherIncomePage/DettePage + PatrimoinePage découpée |
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

### 5. Pattern CRUD — ✅ partiellement résolu (Phase 2)

~~Structure identique dans 11 pages~~ → `useCrud` migré sur PossessionPage, OtherIncomePage, DettePage.  
Reste : RecurringExpensePage (budgets parallèles trop complexes), SalaryContractPage (architecture onglets + `selected`), AdminFamilyGroupPage.

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
| `PatrimoinePage.jsx` | ~~716~~ → 663 | `PatrimoineActionBar` + `PatrimoineFilters` extraits (Phase 2) |
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

## Phase 2 — Hooks et découpage ✅ Terminée

**Réalisé le 2026-04-26.** Gain réel : **-143 LOC** sur les pages, 504/504 tests verts, 0 régression. `FormInput` et `useAsyncForm` évalués et non retenus (complexité > gain sur ce projet).

### 2.1 `src/hooks/useCrud.js` ✅

- [x] Tests TDD écrits en premier (12 tests)
- [x] Hook implémenté : `fetchAll` en closure, `fetchAllRef` anti-stale-closure, `refresh` exposé
- [x] Migré : OtherIncomePage (-17 LOC), PossessionPage (-22 LOC), DettePage (-51 LOC)
- Non migré : RecurringExpensePage (budgets parallèles), SalaryContractPage (onglets + sous-ressources) — trop spécialisés

### 2.2 `FormInput` et `useAsyncForm` — non retenus

Gain théorique disproportionné par rapport à la complexité ajoutée pour un projet mono-développeur. Formulaires déjà lisibles post-Phase 1.

### 2.3 Découpage `PatrimoinePage.jsx` (716 → 663 lignes) ✅

- [x] `PatrimoineActionBar` extrait (titre + boutons admin + Stratégie + Ajouter)
- [x] `PatrimoineFilters` extrait (filtres catégorie + checkbox fermées + toggle vue)
- Section Synthèse (190 lignes, 20+ variables calculées) conservée — extraction nécessiterait un hook dédié (Phase 3)

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
| `src/hooks/useCrud.js` | Hook | PossessionPage, OtherIncomePage, DettePage | ✅ Phase 2 |
| `src/components/patrimoine/PatrimoineActionBar.jsx` | Composant | PatrimoinePage | ✅ Phase 2 |
| `src/components/patrimoine/PatrimoineFilters.jsx` | Composant | PatrimoinePage | ✅ Phase 2 |
| `src/components/common/FormInput.jsx` | Composant | — | ❌ Non retenu |
| `src/hooks/useAsyncForm.js` | Hook | — | ❌ Non retenu |
