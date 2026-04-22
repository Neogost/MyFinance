# Stratégie & Objectifs patrimoniaux

## Vue d'ensemble

La fonctionnalité **Stratégie patrimoniale** permet à l'utilisateur de définir un montant cible par catégorie d'actif. Chaque carte de résumé de la page Patrimoine affiche alors une barre de progression indiquant l'avancement vers l'objectif. La barre passe au rouge si la valeur courante dépasse la cible.

Les objectifs sont **persistés côté backend** (base SQLite) pour être retrouvés sur n'importe quel appareil.

---

## Flux UX

```
PatrimoinePage
  └─ Bouton "Stratégie & Objectifs"
       └─ Modal PatrimoineStrategyModal
            ├─ Un champ de saisie par catégorie (LIVRET, LIQUIDITE, BOURSE, …)
            ├─ Bouton "Enregistrer" → PUT /api/patrimoine/targets
            └─ Fermeture → refresh des barres de progression
```

Au chargement de `PatrimoinePage`, les objectifs sont récupérés via `GET /api/patrimoine/targets` et transmis aux cartes de résumé par catégorie.

---

## Modèle de données

### Entité `PatrimoineTarget`

Table : `patrimoine_targets`

| Colonne | Type SQLite | Contrainte | Description |
|---------|-------------|------------|-------------|
| `id` | INTEGER | PK, autoincrement | — |
| `user_id` | INTEGER | FK → `users(id)`, NOT NULL | Propriétaire de l'objectif |
| `category` | TEXT | NOT NULL | Valeur de `AssetCategory` (`BOURSE`, `LIVRET`, …) |
| `target_amount_eur` | REAL | NOT NULL | Montant cible en EUR |

**Contrainte d'unicité :** `UNIQUE(user_id, category)` — un seul objectif par catégorie et par utilisateur.

### DTO de réponse

```java
// GET /api/patrimoine/targets → Map<String, Double>
// Exemple :
{
  "BOURSE":        50000.0,
  "CRYPTO":        5000.0,
  "IMMO_PAPIER":   20000.0,
  "IMMO_PHYSIQUE": 300000.0,
  "LIVRET":        30000.0,
  "LIQUIDITE":     10000.0
}
```

La réponse est une `Map<String, Double>` : clé = nom de catégorie, valeur = montant cible. Les catégories sans objectif défini sont absentes de la map.

### DTO de requête (PUT)

```java
// PUT /api/patrimoine/targets — body :
// Map<String, Double>   (même format que la réponse)
// Les catégories absentes voient leur objectif supprimé.
// Une valeur nulle ou ≤ 0 supprime l'objectif de la catégorie.
```

---

## Backend

### Package et classes

```
com.myfinance
├── domain/
│   └── PatrimoineTarget.java          — @Entity, @Table("patrimoine_targets")
├── repository/
│   └── PatrimoineTargetRepository.java — findAllByUserId, deleteByUserIdAndCategory
├── service/
│   └── PatrimoineTargetService.java   — getTargets, saveTargets
├── controller/
│   └── PatrimoineTargetController.java — GET + PUT /api/patrimoine/targets
```

### `PatrimoineTarget` (entité)

```java
@Entity
@Table(name = "patrimoine_targets",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "category"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PatrimoineTarget {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String category;   // valeur de AssetCategory

    @Column(nullable = false)
    private Double targetAmountEur;
}
```

### `PatrimoineTargetService`

| Méthode | Signature | Description |
|---------|-----------|-------------|
| `getTargets` | `Map<String, Double> getTargets(Long userId)` | Retourne la map catégorie→montant pour l'utilisateur |
| `saveTargets` | `void saveTargets(Long userId, Map<String, Double> targets)` | Upsert complet : supprime les lignes manquantes, insère/met à jour les autres |

**Logique `saveTargets` :**
1. Supprimer toutes les lignes existantes de l'utilisateur (`deleteByUserId`)
2. Filtrer les entrées avec valeur > 0
3. Insérer les nouvelles lignes via `saveAll`

### Endpoints

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `GET` | `/api/patrimoine/targets` | Authentifié | Retourne les objectifs de l'utilisateur connecté |
| `PUT` | `/api/patrimoine/targets` | Authentifié | Remplace l'intégralité des objectifs (upsert) |

