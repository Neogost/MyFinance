# Tests unitaires frontend — Référence

Stack : **Vitest 3** + **React Testing Library 16** + **jsdom**

---

## Configuration

| Fichier | Rôle |
|---------|------|
| `frontend/vite.config.js` | Bloc `test: { globals, environment: jsdom, setupFiles }` |
| `frontend/src/test/setup.js` | `@testing-library/jest-dom` + `React` global |

Commandes :
```bash
npm test            # run once
npm run test:watch  # watch mode
npm run test:coverage
```

---

## Couverture actuelle

### ✅ Couvert

| Fichier de test | Tests | Ce qui est vérifié |
|-----------------|-------|--------------------|
| `utils/formatting.test.js` | 38 | `fmt`, `formatDate`, `fmtPct` locaux + centralisés |
| `utils/safetyNet.test.js` | 15 | `computeSafetyNetTarget` — 3 modes (FIXED, MONTHS_EXPENSES, MONTHS_SALARY), cas null |
| `utils/loanSimulatorUtils.test.js` | 32 | `fmt`, `computeNotaryFees`, `computeMonthlyPayment`, `buildAmortizationTable`, `computeTAEG` |
| `utils/crisisScenarios.test.js` | 11 | Structure SCENARIOS, CATEGORY_ORDER, CATEGORY_LABELS, drawdowns ≤ 0 |
| `common/DeleteConfirmModal` | 13 | Rendu, interactions, état loading |
| `common/KpiCard` | 13 | Pattern commun — label, valeur, null, couleur, sous-texte |
| `income/OtherIncomePage` | 15 | CRUD + optimistic update + filtrage |
| `income/SalaryContractPage` | 18 | Chargement, formulaires création/édition, panels, delete confirm |
| `income/SalaryContractForm` | 15 | Statut cadre, prévoyance, prefill, submit payload, erreur 409 |
| `income/OtherIncomeForm` | 9 | Champs fiscaux conditionnels (isTaxable, specificTaxRate), submit |
| `expenses/RecurringExpensePage` | 15 | 3 APIs parallèles + delete optimiste + budgets |
| `expenses/RecurringExpenseForm` | 12 | Aperçu projection, colocation sharePercentage, submit payload |
| `possessions/PossessionPage` | 14 | CRUD + refetch complet + confirm() |
| `debts/DettePage` | 14 | CRUD + DeleteConfirmModal + accordéon |
| `debts/DebtForm` | 21 | Rendu, prefill, override, submit, `computeProjectedBalance` |
| `tools/TaxSimulatorPage` | 11 | Source salariale, revenus cochés, simulation, résultat, erreur |
| `dashboard/SafetyNetWidget` | 7 | 3 modes, calcul LIVRET+LIQUIDITE |
| `dashboard/PatrimoineScoreWidget` | 8 | Loading, erreur, score, axes, conseil |
| `dashboard/DetteWidget` | 9 | Null sans dettes, KPIs, progression |
| `dashboard/FireProjectionWidget` | 6 | Loading, vide, données FIRE |
| `patrimoine/PositionForm` | 16 | Wizard 2 étapes, 6 catégories, InstrumentSearch |
| `LoginForm` | 14 | Submit, brute-force countdown (429), bascule register, retour accueil |
| `RegistrationForm` | 11 | Validation complexité mdp, confirmation, submit, 409 |
| `ErrorBoundary` | 6 | Capture erreur JS, rendu fallback, réinitialisation |
| `ErrorPage` | 18 | Rendu conditionnel par famille HTTP (3xx/4xx/5xx), callbacks |
| `dashboard/PatrimoineEvolutionChart` | 4 | Loading, erreur, point live sans snapshot, boutons mode |
| `dashboard/SalaryCharts` | 8 | SalaryEvolutionChart + SalaryAnnualBarChart — loading, erreur, vide, données |
| `dashboard/PortfolioCharts` | 11 | PatrimoineByCategoryChart, CapitalGainsByCategoryChart, PatrimoineByCurrencyChart, PatrimoineByEnvelopeChart, PatrimoineByMemberChart — via props, vide, données |
| `dashboard/ExpensesPassifsCharts` | 9 | ExpensesByCategoryChart + PassifsByCategoryChart — loading, erreur, vide, données, capacité d'épargne |
| `dashboard/StrategyExposureCharts` | 12 | PatrimoineStrategyRadarChart, GeographicExposureWidget, SectorExposureWidget — loading, erreur, vide, données |

**Total : 404 tests — 30 fichiers**

---

### ⏭ Couverture complète atteinte

> Tous les composants graphiques sont couverts. Seuls les tests E2E (App.jsx, Navigation) et les mocks SVG restent hors périmètre.

### Notes sur les graphiques Recharts

> jsdom ne simule pas SVG/Canvas. Les assertions portent sur les états loading/vide/données via le DOM non-SVG (labels de légende, boutons de toggle, messages d'état).

### ⏭ Hors périmètre (explicitement exclus)

| Catégorie | Raison |
|-----------|--------|
| `api/*.js` | Wrappers Axios fins — couverts via les mocks dans les composants. Tests d'intégration (MSW) si besoin |
| `App.jsx` | Routage global — difficile unitairement, relève des tests E2E |
| `Navigation.jsx` | Dépend fortement du routing App — même raison |
| Composants admin (CRUD instruments, snapshots, famille) | Même pattern que les pages couvertes — priorité basse |
| Modales simples (ExchangeRateUpdateModal, ValueEditModals…) | Logique triviale, couverte indirectement par les pages |

---

## Conventions

- Mocks API via `vi.mock('../../../api/...')` — chemins résolus depuis le fichier de test
- Formulaires enfants mockés avec `data-testid` pour isoler la page parente
- `fireEvent` pour les interactions synchrones, `waitFor` / `findBy*` pour les async
- Fixtures avec tous les champs DTO (pas seulement les champs entity) — voir `PossessionPage.test.jsx` comme exemple
- `window.confirm = vi.fn(() => true)` dans `beforeEach` pour les pages qui utilisent `confirm()` natif
- `vi.clearAllMocks()` systématique dans `beforeEach`

## Pièges connus

| Problème | Cause | Solution |
|----------|-------|----------|
| `waitFor` gèle | `vi.useFakeTimers()` globaux — `waitFor` utilise `setTimeout` en interne | Ne pas utiliser `vi.useFakeTimers()` dans les tests async |
| Submit form non déclenché | Champs `required` vides + jsdom applique la validation HTML5 sur click d'un bouton `type="submit"` | Utiliser `fireEvent.submit(document.querySelector('form'))` ou remplir les champs requis |
| Placeholder non trouvé | L'attribut `placeholder` exact est requis (pas de regex partielle) | Lire le composant source pour l'attribut exact (`'ex : Loyer Paris 11e'` et non `/Description/i`) |
| Multiple texte correspondant | `getByText` échoue si plusieurs éléments matchent | Utiliser le texte exact ou `getAllByText()[0]` / `getByRole` avec contrainte supplémentaire |
| ErrorBoundary retry re-throws | Après reset, les enfants originaux re-throwent immédiatement | Utiliser un flag mutable local `let shouldThrow = true` mis à `false` avant le clic retry |
| Mock ordering (delete) | `getSalaryContracts.mockResolvedValue([])` avant render écrase la fixture de départ | Placer les mocks post-action après le `await waitFor` initial, pas avant le render |
