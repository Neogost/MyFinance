# Audit responsive mobile — Plan de mise en conformité

> Audit réalisé le 2026-04-29. Cette page capitalise les lacunes identifiées et le plan d'action pour aligner l'ensemble de l'application sur les patterns mobile établis dans `frontend/src/components/` et résumés dans la mémoire `feedback_mobile_patterns.md`.

## Référentiel — Patterns à respecter

| Domaine | Règle |
|---|---|
| **Modals / formulaires** | `flex items-end sm:items-center` + `rounded-t-2xl sm:rounded-xl` + `max-h-[90vh] overflow-y-auto` |
| **z-index** | Bottom nav = `z-50` · Modals/drawers = **`z-60`** (strict) · Dropdowns dans modal = `z-10` |
| **Tableaux** | Pas de `<colgroup>` à largeur fixe · Wrapper `overflow-x-auto` · Colonnes secondaires `hidden md:table-cell` · Libellés `truncate max-w-[10ch] md:max-w-none` |
| **Grilles** | Toujours `grid-cols-1 md:grid-cols-N` (jamais `grid-cols-N` sec) |
| **Flex** | `flex-col md:flex-row` pour sections info + actions |
| **Padding** | `p-4 md:p-8` |
| **Montants** | `<Amount value={x} />` (sauf PRU et taux) |

---

## Fonctionnalités volontairement desktop-only