---

## Frontend

### API layer — `patrimoine.js`

```js
export const getPatrimoineTargets  = ()        => client.get('/api/patrimoine/targets').then(r => r.data)
export const savePatrimoineTargets = (targets) => client.put('/api/patrimoine/targets', targets).then(r => r.data)
```

### `PatrimoineStrategyModal`

Modal de saisie des objectifs par catégorie.

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Contrôle la visibilité |
| `onClose` | `() => void` | Ferme la modal |
| `targets` | `Record<string, number\|null>` | Valeurs initiales (chargées depuis l'API) |
| `onSave` | `(targets) => void` | Callback après enregistrement réussi |

**Comportement :**
- Un `NumInput` (montant €) par catégorie, pré-rempli avec la valeur existante
- Icône et label de catégorie repris depuis `CATEGORY_META` (constants.js)
- "Enregistrer" : appelle `PUT /api/patrimoine/targets`, puis `onSave` avec la nouvelle map
- "Annuler" : ferme sans appel API
- État `saving` (booléen) pour désactiver le bouton pendant la requête

### `CategoryStrategyBar`

Barre de progression intégrée dans chaque carte de résumé de catégorie.

| Prop | Type | Description |
|------|------|-------------|
| `currentValue` | `number` | Valeur actuelle de la catégorie en EUR |
| `target` | `number\|null` | Objectif cible en EUR (`null` = barre masquée) |

**Logique d'affichage :**
```js
if (!target || target <= 0) return null

const pct      = Math.min(currentValue / target * 100, 100)  // plafonné pour la barre
const exceeded = currentValue > target
```

| État | Couleur de la barre | Texte sous la barre |
|------|---------------------|---------------------|
| Normal (`pct < 100`) | indigo-500 | `{pct} % · objectif {fmtEur(target)}` |
| Atteint (`pct === 100`) | emerald-500 | `Objectif atteint · {fmtEur(target)}` |
| Dépassé (`exceeded`) | red-500 | `Dépassé de {fmtEur(currentValue - target)}` |

La barre est toujours pleine à 100 % visuellement quand l'objectif est dépassé (l'excès est indiqué par le texte et la couleur rouge).

### Intégration dans `PatrimoinePage`

**Chargement au montage :**
```js
const [targets, setTargets] = useState({})

useEffect(() => {
  getPatrimoineTargets().then(setTargets).catch(() => {})
}, [])
```

**Sauvegarde :**
```js
async function handleSaveTargets(newTargets) {
  await savePatrimoineTargets(newTargets)
  setTargets(newTargets)
}
```

**Bouton d'accès :** ajouté dans l'en-tête de `PatrimoinePage`, à droite des boutons existants.

**Transmission aux cartes :** `targets[category]` passé à `CategoryStrategyBar` dans chaque carte de résumé.

---

## Structure des fichiers

```
backend/src/main/java/com/myfinance/
├── domain/PatrimoineTarget.java
├── repository/PatrimoineTargetRepository.java
├── service/PatrimoineTargetService.java
└── controller/PatrimoineTargetController.java

frontend/src/components/patrimoine/
├── PatrimoinePage.jsx              — ajout bouton + chargement API targets
├── PatrimoineStrategyModal.jsx     — NOUVEAU : modal de saisie
├── CategoryStrategyBar.jsx         — NOUVEAU : barre de progression
└── constants.js                    — inchangé (CATEGORY_META réutilisé)

frontend/src/api/
└── patrimoine.js                   — ajout getPatrimoineTargets / savePatrimoineTargets
```

---

## Tests

- `PatrimoineTargetServiceTest` : `getTargets` (vide, partiel, complet), `saveTargets` (insertion, mise à jour, suppression des absents)
- `PatrimoineTargetControllerTest` : GET 200, PUT 200, accès non authentifié → 401

---

## Non-requis (hors périmètre)

- Pas de date d'échéance ni d'historique des objectifs
- Pas de cumul inter-catégories ni d'objectif global
- Pas de mode famille : les objectifs sont personnels à l'utilisateur connecté
