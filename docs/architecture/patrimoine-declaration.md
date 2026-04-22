# Déclaration de patrimoine

## Objectif

Vue synthétique du patrimoine de l'utilisateur exportable en PDF, structurée comme un document officiel. Couvre l'identité civile, la synthèse financière et le détail par catégorie d'actif.

Accessible via **Outils → Déclaration de patrimoine**.

---

## Nouveaux champs sur les entités

### `User` — informations civiles

Trois champs nullables ajoutés à l'entité `User` (propagés dans `UserDto`) :

| Champ               | Type     | Description                 |
|---------------------|----------|-----------------------------|
| `birthPlace`        | `String` | Commune de naissance        |
| `birthPostalCode`   | `String` | Code postal de naissance    |
| `jobTitle`          | `String` | Intitulé du poste actuel    |

Saisissables dans **Mon Profil** via `PUT /api/profile/personal-info`.

### `Position` — prix d'acquisition (IMMO_PHYSIQUE)

Un champ nullable ajouté à l'entité `Position` :

| Champ              | Type         | Description                            |
|--------------------|--------------|----------------------------------------|
| `acquisitionPrice` | `BigDecimal` | Prix d'acquisition du bien immobilier  |

Propagé dans `CreatePositionRequest`, `UpdatePositionRequest`, `PositionDto`. Saisi dans `PositionForm` à côté de la date d'acquisition.

---

## Structure du document

### 1. En-tête

```
NOM Prénom
Né(e) le [birthDate] à [birthPlace] ([birthPostalCode])
[companyName] — [jobTitle]
Établi le [date du jour]
```

Si un champ est absent, une alerte non-bloquante invite l'utilisateur à compléter son profil. Les champs manquants apparaissent en rouge italique dans l'aperçu.

---

### 2. Synthèse (deux colonnes)

#### Colonne gauche — Patrimoine

| Ligne                    | Valeur                                         |
|--------------------------|------------------------------------------------|
| Patrimoine brut          | Σ `currentValueEur` des positions actives      |
| Passifs                  | Σ `effectiveValue` des possessions             |
| — détail par catégorie   | Une ligne en petit par catégorie de possession |
| **Patrimoine net**       | Brut − Passifs                                 |
| Dont actif financier     | Brut hors IMMO_PHYSIQUE                        |
| Dont plus-values latentes| Σ `capitalGainEur` (si non nul)                |

#### Colonne droite — Revenus / Dépenses

| Ligne                  | Valeur                                              |
|------------------------|-----------------------------------------------------|
| Salaire net fiscal     | `monthlyNetImposable` du contrat actif              |
| *(section dépenses)*  |                                                     |
| Par catégorie          | `monthlyAmount` trié par montant décroissant        |
| Impôt estimé           | `totalEstimatedTax / 12` (si profil fiscal complet) |
| Total dépenses         | Σ dépenses + impôt                                  |
| Capacité d'épargne     | Salaire − Total dépenses                            |
| Taux d'épargne         | Capacité d'épargne / Salaire × 100                  |

---

### 3. Détail des actifs

Catégories affichées dans cet ordre, uniquement si elles contiennent au moins une position active :

#### LIQUIDITE — regroupement par partenaire

Titre : **"Liquidités — Comptes courants & épargne disponible"**

Une ligne par `partner` (fallback sur `label`), somme des soldes actifs.

#### LIVRET — regroupement par partenaire

Une ligne par `partner`, valeur totale consolidée.

#### BOURSE / IMMO_PAPIER — regroupement par partenaire + enveloppe fiscale

Une ligne par couple `(partner, fiscalEnvelope)`. La colonne "extra" affiche l'enveloppe (PEA, CTO, AV) si différente de NONE. Permet de distinguer un PEA et un CTO chez le même courtier.

```
Partenaire          Enveloppe   Valeur
────────────────────────────────────────
SaxoBank            PEA         45 000 €
SaxoBank            CTO          8 000 €
BNP Paribas         AV          12 500 €
                               ─────────
Total Bourse                    65 500 €
```

