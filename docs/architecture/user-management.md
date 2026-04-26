# Gestion des utilisateurs et des accès

## Vue d'ensemble

L'authentification repose sur Spring Security avec :
- **Hashage du mot de passe** : BCrypt
- **Session** : cookie `JSESSIONID` HTTP (pas de JWT)
- **Durée de session** : 12 heures (`server.servlet.session.timeout=12h`)
- **Pas de SSO** ni d'authentification externe

---

## Rôles

| Rôle | Description |
|------|-------------|
| `USER` | Gère et consulte ses propres données financières |
| `ADMIN` | Dispose de tous les droits USER + accès aux fonctionnalités d'administration globales |

---

## Modèle utilisateur — `User`

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | `Long` | Non | Identifiant |
| `firstName` | `String` | Non | Prénom |
| `lastName` | `String` | Non | Nom de famille |
| `birthDate` | `LocalDate` | Oui | Date de naissance |
| `login` | `String` | Non | Identifiant unique (username Spring Security) |
| `password` | `String` | Non | Hash BCrypt — jamais exposé dans les réponses |
| `role` | `RoleEnum` | Non | `USER` ou `ADMIN` |
| `fiscalParts` | `Float` | Oui | Quotient familial (ex : 1.0, 2.5) |
| `useFlatRateDeduction` | `Boolean` | Oui | `true` = abattement 10 % ; `false` = frais réels |
| `customProfessionalDeduction` | `Float` | Oui | Total frais réels calculé (€) |
| `realExpensesTransportKm` | `Integer` | Oui | Kilométrage domicile-travail aller-retour annuel |
| `realExpensesTransportCv` | `Integer` | Oui | CV fiscal : 3, 4, 5, 6, 7 |
| `realExpensesTransportElectric` | `Boolean` | Oui | Véhicule électrique (×1.20) |
| `realExpensesPublicTransport` | `Float` | Oui | Abonnements transport en commun (€/an) |
| `realExpensesMeals` | `Float` | Oui | Frais de repas (€/an) |
| `realExpensesClothing` | `Float` | Oui | Vêtements professionnels (€/an) |
| `realExpensesTraining` | `Float` | Oui | Formation professionnelle (€/an) |
| `realExpensesEquipment` | `Float` | Oui | Matériel et fournitures pros (€/an) |
| `realExpensesPhone` | `Float` | Oui | Téléphone/internet — part pro (€/an) |
| `realExpensesDoubleResidence` | `Float` | Oui | Double résidence (€/an) |
| `realExpensesOther` | `Float` | Oui | Autres frais justifiés (€/an) |
| `realExpensesTeleworkDays` | `Integer` | Oui | Jours de télétravail par an |
| `realExpensesTeleworkEmployerDaily` | `Float` | Oui | Remboursement employeur télétravail (€/jour) |
| `safetyNetMode` | `SafetyNetMode` | Oui | `MONTHS_EXPENSES`, `MONTHS_SALARY` ou `FIXED_AMOUNT` |
| `safetyNetMonths` | `Double` | Oui | Nombre de mois (modes MONTHS_*) |
| `safetyNetAmount` | `Double` | Oui | Montant fixe (mode FIXED_AMOUNT) |
| `birthPlace` | `String` | Oui | Lieu de naissance — déclaration patrimoine |
| `birthPostalCode` | `String` | Oui | Code postal de naissance — déclaration patrimoine |
| `jobTitle` | `String` | Oui | Intitulé de poste — déclaration patrimoine |
| `familyGroup` | `FamilyGroup` | Oui | Groupe familial (nullable si aucun) |

---

## Profil fiscal

Les champs `fiscalParts`, `useFlatRateDeduction`, `customProfessionalDeduction` et `realExpenses*` constituent le **profil fiscal** utilisé par le Simulateur des impôts.

- `useFlatRateDeduction = true` → abattement forfaitaire 10 % (min 504 €, max 13 522 €)
- `useFlatRateDeduction = false` → les champs `realExpenses*` calculent `customProfessionalDeduction` via `ProfileService.computeTotalRealExpenses()`

> Si `fiscalParts` est null, le simulateur et les projections nettes du contrat retournent `null` pour les champs fiscaux.

**Endpoints :** `PUT /api/profile/fiscal` (self-service) · `PUT /api/users/{id}` (admin)