> Inventaire complet et règle de décision documentés dans **[ADR-004 — section 8](docs/architecture/decisions/ADR-004-responsive-mobile.md#8-fonctionnalités-volontairement-desktop-only)**.

Les modals associées (`InstrumentPriceUpdateModal`, `ExchangeRateUpdateModal`, `SnapshotPanel`) ne nécessitent pas le pattern bottom drawer — leurs déclencheurs sont masqués sur mobile (`hidden md:inline-flex` dans `PatrimoineActionBar.jsx`). Le fix `z-60` y est conservé à titre défensif.

---

## Bases déjà saines

- ✅ Viewport meta correct (`frontend/index.html`)
- ✅ `<main>` global avec `overflow-x-hidden` et padding `pb-24 md:pb-8` pour la bottom nav (`App.jsx:193`)
- ✅ Bottom nav avec `safe-area-inset-bottom` (`Navigation.jsx:289`)
- ✅ Header sticky `z-50` + drawer mobile du menu conforme (`Navigation.jsx:320-322`)
- ✅ Pages métier (dashboard, patrimoine, dépenses, dettes, possessions, revenus) utilisent majoritairement `grid-cols-1 md:grid-cols-N`
- ✅ Formulaires métier respectent le bottom drawer pattern

---

## Lacunes par criticité

### 🔴 CRITIQUE — Bloquantes pour l'usage mobile

#### C1. Collision z-index modals ↔ bottom nav
Modals utilisant `z-50` (même niveau que la bottom nav) — la nav peut recouvrir le bouton de fermeture / actions.

| Fichier | Ligne | Action |
|---|---|---|
| `components/common/DeleteConfirmModal.jsx` | 3 | `z-50` → `z-60` |
| `components/patrimoine/InstrumentPriceUpdateModal.jsx` | 102 | `z-50` → `z-60` |
| `components/patrimoine/ValueEditModals.jsx` | 14, 48 | `z-50` → `z-60` (× 2) |
| `components/dashboard/DashboardCustomizePanel.jsx` | 60, 65 | `z-40/z-50` → `z-60` |

> **Exclusions intentionnelles** : `InstrumentPriceUpdateModal`, `ExchangeRateUpdateModal`, `SnapshotPanel` — leurs boutons déclencheurs sont masqués sur mobile (`hidden md:inline-flex` dans `PatrimoineActionBar.jsx`) car ces features sont trop complexes pour un usage mobile. Ces modals ne sont donc jamais accessibles sur mobile. Décision documentée dans `PatrimoineActionBar.jsx`. Le fix `z-60` de C1 est conservé à titre défensif.

#### C2. Modals non adaptées mobile (pas de bottom drawer)
Modals avec `items-center` uniquement — flottent au centre de l'écran et tronquent le contenu sur mobile.

| Fichier | Ligne | Action |
|---|---|---|
| `components/ReleaseNotesModal.jsx` | 73-74 | `items-center` → `items-end sm:items-center` + `rounded-t-2xl sm:rounded-xl` |
| `components/common/DeleteConfirmModal.jsx` | 3-5 | idem |
| `components/patrimoine/ValueEditModals.jsx` | 14-15, 48-49 | idem (× 2) |
| `components/dashboard/DashboardCustomizePanel.jsx` | 65 | side drawer `w-80` figé → `w-full sm:w-80` |

> **Exclusions intentionnelles** : `InstrumentPriceUpdateModal`, `ExchangeRateUpdateModal`, `SnapshotPanel` — non accessibles sur mobile (voir note C1 ci-dessus).

#### C3. Tableaux sans scroll horizontal
Risque de débordement et de cassure de la mise en page sur mobile.

- `components/tools/LoanResultsPanel.jsx`
- `components/tools/PatrimoineDeclarationPage.jsx`
- `components/tools/TaxSimulatorPage.jsx`
- `components/tools/BilanFinancierPage.jsx`
- `components/expenses/RecurringExpensePage.jsx`
- `components/income/OtherIncomePage.jsx`
- `components/debts/DettePage.jsx`

**Action** : encapsuler chaque `<table>` dans `<div className="overflow-x-auto">` et masquer les colonnes secondaires avec `hidden md:table-cell`.

---

### 🟠 MAJEUR — Dégradent fortement l'expérience

#### M1. Grilles sans fallback mobile dans les widgets dashboard
- `components/dashboard/PatrimoineNetWidget.jsx:75` — `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`
- `components/dashboard/DetteWidget.jsx:125` — idem

#### M2. Grilles sans fallback dans les formulaires modaux
Formulaires avec `grid-cols-2` direct → champs et labels tronqués sur écran <400 px :

- `components/debts/DebtForm.jsx`
- `components/expenses/RecurringExpenseForm.jsx`
- `components/income/PaySlipForm.jsx`
- `components/income/BonusForm.jsx`
- `components/income/OtherIncomeForm.jsx`
- `components/income/SalaryContractFormPrivate.jsx`
- `components/income/SalaryContractFormPublic.jsx`
- `components/users/UserForm.jsx`
- `components/patrimoine/PositionForm.jsx`
- `components/patrimoine/OrderPanel.jsx`
- `components/possessions/PossessionForm.jsx`
- `components/admin/AdminInstrumentPage.jsx`

**Action** : remplacer chaque `grid-cols-N` par `grid-cols-1 md:grid-cols-N` (audit ciblé fichier par fichier).

---

### 🟡 MINEUR — À traiter au fil de l'eau

#### m1. Pages outils / simulateurs
À auditer un par un en émulation 375×667 (graphiques Recharts, tableaux comparatifs, sliders) :

- `components/tools/LoanSimulatorPage.jsx`
- `components/tools/LombardSimulatorPage.jsx`
- `components/tools/RetirementSimulatorPage.jsx`
- `components/tools/FiscalEnvelopeComparatorPage.jsx`
- `components/tools/CrisisSimulatorPage.jsx`
- `components/tools/CompoundInterestSimulatorPage.jsx`
- `components/tools/PerformancePage.jsx`

#### m2. Documentation et page admin
- `components/documentation/DocumentationPage.jsx` — vérifier les diagrammes Mermaid et tableaux denses
- `components/admin/*` — pages denses (login history, family groups, registrations)

---

## Pistes de correction par lacune

Les exemples ci-dessous sont des **patches type** à appliquer mécaniquement. Aucun changement de logique métier — uniquement des classes Tailwind et une éventuelle balise `<div>` autour des tableaux.

### Légende des fiches
- 🔍 **Détection** : commande `grep` pour trouver les occurrences (ré-utilisable en pré-commit)
- 📂 **Fichiers concernés** : liste des chemins
- ✅ **Critère de validation** : à quoi reconnaître que c'est corrigé
- 🧪 **Test manuel** : geste à effectuer dans DevTools 375 px
- ⚠ **Risques de régression** : ce qu'il faut vérifier en plus après le fix
- ⏱ **Effort** : S (<15 min) · M (15-60 min) · L (>1 h)
- 📌 **Référence conforme** : fichier déjà au pattern (modèle à copier)

---

### 🔴 C1 — ✅ RÉSOLU (2026-04-29) — Migration `z-50` → `z-60` sur les modals

**Correctif appliqué** :
- `components/common/DeleteConfirmModal.jsx:3` — `z-50` → `z-60`
- `components/patrimoine/ValueEditModals.jsx:14,48` — `z-50` → `z-60` (× 2 modals dans le même fichier)
- `components/patrimoine/ExchangeRateUpdateModal.jsx:75` — `z-50` → `z-60`
- `components/patrimoine/InstrumentPriceUpdateModal.jsx:102` — `z-50` → `z-60`
- `components/patrimoine/SnapshotPanel.jsx:87` — `z-50` → `z-60`
- `components/admin/AdminInstrumentPage.jsx:392` — `z-50` → `z-60` + bouton "Supprimer" masqué sur mobile (`hidden md:inline-flex`) — action destructive desktop-only (voir ADR-004 §8)
- `components/tools/LoanSimulatorPage.jsx:345` — `z-50` → `z-60` + conversion bottom drawer (`items-end sm:items-center`, `rounded-t-2xl sm:rounded-2xl`, `sm:max-w-md`, `max-h-[90vh] overflow-y-auto`) ; la modal chargement ligne 375 était déjà conforme
- `components/dashboard/DashboardCustomizePanel.jsx:65` — side drawer `z-50` → `z-60`
- `components/patrimoine/PositionForm.jsx:114,131` — dropdowns internes `absolute z-50` → `z-10` (dans le contexte de stacking de la modal `z-60`, `z-10` est suffisant)
- `scripts/check-mobile-patterns.sh` — détection C1 affinée : same-line match (`fixed inset-0.*z-50`) au lieu de file-level, élimine les faux positifs (tooltip `LoanSimulatorPage:894`)

**Non modifié (intentionnel)** :
- `Navigation.jsx:289` (`fixed bottom-0 z-50`) — c'est la bottom nav, ancre de la palette z-index
- `Navigation.jsx:143` (`sticky top-0 z-50`) — header, idem
- `LoanSimulatorPage.jsx:894` (`fixed z-50 pointer-events-none`) — tooltip non-modal, `z-50` correct
- `InstrumentPriceUpdateModal`, `ExchangeRateUpdateModal`, `SnapshotPanel` — fix `z-60` appliqué à titre défensif, mais ces modals ne sont **jamais accessibles sur mobile** : leurs boutons déclencheurs sont `hidden md:inline-flex` dans `PatrimoineActionBar.jsx` — décision assumée, features trop complexes pour mobile. Pas de conversion bottom drawer nécessaire.
- `AdminInstrumentPage.jsx:392` (modal de confirmation de suppression) — idem, le bouton déclencheur est maintenant `hidden md:inline-flex`.

**Règle** : si le composant est un **overlay modal centré** (et non la bottom nav ou le header sticky), passer en `z-60`.

```diff
- <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
+ <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4">
```

🔍 **Détection** (pour les nouveaux composants)
```bash
grep -rn "fixed inset-0.*z-50\|z-50.*fixed inset-0" frontend/src/components/ | grep -v "Navigation.jsx"
```

📂 **Fichiers corrigés** : 9 fichiers · 10 occurrences

✅ **Critère de validation** : la commande de détection ne retourne aucun résultat. `./scripts/check-mobile-patterns.sh` affiche `✅ OK` sur C1.

🧪 **Test manuel**
1. Ouvrir la modal en mobile (375 px)
2. La bottom nav doit être **masquée par l'overlay sombre** (et non l'inverse)
3. Le bouton de fermeture/validation est cliquable au-dessus de la nav

