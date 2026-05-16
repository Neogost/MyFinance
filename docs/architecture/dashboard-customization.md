# Personnalisation du tableau de bord — Plan d'architecture

> **Statut : PLANIFIÉ (non implémenté).** Document de cadrage et de chiffrage. La description des widgets existants reste dans [`dashboard.md`](dashboard.md). Ce fichier décrit uniquement les évolutions cibles permettant à l'utilisateur de réordonner, redimensionner et organiser librement ses widgets.

---

## Vue d'ensemble

Aujourd'hui, [`DashboardPage.jsx`](../../frontend/src/components/dashboard/DashboardPage.jsx) orchestre 27 widgets en JSX inline, regroupés en 4 sections figées (Revenus & Dépenses, Patrimoine, Stratégie & Objectifs, Diversification). La seule personnalisation est un toggle **show/hide** par widget, persisté dans `localStorage` sous la clé `dashboardWidgets` ([`DashboardCustomizePanel.jsx`](../../frontend/src/components/dashboard/DashboardCustomizePanel.jsx)).

Objectif cible : permettre à l'utilisateur de **réordonner**, **redimensionner**, **ajouter/supprimer** des widgets, et **insérer ses propres séparateurs**, sur une grille libre, avec persistance côté serveur (multi-device).

```
État actuel                          État cible (palier 2)
─────────────                        ────────────────────
27 widgets en dur dans JSX           Registre widgets (id → composant)
4 sections figées                    Grille 12 colonnes libre (react-grid-layout)
Show/hide localStorage               Layout JSON persisté DB + responsive multi-bp
Pas de réordonnement                 Drag, resize, séparateurs déplaçables
```

---

## 1. Paliers de mise en œuvre

Le plan est découpé en **trois paliers cumulatifs**. Le palier 1 est un prérequis architectural du palier 2 : son refacto en registre est réutilisé tel quel.

### Palier 1 — Réordonnement par section (1-2 j)

Sections figées conservées. Drag & drop vertical à l'intérieur de chaque section.

- **Lib** : `@dnd-kit/sortable` (~5 kB gzip, accessible, touch-friendly)
- **Refacto frontend** : extraction d'un **registre widgets** (cf. §3.1) — fin de la liste de 27 imports dispersés
- **Persistance** : extension de la clé `dashboardWidgets` du `localStorage` pour stocker également l'ordre
- **Backend** : aucun changement
- **Mobile** : drag activable au long-press, fallback "boutons flèches haut/bas" dans la palette de personnalisation
- **Gain perçu** : ~80 % de la valeur du palier 2 pour 20 % du coût

### Palier 2 — Grille libre + resize + séparateurs (5-8 j) — **recommandé**

Grille 12 colonnes responsive, redimensionnement par poignée, séparateurs déplaçables.

