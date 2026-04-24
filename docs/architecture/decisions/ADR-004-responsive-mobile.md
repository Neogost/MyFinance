# ADR-004 — Adaptation responsive mobile

| | |
|---|---|
| **Statut** | Accepté |
| **Date** | 2026-04-24 |
| **Auteur** | Neogost |

---

## Contexte

L'application MyFinance a été conçue initialement pour un usage desktop (NAS local, accès navigateur
sur grand écran). Avec l'ajout de la landing page publique et le besoin d'accéder à ses données
depuis un téléphone sur le réseau local, une adaptation responsive est nécessaire.

L'application utilise Tailwind CSS v4, qui dispose nativement des préfixes de breakpoints
(`sm:`, `md:`, `lg:`). Aucune dépendance supplémentaire n'est requise.

---

## Périmètre initial (phase 1)

Les pages prioritaires pour cette première phase sont :

| Page | Composant | Complexité |
|------|-----------|-----------|
| Page d'accueil (landing) | `LandingPage.jsx` | Faible — déjà partiellement responsive |
| Connexion / Inscription | `LoginForm.jsx`, `RegistrationForm.jsx` | Faible — carte centrée |
| Suivi du patrimoine | `PatrimoinePage.jsx` | Élevée — grilles, charts, modals |
| Suivi des dépenses | `RecurringExpensePage.jsx` | Moyenne — KPIs, barres, liste |
| Suivi des dettes | `DettePage.jsx` | Moyenne — KPIs, accordéons |

Les autres pages (simulateurs, administration, bilan financier) seront traitées en phase 2.

---

## Décision

### 1. Breakpoints utilisés

Tailwind par défaut — aucune configuration personnalisée :

| Préfixe | Largeur min | Cible |
|---------|------------|-------|
| *(aucun)* | 0 px | Mobile (< 640 px) |
| `sm:` | 640 px | Petite tablette |
| `md:` | 768 px | Tablette / grand téléphone paysage |
| `lg:` | 1024 px | Desktop |

La règle d'écriture est **mobile-first** : les classes sans préfixe définissent le rendu mobile,
les préfixes `md:` / `lg:` surchargent pour les grands écrans.

---

### 2. Navigation

#### Desktop (inchangé)
Le header sticky avec dropdowns reste intact pour `md:` et au-delà.

#### Mobile
- Le header affiche uniquement le **logo** et un **menu utilisateur** (icône profil).
- Une **barre de navigation fixe en bas** (`fixed bottom-0`) remplace les dropdowns.
- Elle expose 5 entrées : Dashboard, Patrimoine, Dépenses, Dettes, Plus (accès aux autres pages via un panneau).

```
┌──────────────────────────────┐
│  MyFinance              [👤] │  ← header simplifié
│                              │
│  contenu de la page          │
│                              │
├──────┬──────┬──────┬────────┤
│  🏠  │  📊  │  📉  │  🏦  │ ···│  ← bottom nav (mobile uniquement)
└──────┴──────┴──────┴────────┘
```

Implémentation : classes `md:hidden` sur la bottom nav, `hidden md:flex` sur les éléments de
navigation desktop du header.

---

### 3. Grilles de KPIs et cartes

| Contexte | Mobile | Desktop |
|----------|--------|---------|
| KPIs (4 chiffres clés) | `grid-cols-2` | `grid-cols-4` |
| Cartes de résumé | `grid-cols-1` | `grid-cols-2` ou `grid-cols-3` |
| Features landing | `grid-cols-1` | `sm:grid-cols-2 lg:grid-cols-3` |

---

### 4. Tableaux de données

Stratégie retenue : **masquer les colonnes secondaires** sur mobile via `hidden md:table-cell`.

Chaque tableau conserve sur mobile uniquement les colonnes essentielles à la lecture et à l'action.

#### Colonnes toujours visibles (mobile)
- Libellé / nom de l'élément (tronqué si nécessaire : `truncate max-w-[10ch] md:max-w-none`)
- Valeur principale (montant, capital restant, solde) — via composant `<Amount>`
- Colonne d'actions

#### Colonnes masquées sur mobile (`hidden md:table-cell`)
- Dates (acquisition, échéance, dernière mise à jour)
- Identifiants techniques (ISIN, ticker)
- Valeurs secondaires (investi, taux, décote, ancienneté)
- Colonnes de détail (enveloppe fiscale, fiscalité, fréquence)

```jsx
<th className="hidden md:table-cell">Investi</th>
<td className="hidden md:table-cell">{item.investedAmount}</td>
```

#### Boutons d'action dans les tableaux
Empiler verticalement sur mobile, en ligne sur desktop :
```jsx
<div className="flex flex-col md:flex-row items-end md:justify-end gap-1 md:gap-2">
  <button>Modifier</button>
  <button>Supprimer</button>
</div>
```