> ⚠ Ne **pas** toucher `Navigation.jsx:289` (`fixed bottom-0 ... z-50`) ni `Navigation.jsx:143` (header `sticky top-0 z-50`) — ce sont les ancres de la palette z-index.

### 🔴 C2 — Bottom drawer pattern sur les modals centrées

**Avant** (`DeleteConfirmModal.jsx:3-5`) :
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
  <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
```

**Après** :
```jsx
<div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center sm:p-4 bg-black/40">
  <div className="absolute inset-0" onClick={onCancel} />
  <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-6 z-10">
```

**Cas particulier — `DashboardCustomizePanel.jsx`** (side drawer droite) :
```diff
- <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
+ <div className="fixed top-0 right-0 h-full w-full sm:w-80 bg-white shadow-xl z-60 flex flex-col">
```

**Cas particulier — `ReleaseNotesModal.jsx`** (déjà `z-[60]`, ne corriger que `items-*`) :
```diff
- <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
-   <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
+ <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center sm:p-4 bg-black/40">
+   <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-5xl max-h-[90vh] flex flex-col"
```

🔍 **Détection des modals non drawer**
```bash
# Modals avec items-center mais sans items-end
grep -rln "fixed inset-0" frontend/src/components/ | xargs grep -L "items-end"
```

📂 **Fichiers concernés** : voir tableau C2 ci-dessus

✅ **Critère de validation**
- Le conteneur racine contient `flex items-end sm:items-center`
- Le conteneur enfant contient `rounded-t-2xl sm:rounded-xl` (ou `rounded-2xl`)
- `max-h-[90vh] overflow-y-auto` présent
- `w-full sm:max-w-...` (pleine largeur mobile, contraint desktop)

🧪 **Test manuel**
1. Ouvrir la modal en 375 px : doit **glisser depuis le bas** (collée en bas, coins arrondis seulement en haut)
2. Ouvrir la modal en ≥640 px : doit **rester centrée** comme avant
3. Long contenu : scroll **interne** à la modal, pas de la page
4. Click sur l'overlay sombre : ferme la modal

⚠ **Risques de régression**
- Si la modal contient un dropdown ou autocomplétion : passer à `z-10` (relatif au modal) sinon il s'affiche derrière le contenu.
- Si la modal a un footer fixe (boutons), vérifier qu'il reste visible avec `overflow-y-auto` sur le body — pattern recommandé : `flex flex-col` sur le wrapper, `flex-1 overflow-y-auto` sur le body, footer en dehors du body.
- Tester avec un clavier ouvert sur mobile (focus input) : la modal ne doit pas être recouverte.

⏱ **Effort** : M (5 modals × 10-15 min avec test)

📌 **Référence conforme** : `RecurringExpenseForm.jsx` · `DebtForm.jsx` · `BonusForm.jsx`

---

### 🔴 C3 — Wrapper `overflow-x-auto` sur les tableaux

**Patch type** :
```diff
+ <div className="overflow-x-auto -mx-4 md:mx-0">
    <table className="w-full ...">
      ...
    </table>