- **Lib** : [`react-grid-layout`](https://github.com/react-grid-layout/react-grid-layout) `ResponsiveGridLayout`, multi-breakpoints natif, mature (~6 k★)
- **Refacto frontend** : registre widgets enrichi avec `defaultSize { w, h, minW, minH, maxW? }` par widget
- **Backend** : nouvelle entité `UserDashboardLayout` (cf. §2), endpoints `GET/PUT /api/dashboard/layout`, migration Flyway
- **Mode édition** : toggle global, bordures pointillées, poignées de drag/resize, palette d'ajout des widgets cachés
- **Séparateurs** : widget spécial `SectionDivider` (label éditable inline) — traité comme n'importe quel widget de la grille
- **Migration** : à la première ouverture, conversion `localStorage` → layout serveur, puis bascule de la source de vérité
- **Mobile** : layout `xs` figé sur 1 colonne (drag pénible <600 px), édition désactivée sous `md`

### Palier 3 — Multi-dashboards & templates (12-15 j) — **non recommandé pour l'instant**

- Onglets de dashboards (Perso / Famille / Invest)
- Templates partagés ("preset Invest", "preset Salarié")
- Renommage et réordonnement des sections elles-mêmes
- Justifié uniquement si plusieurs personnes du foyer utilisent des vues très différentes

> **Recommandation :** livrer palier 1 en premier (refacto + valeur immédiate), puis palier 2 comme évolution incrémentale (le registre étant déjà en place, il ne reste que la lib de grille et le backend à brancher).

---

## 2. Modèle de données (palier 2)

### 2.1 Entité — `UserDashboardLayout`

| Champ | Type Java | Colonne SQLite | Description |
|-------|-----------|----------------|-------------|
| `id` | `Long` | `id` | Identifiant auto-incrémenté |
| `user` | `User` | `user_id` (FK, unique) | Propriétaire — un layout par utilisateur |
| `layoutJson` | `String` | `layout_json` (TEXT) | Layout sérialisé (cf. §2.2) |
| `version` | `Integer` | `version` | Numéro de schéma du JSON (pour migrations futures) |
| `updatedAt` | `Instant` | `updated_at` | Dernière modification |

**Règle :** un seul `UserDashboardLayout` par utilisateur (contrainte UNIQUE sur `user_id`). Suppression du compte → cascade applicative dans `UserService.delete()`.

### 2.2 Schéma du JSON

```json
{
  "version": 1,
  "breakpoints": {
    "lg": [
      { "i": "patrimoine-net", "x": 0, "y": 0, "w": 4, "h": 2 },
      { "i": "fire", "x": 4, "y": 0, "w": 4, "h": 2 },
      { "i": "safety-net", "x": 8, "y": 0, "w": 4, "h": 2 },
      { "i": "divider-1", "x": 0, "y": 2, "w": 12, "h": 1, "type": "divider", "label": "Patrimoine" },
      { "i": "patrimoine-evolution", "x": 0, "y": 3, "w": 12, "h": 4 }
    ],
    "md": [ /* layout 8 colonnes */ ],
    "xs": [ /* layout 1 colonne figé */ ]
  },
  "hiddenWidgets": ["sector-exposure", "geographic-exposure"]
}
```

- `i` : identifiant du widget (clé du registre) ou identifiant de séparateur (`divider-<n>`)
- `x, y, w, h` : grille `react-grid-layout` (colonnes 0-11 et lignes en multiples de la hauteur d'unité)
- `type: "divider"` + `label` : pour les séparateurs uniquement
- `hiddenWidgets` : ids du registre exclus de tous les breakpoints

### 2.3 Migration Flyway

`V<N>__create_user_dashboard_layout.sql` :

```sql
CREATE TABLE user_dashboard_layout (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE,
    layout_json TEXT    NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    updated_at  TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Pas de `ON DELETE CASCADE` SQL — la suppression est gérée dans `UserService.delete()` (cf. feedback projet sur les cascades).

---

## 3. Frontend

### 3.1 Registre des widgets — `frontend/src/components/dashboard/widgets-registry.js`

```js
import PatrimoineNetWidget from './PatrimoineNetWidget'
import FireProjectionWidget from './FireProjectionWidget'
// … 25 autres

export const WIDGETS = {
  'patrimoine-net': {
    label: 'Patrimoine net',
    section: 'patrimoine',        // section par défaut (palier 1)
    component: PatrimoineNetWidget,
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },   // palier 2
    defaultVisible: true,
    category: 'KPI'
  },
  'fire': {
    label: 'Projection FIRE',
    section: 'objectifs',
    component: FireProjectionWidget,
    defaultSize: { w: 4, h: 2, minW: 3, minH: 2 },
    defaultVisible: true,
    category: 'Stratégie'
  },
  // …
}

export const DEFAULT_LAYOUT_LG = [/* généré à partir de defaultSize */]
export const DEFAULT_LAYOUT_MD = [/* … */]
export const DEFAULT_LAYOUT_XS = [/* 1 colonne, tous en w:1 */]
```

**Convention :** `id` en `kebab-case`, stable dans le temps (un renommage casse les layouts persistés des utilisateurs → si renommage indispensable, prévoir une étape de migration JSON via le champ `version`).

### 3.2 Composant orchestrateur — `DashboardGrid.jsx` (palier 2)

```jsx
<ResponsiveGridLayout
  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
  cols={{ lg: 12, md: 8, sm: 6, xs: 1 }}
  layouts={layouts}
  rowHeight={80}
  isDraggable={editMode}
  isResizable={editMode}
  onLayoutChange={handleChange}
  margin={[16, 16]}
>
  {visibleItems.map(item =>
    item.type === 'divider'
      ? <SectionDivider key={item.i} label={item.label} editable={editMode} />
      : <div key={item.i}>{React.createElement(WIDGETS[item.i].component)}</div>
  )}
</ResponsiveGridLayout>
```

### 3.3 UX du mode édition

- Toggle "Personnaliser" dans le header du dashboard (remplace le bouton existant)
- En mode édition :
  - Bordure pointillée indigo-300 autour de chaque widget
  - Poignée drag (top-left) + poignée resize (bottom-right) sur chaque widget
  - Bouton ✕ pour cacher (vers la palette latérale)
  - Bouton "+ Ajouter un séparateur"
  - Palette latérale (réutilise [`DashboardCustomizePanel`](../../frontend/src/components/dashboard/DashboardCustomizePanel.jsx) refactoré) :
    - liste des widgets cachés glissables vers la grille
    - bouton "Réinitialiser le layout"
- Bouton "Terminer" : `PUT /api/dashboard/layout` puis sortie du mode édition
- Cohérent avec le pattern bottom-drawer mobile : sur `xs`, mode édition désactivé (message "Personnalisation indisponible sur mobile, ouvrez sur un grand écran")

### 3.4 API frontend — `frontend/src/api/dashboard.js`

```js
export const getDashboardLayout = () => axios.get('/api/dashboard/layout').then(r => r.data)
export const saveDashboardLayout = (layout) => axios.put('/api/dashboard/layout', layout)
```

---

## 4. Backend (palier 2)

### 4.1 Endpoints

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/dashboard/layout` | Authentifié | Layout de l'utilisateur courant (renvoie `DEFAULT_LAYOUT` si jamais sauvegardé) |
| `PUT` | `/api/dashboard/layout` | Authentifié | Remplace son layout (upsert) |

### 4.2 DTOs

```java
public record DashboardLayoutDto(
    int version,
    Map<String, List<GridItemDto>> breakpoints,
    List<String> hiddenWidgets
) {}

public record GridItemDto(
    String i, int x, int y, int w, int h,
    String type,   // "widget" (défaut) ou "divider"
    String label   // séparateur uniquement
) {}
```

### 4.3 Validation

- `version` ∈ versions supportées par le backend (rejeter > version max connue)
- Pas de validation sémantique forte des coordonnées (`x`, `y`, `w`, `h`) — le frontend `react-grid-layout` corrige les collisions
- Validation `i` non vide, `breakpoints` non null
- Taille du JSON limitée à 32 kB (refus 413)

### 4.4 Service & Controller

Pattern projet standard ([`PATTERNS-backend.md`](decisions/PATTERNS-backend.md)) : `DashboardLayoutService` + `DashboardLayoutController`, sérialisation Jackson sur le champ `layoutJson` (TEXT en base, objet en mémoire).

### 4.5 Tests

- `DashboardLayoutServiceTest` — get default si pas de layout, upsert, validation version
- `DashboardLayoutControllerTest` — `@WebMvcTest`, ownership, 401/200/400

---

## 5. Migration depuis l'existant

### Palier 1

Format actuel `localStorage["dashboardWidgets"]` :
```json
{ "patrimoineNet": true, "fire": false, ... }
```

Format cible (clé inchangée, schéma enrichi) :
```json
{
  "version": 1,
  "order": { "patrimoine": ["patrimoine-net", "fire", "..."], ... },
  "visibility": { "patrimoine-net": true, ... }
}
```

Migration au chargement : si l'ancien format est détecté (pas de `version`), on convertit côté client → on écrit le nouveau → on continue. Aucune action utilisateur requise.

### Palier 2

Lors de la première ouverture après déploiement :
1. Lire le `localStorage` (format palier 1)
2. Construire un layout par défaut basé sur `defaultSize` du registre, en respectant l'ordre et la visibility du localStorage
3. `PUT /api/dashboard/layout` avec le résultat
4. Supprimer `dashboardWidgets` du `localStorage` (la source de vérité devient le backend)

---

## 6. Responsive & règles mobiles

Conformément à [`ADR-004-responsive-mobile.md`](decisions/ADR-004-responsive-mobile.md) :

- **`xs` (< 600 px)** : layout figé à 1 colonne, dans l'ordre de la liste `xs` du JSON ; pas de drag, pas de resize, pas d'édition (bouton "Personnaliser" masqué via `hidden md:inline-flex`)
- **`md` / `lg`** : édition pleinement disponible
- Les widgets eux-mêmes restent responsives en interne (déjà le cas aujourd'hui)
- `react-grid-layout` gère nativement le repliement multi-bp — pas de code custom

---

## 7. Risques & arbitrages

| Risque | Mitigation |
|--------|-----------|
| Performance — re-render des 27 widgets pendant le drag | `React.memo` sur chaque widget + clé stable depuis le registre ; tests perf en édition |
| Calibration des `minW/minH` par widget hétérogène (KPI vs Sankey) | Passe dédiée (1-2 j inclus dans le palier 2) avec validation visuelle widget par widget |
| Rétrocompatibilité des layouts à l'ajout/suppression de widgets | Champ `version` du JSON + migration côté backend si schéma évolue ; un widget inconnu lors du rendu est simplement ignoré, un widget manquant prend `defaultSize` |
| Drag & drop pénible sur mobile | Édition désactivée sous `md` (cf. §6) |
| Bibliothèque `react-grid-layout` non maintenue à terme | Alternative `@dnd-kit` + grille custom (~3 j de plus), évitée tant que la lib reste active (dernière release < 6 mois) |
| Perte du layout suite à corruption JSON | Endpoint `GET` retourne `DEFAULT_LAYOUT` en cas de désérialisation échouée + log warning |

---

## 8. Découpage des tâches & chiffrage détaillé

### Palier 1 (1-2 j)

| # | Tâche | Effort |
|---|-------|--------|
| 1.1 | Extraction du registre widgets (`widgets-registry.js`) | 0,5 j |
| 1.2 | Refacto `DashboardPage.jsx` pour itérer sur le registre | 0,5 j |
| 1.3 | Intégration `@dnd-kit/sortable` par section | 0,5 j |
| 1.4 | Migration du format `localStorage` (v0 → v1) | 0,25 j |
| 1.5 | Mise à jour des tests `DashboardPage.test.jsx` | 0,25 j |

### Palier 2 (5-8 j)

| # | Tâche | Effort |
|---|-------|--------|
| 2.1 | Backend : entité, repo, service, controller, DTOs | 1 j |
| 2.2 | Backend : tests service + controller | 0,5 j |
| 2.3 | Migration Flyway + mise à jour ER diagram + doc API | 0,25 j |
| 2.4 | Frontend : intégration `react-grid-layout` + `DashboardGrid` | 1 j |
| 2.5 | Calibration `defaultSize/minW/minH` des 27 widgets | 1-2 j |
| 2.6 | Mode édition : poignées, palette, bouton enregistrer | 1 j |
| 2.7 | Séparateurs (`SectionDivider` + label éditable) | 0,5 j |
| 2.8 | Migration `localStorage` → backend (first-load) | 0,25 j |
| 2.9 | Tests frontend (composants + intégration mode édition) | 0,5 j |
| 2.10 | Documentation : mise à jour `dashboard.md`, `CLAUDE.md`, `PROJECT-STATUS.md`, capture d'écran mode édition | 0,25 j |

---

## 9. Checklist de fin de projet (palier 2)

- [ ] `./mvnw test` BUILD SUCCESS + nombre de tests mis à jour dans `readme.md`
- [ ] `npm run test` 100 % passants
- [ ] `./scripts/check-mobile-patterns.sh` OK
- [ ] Vérification visuelle 375 px (édition masquée) + 1280 px (édition complète)
- [ ] `docs/architecture/dashboard.md` : section "Personnalisation" ajoutée renvoyant ici
- [ ] `docs/api/dashboard.md` : endpoints `GET/PUT /api/dashboard/layout` documentés
- [ ] `CLAUDE.md` : table "Endpoints backend existants" mise à jour + ligne "Documentation associée"
- [ ] `docs/PROJECT-STATUS.md` : entrée dans la catégorie Dashboard
- [ ] `er-diagram.mmd` : `UserDashboardLayout` ajouté
- [ ] `CHANGELOG.md` : entrée release
- [ ] Bump pom.xml en MINOR (`X.Y.0`) — nouvelle fonctionnalité

---

## 10. Pointeurs

- Pattern backend (entité, service, controller, tests) : [`decisions/PATTERNS-backend.md`](decisions/PATTERNS-backend.md)
- Pattern frontend (page, API layer, modal, CSS) : [`decisions/PATTERNS-frontend.md`](decisions/PATTERNS-frontend.md)
- Patterns mobile et responsive : [`decisions/ADR-004-responsive-mobile.md`](decisions/ADR-004-responsive-mobile.md)
- Description des widgets actuels : [`dashboard.md`](dashboard.md)
- Endpoint dashboard existant (`/api/dashboard/salary-evolution`) : [`../api/dashboard.md`](../api/dashboard.md)