---

## Matelas de sécurité

### Modes de calcul

| Mode | Enum | Calcul de l'objectif | Champ utilisé |
|------|------|----------------------|---------------|
| Mois de dépenses | `MONTHS_EXPENSES` | `safetyNetMonths × totalMonthlyExpenses` | `safetyNetMonths` |
| Mois de salaire | `MONTHS_SALARY` | `safetyNetMonths × activeNetMonthlySalary` | `safetyNetMonths` |
| Seuil fixe | `FIXED_AMOUNT` | `safetyNetAmount` | `safetyNetAmount` |

Sources des données :
- `totalMonthlyExpenses` : `GET /api/recurring-expenses/summary` → `totalMonthlyAmount`
- `activeNetMonthlySalary` : `GET /api/salary-contracts` → premier contrat ACTIVE → `monthlyNetAfterTax`

Si les données sources sont absentes, l'objectif calculé est `null`.

### Calcul côté frontend

```
currentSafetyNet = Σ currentValueEur des positions ACTIVE où category ∈ { LIVRET, LIQUIDITE }
coveragePct = currentSafetyNet / targetSafetyNet × 100
```

| État | Condition | Couleur |
|------|-----------|---------|
| Insuffisant | `coveragePct < 80` | Rouge |
| Presque atteint | `80 ≤ coveragePct < 100` | Ambre |
| Objectif atteint | `coveragePct ≥ 100` | Emerald |

**Endpoint :** `PUT /api/profile/safety-net`

**Points d'intégration UI :**
- Profil → section "Matelas de sécurité" (mode + valeur + aperçu en temps réel)
- Tableau de bord → `SafetyNetWidget` (valeur actuelle, objectif, barre de progression)
- Page Patrimoine → mention sur les cartes LIVRET / LIQUIDITE

---

## Demandes d'inscription — `UserRegistrationRequest`

### Flux fonctionnel

```
Visiteur                        Backend                      Admin
   │                               │                           │
   │  POST /api/auth/register      │                           │
   │──────────────────────────────►│                           │
   │  (login, nom, prénom, mdp)    │                           │
   │                               │ Vérifie unicité login     │
   │                               │ Hache le mot de passe     │
   │                               │ Sauvegarde PENDING        │
   │◄──────────────────────────────│                           │
   │  201 Created                  │                           │
   │                               │                           │
   │                               │   GET /api/admin/registrations
   │                               │◄──────────────────────────│
   │                               │──────────────────────────►│
   │                               │                           │
   │                               │   POST .../approve        │
   │                               │◄──────────────────────────│
   │                               │ Crée User (role=USER)     │
   │                               │ Status → APPROVED         │
   │                               │──────────────────────────►│
   │  POST /api/auth/login ────────►│                          │
```

### Modèle — table `user_registration_requests`

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | BIGINT | PK | Identifiant |
| `login` | VARCHAR(100) | NOT NULL, UNIQUE | Login souhaité |
| `first_name` | VARCHAR(100) | NOT NULL | |
| `last_name` | VARCHAR(100) | NOT NULL | |
| `hashed_password` | VARCHAR | NOT NULL | BCrypt haché à la soumission |
| `status` | VARCHAR | NOT NULL, défaut PENDING | `PENDING` / `APPROVED` / `REJECTED` |
| `created_at` | DATETIME | NOT NULL | Horodatage de la soumission |
| `reviewed_at` | DATETIME | nullable | Horodatage de la décision admin |
| `reviewed_by` | VARCHAR | nullable | Login de l'admin ayant statué |

### Règles métier

- **Unicité du login** : rejeté `409` si le login existe dans `users` **ou** dans `user_registration_requests` avec statut `PENDING`.
- **Hachage immédiat** : le mot de passe est haché BCrypt avant persistance.
- **Approbation** : crée directement l'entité `User` avec le hash stocké (pas de double-hachage). Profil par défaut : `fiscalParts=1.0`, `useFlatRateDeduction=true`, `role=USER`.
- **Rejet** : demande marquée `REJECTED`, aucun compte créé, historique conservé.
- **Demandes déjà traitées** : toute tentative d'approuver/rejeter une demande non-PENDING lève `409`.

### Frontend