#### Colgroup
Ne pas utiliser `<colgroup>` avec des largeurs fixes dans les tableaux responsifs — les colonnes
cachées (`display:none`) continuent à réserver de l'espace via `<col>`, causant un scroll
horizontal parasite. Laisser le navigateur auto-dimensionner les colonnes.

---

### 5. Formulaires et modals — pattern Bottom Drawer

Les modals utilisent le pattern **bottom drawer** sur mobile : elles glissent depuis le bas de
l'écran, et restent centrées sur desktop. **Ne pas utiliser le plein écran mobile** (UX moins
naturelle sur iOS/Android).

```jsx
// Pattern standard pour toute nouvelle modal
<div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
  <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-8">
    {/* contenu */}
  </div>
</div>
```

Règles :
- `items-end` sur mobile → `sm:items-center` sur desktop
- `rounded-t-2xl` sur mobile → `sm:rounded-xl` sur desktop
- `max-h-[90vh] overflow-y-auto` — obligatoire pour les formulaires longs
- **`z-60` obligatoire** — la bottom nav est en `z-50`, une modal en `z-50` passerait derrière
- Les champs en grille (`grid-cols-2`) sont réorganisés en colonne unique (`grid-cols-1 sm:grid-cols-2`)

---

### 6. Graphiques (Recharts)

- Les graphiques conservent leur `ResponsiveContainer` existant (déjà adaptatif en largeur).
- Sur mobile, la hauteur est réduite (`h-40 md:h-64`).
- Les tooltips restent fonctionnels au toucher (Recharts gère nativement le touch).
- Les légendes sont masquées sur mobile si elles surchargent la lisibilité (`hidden md:block`).

---

### 7. Espacement et typographie

| Élément | Mobile | Desktop |
|---------|--------|---------|
| Padding page | `p-4` | `p-8` |
| Titres de section | `text-lg` | `text-xl` |
| Padding cartes | `p-4` | `p-6` |

---

## Alternatives envisagées

| Option | Raison du rejet |
|--------|----------------|
| Application React Native séparée | Doublon de code, hors scope |
| Scroll horizontal sur les tableaux | Peu ergonomique sur mobile, UX dégradée |
| Menu hamburger (panneau latéral) | Bottom nav plus naturelle sur mobile, meilleure accessibilité tactile |
| Refonte complète en cards sur mobile | Trop coûteux pour la phase 1, non nécessaire avec le masquage de colonnes |

---

## Conséquences

### Ce qui change
- La navigation acquiert une double implémentation (header desktop + bottom nav mobile).
- Les composants de tableau reçoivent des classes `hidden md:table-cell` sur les colonnes secondaires.
- Les modals de formulaire gèrent deux mises en page (plein écran mobile / fenêtre desktop).
- Le padding de la `<main>` dans `App.jsx` passe de `p-8` à `p-4 md:p-8`.

### Ce qui ne change pas
- Le stack technique (React, Tailwind, Recharts) — aucune nouvelle dépendance.
- La logique métier et la couche API — le responsive est purement visuel.
- Le comportement des pages non prioritaires — elles restent desktop-only en phase 1.

### Risques
- La bottom nav duplique partiellement la logique de navigation de `Navigation.jsx` — à factoriser
  proprement pour éviter deux sources de vérité sur les routes accessibles.
- Les modals nécessitent un scroll interne (`overflow-y-auto`) pour les formulaires longs :
  toujours associer `max-h-[90vh] overflow-y-auto` au conteneur intérieur.

---

## Patterns additionnels (phase 2)

### Montants compacts sur mobile — composant `<Amount>`

Ne jamais afficher les montants en dur avec `fmt()` dans les vues mobiles. Utiliser systématiquement
le composant `<Amount>` qui bascule automatiquement entre format complet (desktop) et compact (mobile) :

```jsx
// utils.jsx — rendu CSS-only, zero JS overhead
export function Amount({ value, currency = 'EUR', prefix = '' }) {
  return (
    <>
      <span className="hidden md:inline">{prefix}{fmt(value, currency)}</span>   {/* 10 219,61 € */}
      <span className="md:hidden">{prefix}{fmtCompact(value, currency)}</span>   {/* 10,2 K€ */}
    </>
  )
}
```

Règle : `fmtCompact` ne s'applique pas aux prix unitaires (PRU) ni aux taux — garder `fmt()` pour ces cas.

---

### Scroll horizontal parasite

Ajouter `overflow-x-hidden` sur le `<main>` dans `App.jsx` pour bloquer tout débordement horizontal
causé par des tableaux ou éléments trop larges.

```jsx
<main className="p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
```

---

### z-index — règle de priorité

| Élément | z-index |
|---------|---------|
| Bottom nav | `z-50` |
| Modals / drawers | `z-60` |
| Dropdowns dans modal | `z-10` (relatif à la modal) |

Toute nouvelle modal doit utiliser `z-60` pour passer au-dessus de la bottom nav.