+ </div>
```

> Le `-mx-4 md:mx-0` permet au tableau de prendre toute la largeur du viewport mobile (compense le `p-4` parent) tout en restant aligné sur desktop.

**Tip complémentaire** — masquer les colonnes secondaires :
```diff
- <th className="px-3 py-2 text-left">Établissement</th>
+ <th className="hidden md:table-cell px-3 py-2 text-left">Établissement</th>
- <td className="px-3 py-2">{debt.lender}</td>
+ <td className="hidden md:table-cell px-3 py-2">{debt.lender}</td>
```

> ✅ La table `AmortizationTable` dans `DettePage.jsx` montre déjà le bon pattern (lignes 37-38, 47-48).

🔍 **Détection**
```bash
# Tableaux SANS wrapper overflow
for f in $(grep -rln "<table" frontend/src/components/); do
  grep -L "overflow-x-auto\|overflow-auto" "$f"
done
```

📂 **Fichiers concernés** : 7 fichiers listés en C3 (audit initial)

✅ **Critère de validation**
- Chaque `<table>` est précédée d'un `<div className="overflow-x-auto ...">`
- Aucun `<colgroup>` avec largeurs fixes (à supprimer si présent)
- Au moins une colonne secondaire en `hidden md:table-cell`

🧪 **Test manuel**
1. En 375 px : la **page** ne scroll pas horizontalement (`<main>` reste figé)
2. Le **tableau seul** scroll horizontalement (geste swipe à l'intérieur)
3. La première colonne (label métier) reste visible/lisible

⚠ **Risques de régression**
- `-mx-4 md:mx-0` peut casser un parent qui a déjà des marges négatives. Vérifier que le tableau n'est pas dans un container avec `mx-` ou `px-` non standard.
- Sur les tableaux avec **totaux en footer** (`<tfoot>`) : vérifier que le total reste aligné avec la colonne (pas de décalage dû au scroll).
- Si la table avait un `width: 100%`, garder le comportement avec `min-w-full` sur la table.

⏱ **Effort** : S à M (7 fichiers × 5-10 min, plus si beaucoup de colonnes à classer secondaire/primaire)

📌 **Référence conforme** : `DettePage.jsx:32-50` (AmortizationTable avec colonnes secondaires masquées) · `RecurringExpensePage.jsx` (à vérifier au moment du fix)

---

### 🟠 M1 — Widgets dashboard à 3 KPIs

**Avant** (`PatrimoineNetWidget.jsx:75`) :
```jsx
<div className="grid grid-cols-3 gap-4 mb-5">
```

**Après** :
```jsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
```

> Sur écran <640 px les 3 KPIs s'empilent verticalement. Alternative si l'on veut garder l'horizontal : `grid-cols-3 gap-2 sm:gap-4` + réduire la taille de police mobile (`text-base sm:text-xl`). À tester visuellement, je recommande l'empilement (lisibilité > densité).

🔍 **Détection**
```bash
# Widgets dashboard avec grid-cols-N sans fallback
grep -rn "grid-cols-[2-9]" frontend/src/components/dashboard/ | grep -v "md:grid-cols\|sm:grid-cols\|lg:grid-cols"
```

📂 **Fichiers concernés** : `PatrimoineNetWidget.jsx:75` · `DetteWidget.jsx:125`

✅ **Critère de validation** : la commande de détection ne retourne plus rien.

🧪 **Test manuel**
- 375 px : les 3 KPIs sont empilés verticalement (1 par ligne)
- 640 px (`sm:`) : ils repassent en 3 colonnes
- Aucun KPI tronqué, aucun débordement

⚠ **Risques de régression**
- Le widget devient plus haut sur mobile → vérifier que ça ne pousse pas le widget suivant hors écran (acceptable, c'est le scroll vertical attendu)
- Si le widget a une `height` fixe (`h-64`), elle peut se révéler insuffisante après empilement → passer en `min-h` ou retirer la contrainte

⏱ **Effort** : S (2 widgets × 2 min)

📌 **Référence conforme** : `DashboardPage.jsx:129,177,196` (`grid-cols-1 md:grid-cols-3 gap-4 md:gap-6`)

### 🟠 M2 — Grilles dans formulaires modaux

**Patch mécanique** sur tout `*Form.jsx` :
```diff
- <div className="grid grid-cols-2 gap-4">
+ <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