- `LoginForm.jsx` → lien "Pas encore de compte ?" → `RegistrationForm.jsx`
- `RegistrationForm.jsx` : login, prénom, nom, mdp (indicateur de complexité), confirmation
- `RegistrationRequestPage.jsx` : tableau PENDING par défaut, boutons Approuver / Rejeter, optimistic update
- Navigation admin : badge rouge avec compteur de demandes `PENDING`

---

## Matrice des droits d'accès

### Administration

| Action | USER | ADMIN |
|--------|:----:|:-----:|
| Gérer son propre mot de passe | ✓ | ✓ |
| Mettre à jour son propre profil (safety-net, fiscal, personal-info) | ✓ | ✓ |
| Lister / créer / modifier / supprimer les utilisateurs | — | ✓ |
| Valider les demandes d'inscription | — | ✓ |
| Consulter l'historique des connexions | — | ✓ |
| Gérer les taux de change | — | ✓ |
| Mettre à jour les cours des instruments | — | ✓ |
| Gérer les snapshots de n'importe quel utilisateur | — | ✓ |
| Déclencher la mise à jour automatique des cours | — | ✓ |
| Modérer les groupes familiaux | — | ✓ |
| Simuler l'impôt d'un autre utilisateur | — | ✓ |

### Données personnelles

| Action | Propriétaire | ADMIN |
|--------|:-----------:|:-----:|
| Gérer ses contrats salariaux (révisions, bulletins, primes, avantages, astreintes) | ✓ | ✓ |
| Gérer ses revenus complémentaires | ✓ | ✓ |
| Gérer ses dépenses récurrentes et budgets | ✓ | ✓ |
| Gérer ses positions, ordres, snapshots | ✓ | ✓ |
| Gérer ses passifs (possessions) | ✓ | ✓ |
| Gérer ses dettes | ✓ | ✓ |
| Gérer ses objectifs patrimoniaux | ✓ | ✓ |
| Accéder aux données d'un autre utilisateur | — | ✓ |

### Inscription

| Action | Public | USER | ADMIN |
|--------|:------:|:----:|:-----:|
| Soumettre une demande d'inscription | ✓ | — | — |
| Approuver / rejeter une demande | — | — | ✓ |

---

## Politique de mot de passe

| Règle | Valeur |
|-------|--------|
| Longueur minimale | 8 caractères |
| Longueur maximale | 128 caractères |
| Au moins une majuscule | Obligatoire |
| Au moins une minuscule | Obligatoire |
| Au moins un chiffre | Obligatoire |

Validation via Bean Validation (`@Size`, `@Pattern`) sur `CreateUserRequest`, `UpdateUserRequest`, `ChangePasswordRequest`, `CreateRegistrationRequest`.

---

## Endpoints

| Méthode | URL | Rôle | Description |
|---------|-----|------|-------------|
| `POST` | `/api/auth/login` | Public | Connexion (form-urlencoded) |
| `POST` | `/api/auth/logout` | Authentifié | Déconnexion |
| `GET` | `/api/auth/me` | Authentifié | Utilisateur courant |
| `PUT` | `/api/auth/password` | Authentifié | Changer son propre mot de passe |
| `POST` | `/api/auth/register` | Public | Soumettre une demande d'inscription |
| `PUT` | `/api/profile/safety-net` | Authentifié | Mettre à jour le matelas de sécurité |
| `PUT` | `/api/profile/fiscal` | Authentifié | Mettre à jour le profil fiscal |
| `PUT` | `/api/profile/personal-info` | Authentifié | Mettre à jour les informations personnelles |
| `GET` | `/api/users` | ADMIN | Lister tous les utilisateurs |
| `GET` | `/api/users/{id}` | ADMIN | Détail d'un utilisateur |
| `POST` | `/api/users` | ADMIN | Créer un utilisateur |
| `PUT` | `/api/users/{id}` | ADMIN | Modifier un utilisateur |
| `DELETE` | `/api/users/{id}` | ADMIN | Supprimer un utilisateur |
| `GET` | `/api/admin/registrations` | ADMIN | Lister les demandes d'inscription |
| `POST` | `/api/admin/registrations/{id}/approve` | ADMIN | Approuver une demande |
| `POST` | `/api/admin/registrations/{id}/reject` | ADMIN | Rejeter une demande |