#### CRYPTO — regroupement par token

Une ligne par `instrument.ticker`, somme de toutes les positions actives sur ce token.

#### IMMO_PHYSIQUE — une ligne par bien

Une ligne par position avec l'adresse et la valeur estimée. Si `acquisitionPrice` est renseigné, une sous-ligne en petit affiche le prix d'acquisition.

```
Adresse                         Propriété          Valeur
──────────────────────────────────────────────────────────
12 rue des Lilas, Paris         Pleine propriété   320 000 €
  Prix d'acquisition                                95 000 €
                                                   ─────────
Total Immobilier physique                          320 000 €
```

---

## Endpoints backend

| Méthode | URL                          | Description                                              |
|---------|------------------------------|----------------------------------------------------------|
| `PUT`   | `/api/profile/personal-info` | Met à jour `birthPlace`, `birthPostalCode`, `jobTitle`  |

Les autres données proviennent d'endpoints existants, appelés en parallèle.

---

## Sources de données

| Section                  | Endpoint(s)                                          |
|--------------------------|------------------------------------------------------|
| Identité                 | `GET /api/auth/me` + `GET /api/salary-contracts`     |
| Patrimoine brut / actifs | `GET /api/positions?status=ACTIVE`                   |
| Passifs                  | `GET /api/possessions` (détail par catégorie)        |
| Dépenses                 | `GET /api/recurring-expenses/summary`                |
| Impôt estimé             | `GET /api/tax-simulator` (null si profil incomplet)  |

---

## Implémentation frontend

### Composant principal

`frontend/src/components/tools/PatrimoineDeclarationPage.jsx`

- Récupère toutes les données en parallèle au montage (`Promise.all`)
- Bandeau d'alerte non-bloquant si des champs d'identité manquent, avec lien vers Mon Profil
- Bouton **Exporter en PDF** déclenche `window.print()`

### Nouveau panneau profil

`frontend/src/components/profile/PersonalInfoPanel.jsx`

- Formulaire : `birthPlace`, `birthPostalCode`, `jobTitle`
- Appelle `PUT /api/profile/personal-info`
- Affiché dans `ChangePasswordForm`

### Export PDF

Aucune dépendance externe. Technique `visibility: hidden` sur `body *` + `visibility: visible` sur `.declaration-document` et ses enfants — seul le document est imprimé, la navigation et les boutons sont masqués.

CSS `@media print` dans `index.css` :
- Format A4, marges 1,5 cm
- Numéros de page via `@page { @bottom-right { content: counter(page) " / " counter(pages) } }`
- `break-inside: avoid` sur les sections (`.declaration-section`)

### Navigation

Entrée **Déclaration de patrimoine** ajoutée dans le menu **Outils** de `Navigation.jsx`, routée via `currentPage = 'patrimoine-declaration'`.

---

## Dégradé — champs manquants

| Champ manquant                            | Comportement                                              |
|-------------------------------------------|-----------------------------------------------------------|
| `birthPlace` / `birthPostalCode` / `jobTitle` | Bandeau d'alerte + champ en rouge italique            |
| Aucun contrat salarial actif              | "Aucun contrat salarial actif" dans la section revenus    |
| Impôt non calculable                      | Ligne "Impôt estimé" masquée                              |
| `address` vide (IMMO_PHYSIQUE)            | Fallback sur `position.label`                             |
| `partner` vide                            | Fallback sur `position.label`                             |
| `acquisitionPrice` absent (IMMO_PHYSIQUE) | Sous-ligne "Prix d'acquisition" masquée                   |
| Aucune dépense enregistrée                | "Aucune dépense enregistrée" dans la section dépenses     |

---

## Migrations SQLite

```sql
-- Sur la table users
ALTER TABLE users ADD COLUMN birth_place TEXT;
ALTER TABLE users ADD COLUMN birth_postal_code TEXT;
ALTER TABLE users ADD COLUMN job_title TEXT;

-- Sur la table positions
ALTER TABLE positions ADD COLUMN acquisition_price DOUBLE;
```