- <div className="grid grid-cols-3 gap-3">
+ <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
```

**Cas spéciaux** :
- Champs « date début / date fin » côte-à-côte : peuvent rester `grid-cols-2` (les inputs date tiennent en 160 px). Marquer `grid-cols-2` quand les deux champs sont des dates ou des nombres courts.
- Boutons d'action en pied de modal : `flex flex-col-reverse sm:flex-row sm:justify-end gap-2` (le bouton primaire passe en haut sur mobile = pouce-friendly).

🔍 **Détection**
```bash
# Tous les grid-cols-N sans fallback dans les formulaires
grep -rn "grid-cols-[2-9]" frontend/src/components/*/[A-Z]*Form.jsx | grep -v "md:grid-cols\|sm:grid-cols\|lg:grid-cols"
```

📂 **Fichiers concernés** : 12 fichiers listés en M2

✅ **Critère de validation** : pour chaque grille, présence d'un breakpoint `sm:` ou `md:` ; sinon justifier dans un commentaire (ex. couple date début/fin).

🧪 **Test manuel** (par formulaire)
1. Ouvrir le formulaire en 375 px
2. Aucun label tronqué (`...` invisibles)
3. Aucun input débordant ou écrasé
4. Le scroll interne fonctionne sur les longs formulaires
5. Le clavier ouvert (focus input) ne masque pas le champ courant

⚠ **Risques de régression**
- Sur les formulaires avec **groupes de boutons radio** (ex. `ContractTypeStep`) : `grid-cols-2` peut être justifié → garder + ajouter un `gap-2 sm:gap-4`
- Le passage à `grid-cols-1` augmente la hauteur → vérifier que `max-h-[90vh]` est bien présent sur le wrapper modal
- Les **aperçus temps réel** (ex. projection dans `RecurringExpenseForm`) peuvent se retrouver loin du champ qui les déclenche → acceptable mais à valider en UX

⏱ **Effort** : M à L (12 fichiers × 10-15 min avec test, soit ~3 h au total)

📌 **Référence conforme** : `RecurringExpenseForm.jsx` (selon mémoire `feedback_mobile_patterns`)

---

### 🟡 m1 — Pages outils / simulateurs

**Recharts — recettes courantes** :
```jsx
// Container
<ResponsiveContainer width="100%" height={300}>

// Marges adaptées mobile
<LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>

// Légende plus compacte sur mobile
<Legend wrapperStyle={{ fontSize: 12 }} />

// Axe X : afficher 1 tick sur 2 sur mobile via `interval`
<XAxis dataKey="year" interval="preserveStartEnd" />
```

**Tableaux comparatifs (ex. `FiscalEnvelopeComparatorPage`)** :
- Wrapper `overflow-x-auto`
- Première colonne `sticky left-0 bg-white z-10` pour garder le label visible au scroll
- Police réduite mobile : `text-xs sm:text-sm`

**Sliders multi-colonnes (ex. `LombardSimulatorPage`)** :
```diff
- <div className="grid grid-cols-4 gap-4">
+ <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Sélection de scénarios (radio buttons)** :
- Mobile : `flex flex-col gap-2`
- Desktop : `sm:flex-row sm:gap-4`

🔍 **Détection** (par page, à exécuter individuellement)
```bash
# ResponsiveContainer absent dans une page graphique
grep -L "ResponsiveContainer" frontend/src/components/tools/*.jsx

# Pages avec graphiques + tableaux denses
for f in frontend/src/components/tools/*.jsx; do
  echo "=== $f ==="
  grep -c "<table\|LineChart\|BarChart\|AreaChart\|PieChart" "$f"
done
```

📂 **Fichiers concernés** : 7 simulateurs (`LoanSimulator`, `LombardSimulator`, `RetirementSimulator`, `FiscalEnvelopeComparator`, `CrisisSimulator`, `CompoundInterestSimulator`, `PerformancePage`)

✅ **Critère de validation** (par page)
- Tous les graphiques utilisent `<ResponsiveContainer width="100%">`
- Aucun débordement horizontal du `<main>` à 375 px
- Les tableaux comparatifs scrollent horizontalement avec première colonne sticky
- Les sliders/inputs numériques sont accessibles (champs ≥ 44 px de hauteur tap)

🧪 **Test manuel par page** (~5 min)
1. Ouvrir la page en 375 px
2. Faire défiler du haut en bas : aucun élément ne dépasse à droite
3. Modifier un slider/input : le résultat se met à jour visiblement (pas masqué par la bottom nav)
4. Tableaux comparatifs : scroll horizontal possible, label de ligne reste visible

⚠ **Risques de régression**
- Les **calculs sont purement frontend** sur ces pages → un changement de markup ne casse pas la logique, mais vérifier que les `data` Recharts ne sont pas vides (graphique blanc).
- Les **tooltips Recharts** peuvent se positionner hors écran sur mobile → ajuster `position` ou `wrapperStyle` si problème.
- Sur `LombardSimulatorPage` : le **comparateur 3 scénarios côte-à-côte** est probablement le cas le plus complexe → prévoir un toggle ou une vue empilée.

⏱ **Effort** : L (7 pages × 30-45 min, soit 4-6 h au total)

📌 **Référence conforme** : aucune page outil n'est encore parfaitement conforme — créer la première (par ex. `CompoundInterestSimulator`, le plus simple) comme **modèle** avant d'attaquer les autres.

### 🟡 m2 — Documentation et admin

- `DocumentationPage` : encapsuler les diagrammes Mermaid dans `<div className="overflow-x-auto">` (les SVG générés peuvent dépasser la largeur).
- Pages admin denses : appliquer les recettes `overflow-x-auto` + `hidden md:table-cell` sur les colonnes peu critiques (timestamps précis, IDs internes, User-Agent).

🔍 **Détection**
```bash
grep -rn "<table\|mermaid" frontend/src/components/admin/ frontend/src/components/documentation/
```

📂 **Fichiers concernés**
- `DocumentationPage.jsx` (diagrammes Mermaid)
- `LoginHistoryPage.jsx` (tableau dense IP/User-Agent)
- `AdminFamilyGroupPage.jsx`
- `RegistrationRequestPage.jsx`
- `AdminInstrumentPage.jsx`
- `UserList.jsx`

✅ **Critère de validation** : pas de scroll horizontal de la **page**, scroll horizontal **du tableau** OK.

⏱ **Effort** : M (6 fichiers × 10 min)

📌 **Référence conforme** : à créer en même temps que m1 (page modèle).

---

## Tableau récapitulatif — priorité × effort × détection

| ID | Lacune | Crit. | Effort | Détection one-liner |
|---|---|:-:|:-:|---|
| C1 | z-50 sur modals | 🔴 | S | `grep -rn "fixed inset-0.*z-50" frontend/src/components/ \| grep -v Navigation` |
| C2 | Modals sans bottom drawer | 🔴 | M | `grep -rln "fixed inset-0" frontend/src/components/ \| xargs grep -L "items-end"` |
| C3 | Tableaux sans wrapper | 🔴 | M | `for f in $(grep -rln "<table" frontend/src/components/); do grep -L "overflow-x-auto" "$f"; done` |
| M1 | Widgets dashboard | 🟠 | S | `grep -rn "grid-cols-[2-9]" frontend/src/components/dashboard/ \| grep -v "md:\|sm:\|lg:"` |
| M2 | Formulaires modaux | 🟠 | L | `grep -rn "grid-cols-[2-9]" frontend/src/components/*/[A-Z]*Form.jsx \| grep -v "md:\|sm:\|lg:"` |
| m1 | Simulateurs | 🟡 | L | `grep -L "ResponsiveContainer" frontend/src/components/tools/*.jsx` |
| m2 | Doc / admin | 🟡 | M | `grep -rn "<table" frontend/src/components/admin/ frontend/src/components/documentation/` |

---

## Pré-commit — détection automatique des régressions

Script `scripts/check-mobile-patterns.sh` à créer (ou hook Git) :

```bash
#!/bin/bash
# Détecte les violations des patterns mobile dans les fichiers stagés
set -e
ERRORS=0

# C1 + C2 : modals avec z-50 ou sans items-end
violations=$(git diff --cached --name-only --diff-filter=ACM | grep -E "frontend/src/components/.*\.jsx$" | xargs grep -l "fixed inset-0" 2>/dev/null | xargs grep -l "z-50" 2>/dev/null | grep -v "Navigation.jsx" || true)
if [ -n "$violations" ]; then
  echo "❌ Modal(s) avec z-50 (devrait être z-60) :"; echo "$violations"; ERRORS=$((ERRORS+1))
fi

# M1 + M2 : grid-cols-N sans fallback
violations=$(git diff --cached --name-only --diff-filter=ACM | grep -E "frontend/src/components/.*\.jsx$" | xargs grep -nE "grid-cols-[2-9]" 2>/dev/null | grep -v "md:grid-cols\|sm:grid-cols\|lg:grid-cols" || true)
if [ -n "$violations" ]; then
  echo "❌ grid-cols-N sans fallback mobile :"; echo "$violations"; ERRORS=$((ERRORS+1))
fi

[ $ERRORS -gt 0 ] && exit 1 || echo "✅ Patterns mobile OK"
```

À ajouter dans `.husky/pre-commit` ou en tant que step CI ultérieurement.

---

## Anti-patterns à proscrire

| À éviter | Pourquoi | Remplacer par |
|---|---|---|
| `<colgroup><col style="width:..." />` | Force une largeur > viewport mobile | Largeurs fluides + `overflow-x-auto` parent |
| `min-w-[600px]` sur un container racine | Force le scroll horizontal de la page entière | `min-w-[600px]` **uniquement** sur l'élément qui doit scroller (ex. table) |
| `fixed left-0 right-0 w-screen` sur une modal | Casse les marges dans certains navigateurs mobiles | `fixed inset-0` |
| Modal sans `max-h-[90vh] overflow-y-auto` | Le contenu déborde sous la bottom nav | Toujours capper la hauteur |
| `gap-8 p-8` sur mobile | Gaspille l'espace utile | `gap-4 md:gap-8 p-4 md:p-8` |
| Boutons `text-xs` sans padding | Cible tap < 44 px (norme Apple HIG) | `px-3 py-2 text-sm` minimum |

---

## Plan d'action — 4 phases

### Phase 1 — Hygiène globale (1 session, gros gain)
**Objectif** : éliminer les blocages critiques.
- [x] **C1** — ✅ RÉSOLU (2026-04-29) — `z-50` → `z-60` sur 9 fichiers (10 occurrences)
- [ ] C2 — Appliquer le bottom drawer pattern aux 6 modals non conformes
- [ ] C3 — Wrapper `overflow-x-auto` sur les 18 tableaux identifiés
- [ ] M1 — Corriger les 2 widgets dashboard (`grid-cols-1 sm:grid-cols-3`)
- [ ] Test manuel en 375 px sur les pages impactées

### Phase 2 — Formulaires modaux
**Objectif** : tous les formulaires utilisables confortablement <400 px.
- [ ] M2 — Auditer chaque `*Form.jsx` listé, corriger les `grid-cols-N` → `grid-cols-1 md:grid-cols-N` (46 occurrences)
- [ ] Vérifier au passage le bottom drawer pattern + `z-60`
- [ ] Test manuel formulaire par formulaire

### Phase 3 — Simulateurs et outils
**Objectif** : pages outils lisibles sur mobile (sans chercher la perfection visuelle des graphiques).
- [ ] m1 — Pour chaque page outil : test 375×667, lister les débordements, corriger en une PR par page
- [ ] Recharts : `<ResponsiveContainer>` + ajustement marges
- [ ] Tableaux comparatifs : scroll horizontal + colonnes secondaires masquées

### Phase 4 — Validation et garde-fous
**Objectif** : prévenir la régression.
- [ ] Mettre à jour `memory/feedback_mobile_patterns.md` : rappel `z-60` strict
- [ ] Ajouter à la checklist de fin de tâche dans `claude.md` : « Tester en 375 px avant commit »
- [ ] Audit final complet (toutes les pages, tous les modals, tous les écrans)
- [ ] Mettre à jour `CHANGELOG.md` (entrée `[Mobile] Conformité responsive complète`)

---

## Suivi

| Lacune | Statut | Date | Violations restantes |
|---|---|---|---|
| C1 — z-50 sur modals | ✅ RÉSOLU | 2026-04-29 | 0 |
| C2 — Modals sans bottom drawer | ⏳ À faire | — | 6 fichiers |
| C3 — Tableaux sans overflow-x-auto | ⏳ À faire | — | 18 fichiers |
| M1 — Widgets dashboard | ⏳ À faire | — | 2 fichiers |
| M2 — Grilles formulaires | ⏳ À faire | — | 46 occurrences |
| m1 — Simulateurs | ⏳ À faire | — | 7 pages |
| m2 — Doc / admin | ⏳ À faire | — | 6 fichiers |

| Phase | Statut | Date |
|---|---|---|
| Phase 1 — Hygiène globale | 🔄 En cours | 2026-04-29 |
| Phase 2 — Formulaires | ⏳ À faire | — |
| Phase 3 — Outils | ⏳ À faire | — |
| Phase 4 — Validation | ⏳ À faire | — |

---

## Devices de référence

L'audit et les correctifs se valident sur la grille de devices suivante. **iPhone SE est la cible de référence** : tout ce qui passe en 375 px passe sur les écrans plus grands (l'inverse n'est pas vrai).

### Cibles obligatoires

| Device | Largeur CSS | Rôle | Présent dans DevTools |
|---|---|---|---|
| **iPhone SE (3e gén)** | **375 × 667** | 🎯 **Référence principale** — worst case réaliste, le plus petit écran iOS encore actif | ✅ natif |
| **iPhone 14 Pro** | **393 × 852** | Vérifier safe-area-inset, dynamic island, bottom nav sur écran haut | ✅ natif |

### Cibles complémentaires (à activer en cas de doute)

| Device | Largeur CSS | Rôle | Présent dans DevTools |
|---|---|---|---|
| **Pixel 7** | 412 × 915 | Spécificités Chrome Android (`100vh`, clavier virtuel) | ✅ natif |
| **iPad Mini (portrait)** | 768 × 1024 | Validation transition mobile → desktop (= breakpoint Tailwind `md:`) | ✅ natif |

### Règle d'or

> **Toujours tester en 375 px d'abord.** C'est le seul device qui révèle vraiment les problèmes de débordement, de troncature et de cibles tap. Les écrans plus larges sont plus tolérants.

### Setup Chrome DevTools

1. F12 → Toggle device toolbar (`Cmd+Shift+M` sur macOS)
2. Sélectionner **iPhone SE** dans le menu déroulant
3. Pour cycler entre devices : utiliser le menu déroulant — 30 secondes par page suffisent pour un audit visuel

### Test sur device physique

DevTools simule mal les comportements suivants — tester sur ton **vrai téléphone** quand un doute persiste :
- Ouverture du **clavier virtuel** (push de la viewport, focus input qui sort de l'écran)
- **Scroll inertiel** iOS / Android (rebond, momentum)
- **Pinch-zoom** (vérifier que `viewport-fit=cover` ne casse pas le contenu)
- **Tap-target réel** (44 px de cible recommandé par Apple HIG)

---

## Méthode de test recommandée

1. Chrome DevTools → device toolbar → **iPhone SE (375×667)** d'abord, puis iPhone 14 Pro (393×852)
2. Vérifier pour chaque page :
   - Pas de scroll horizontal sur `<main>`
   - Bottom nav ne masque aucun bouton d'action
   - Modals s'ouvrent en bas (`items-end`) et passent par-dessus la nav
   - Tableaux scrollent horizontalement sans casser la mise en page
   - Tous les libellés / boutons sont accessibles au tap (min 44 px)
3. En cas de doute sur un comportement (clavier, scroll, focus) : **tester sur ton téléphone physique**
