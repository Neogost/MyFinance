# ADR-002 — Styles frontend : adoption de Tailwind CSS v4

| | |
|---|---|
| **Statut** | Accepté |
| **Date** | 2026-04-08 |
| **Auteur** | Neogost |

---

## Contexte

L'interface frontend était initialement stylisée via un fichier `App.css` contenant des classes CSS
custom (`.login-card`, `.data-table`, `.modal`, etc.). Cette approche fonctionnait pour un petit
périmètre mais présente des inconvénients à mesure que l'application grandit :

- Nommage de classes à inventer et maintenir manuellement
- Risques de conflits et d'effets de bord entre les classes globales
- Manque de cohérence visuelle sans système de design formalisé
- Surcharge du fichier `App.css` à chaque nouvel écran

---

## Décision

Adoption de **Tailwind CSS v4** avec le plugin officiel `@tailwindcss/vite`.

### Configuration

```
frontend/
├── vite.config.js        → plugin tailwindcss() ajouté
└── src/
    └── index.css         → @import "tailwindcss"  (unique entrée CSS)
```

Aucun fichier `tailwind.config.js` n'est requis en v4 — la configuration se fait
directement via des directives CSS si nécessaire.

### Règles d'usage

- Toutes les classes de style sont des **utilitaires Tailwind inline** dans les JSX
- `App.css` est conservé vide (aucun style à y écrire)
- `index.css` ne contient que `@import "tailwindcss"` — pas de règles globales custom
- La palette est définie par convention dans le projet :

| Rôle | Classe Tailwind |
|------|----------------|
| Couleur primaire | `indigo-600` / `indigo-700` (hover) |
| Fond de page | `bg-gray-100` |
| Surfaces (cartes, tableaux) | `bg-white` |
| Badge rôle | `bg-violet-100 text-violet-800` |
| Erreur | `bg-red-50 text-red-600 border-red-200` |
| Succès | `bg-green-50 text-green-700 border-green-200` |

---

## Alternatives envisagées

| Option | Raison du rejet |
|--------|----------------|
| CSS Modules | Verbeux, nécessite un fichier `.module.css` par composant |
| styled-components | Runtime JS, incompatible avec la simplicité souhaitée |
| Conserver `App.css` custom | Pas de système de design, maintenance croissante |

---

## Conséquences

### Avantages
- **Cohérence visuelle** garantie par les tokens Tailwind (espacements, couleurs, radii)
- **Zéro CSS inutilisé** en production — Tailwind purge automatiquement via le plugin Vite
- **Rapidité de développement** : pas besoin d'inventer des noms de classes
- **Pas de configuration** : Tailwind v4 fonctionne sans `tailwind.config.js`

### Limites
- Les classes inline peuvent allonger les JSX — acceptable pour des composants simples
- Tailwind v4 est récent (sortie 2025) — API encore susceptible d'évoluer
- Les développeurs non familiers avec Tailwind ont une courbe d'apprentissage initiale
