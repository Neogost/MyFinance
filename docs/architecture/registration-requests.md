# Demandes d'inscription — Architecture

## Vue d'ensemble

Permet à un visiteur de soumettre une demande de création de compte depuis la page de connexion. La demande est mise en attente et validée (ou rejetée) manuellement par un administrateur. L'utilisateur n'est actif et ne peut se connecter qu'après approbation.

---

## Modèle de données

### Entité `UserRegistrationRequest` (table `user_registration_requests`)

| Colonne          | Type           | Contrainte              | Description                                    |
|------------------|----------------|-------------------------|------------------------------------------------|
| `id`             | BIGINT         | PK, auto-increment      |                                                |
| `login`          | VARCHAR        | NOT NULL, UNIQUE        | Login souhaité par le demandeur                |
| `first_name`     | VARCHAR(100)   | NOT NULL                |                                                |
| `last_name`      | VARCHAR(100)   | NOT NULL                |                                                |
| `hashed_password`| VARCHAR        | NOT NULL                | BCrypt haché à la soumission                   |
| `status`         | VARCHAR        | NOT NULL, défaut PENDING | `PENDING` / `APPROVED` / `REJECTED`           |
| `created_at`     | DATETIME       | NOT NULL                | Horodatage de la soumission                    |
| `reviewed_at`    | DATETIME       | nullable                | Horodatage de la décision admin                |
| `reviewed_by`    | VARCHAR        | nullable                | Login de l'administrateur ayant statué         |

### Enum `RegistrationStatus`

```
PENDING   → demande en attente de traitement
APPROVED  → acceptée, compte utilisateur créé
REJECTED  → refusée par l'administrateur
```

---

## Flux fonctionnel

```
Visiteur                        Backend                      Admin
   │                               │                           │
   │  POST /api/auth/register      │                           │
   │──────────────────────────────►│                           │
   │  (login, nom, prénom, mdp)    │                           │
   │                               │ Vérifie unicité login     │
   │                               │ (users + requests PENDING)│
   │                               │ Hache le mot de passe     │
   │                               │ Sauvegarde PENDING        │
   │◄──────────────────────────────│                           │
   │  201 Created                  │                           │
   │                               │                           │
   │                               │   GET /api/admin/registrations
   │                               │◄──────────────────────────│
   │                               │   (login, nom, prénom, statut)
   │                               │──────────────────────────►│
   │                               │                           │
   │                               │   POST .../approve        │
   │                               │◄──────────────────────────│
   │                               │ Crée User (role=USER)     │
   │                               │ Status → APPROVED         │
   │                               │──────────────────────────►│
   │                               │   200 OK                  │
   │                               │                           │
   │  POST /api/auth/login         │                           │
   │──────────────────────────────►│                           │
   │  → Authentification standard Spring Security              │
```

---

## Règles métier

- **Unicité du login** : rejeté en 409 si le login existe déjà dans `users` **ou** dans `user_registration_requests` avec le statut `PENDING`.
- **Hachage immédiat** : le mot de passe est haché (BCrypt) avant persistance — le plain-text n'est jamais stocké.
- **Approbation → création User** : le service crée directement l'entité `User` avec le hash déjà stocké (pas de double-hachage). Profil fiscal par défaut : `fiscalParts=1.0`, `useFlatRateDeduction=true`, `role=USER`.
- **Rejet** : la demande est marquée `REJECTED`, aucun compte n'est créé. La demande reste visible dans l'historique admin.
- **Demandes non-PENDING** : toute tentative d'approuver ou rejeter une demande déjà traitée lève une `ResponseStatusException(409)`.

---

## Sécurité

| Endpoint                                    | Visibilité          |
|---------------------------------------------|---------------------|
| `POST /api/auth/register`                   | Public (sans auth)  |
| `GET /api/admin/registrations`              | ADMIN uniquement    |
| `POST /api/admin/registrations/{id}/approve`| ADMIN uniquement    |
| `POST /api/admin/registrations/{id}/reject` | ADMIN uniquement    |

Le mot de passe est soumis via HTTPS (obligatoire en production) et haché immédiatement côté serveur.

---

## Frontend

### Page de connexion (`LoginForm.jsx`)

Lien "Pas encore de compte ?" → bascule vers le formulaire d'inscription (`RegistrationForm.jsx`).

### Formulaire d'inscription (`RegistrationForm.jsx`)

Champs : login, prénom, nom, mot de passe (avec indicateur de complexité), confirmation du mot de passe.
Après soumission réussie : message de confirmation, retour vers la page de connexion.

### Page admin (`RegistrationRequestPage.jsx`)

Tableau des demandes avec filtre par statut (`PENDING` par défaut). Boutons **Approuver** / **Rejeter** sur chaque ligne en attente. L'approbation ou le rejet met à jour la ligne immédiatement (optimistic update).

### Badge admin (Navigation)

Le menu Administration affiche un badge rouge avec le nombre de demandes `PENDING`. Ce compteur est chargé au login (si ADMIN) et mis à jour après chaque action d'approbation/rejet.

---

## Migration SQLite

La table `user_registration_requests` est créée automatiquement par `spring.jpa.hibernate.ddl-auto=update` en dev. En production, exécuter manuellement :

```sql
CREATE TABLE IF NOT EXISTS user_registration_requests (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    login            VARCHAR(100) NOT NULL UNIQUE,
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    hashed_password  VARCHAR      NOT NULL,
    status           VARCHAR      NOT NULL DEFAULT 'PENDING',
    created_at       DATETIME     NOT NULL,
    reviewed_at      DATETIME,
    reviewed_by      VARCHAR
);
```
