# MyFinance — Contexte projet pour Claude

## Description
Application web personnelle de gestion d'investissements financiers,
hébergée sur NAS QNAP en réseau local (pas d'accès utilisateur depuis l'extérieur).
Permet de suivre un portefeuille, enregistrer des transactions,
visualiser l'évolution dans le temps et mettre à jour les cours automatiquement.

## Stack technique
- **Backend** : Java 17, Spring Boot 3.5, Maven
- **Base de données** : SQLite (fichier local `backend/data/myfinance-dev.db`)
- **Frontend** : React + Vite, Tailwind CSS v4 (styles), Recharts (graphiques), Axios (appels API)
- **Mise à jour des cours** : Yahoo Finance API via tâches @Scheduled Spring
- **Documentation API** : Swagger UI via springdoc-openapi (`/swagger-ui.html`)

## Structure du projet (monorepo)
```
MyFinance/
├── backend/      Java / Spring Boot (pom.xml, mvnw, src/)
├── frontend/     React / Vite
├── docs/         Documentation architecture et API
├── .gitignore
└── readme.md
```

## Architecture
- Pattern REST : le backend expose une API `/api/**`, le frontend l'appelle via HTTP
- Séparation stricte backend (port 8080) / frontend (port 3000)
- Profils Spring : `dev` (local) et `prod` (NAS)
- Authentification : session cookie Spring Security + BCrypt

## Structure des packages Java
```
com.myfinance
├── config/       Configuration Spring (Security, CORS, OpenAPI, DataInitializer)
├── domain/       Entités JPA (@Entity) mappées sur SQLite
├── repository/   Interfaces Spring Data JPA (pas d'implémentation manuelle)
├── service/      Logique métier, jamais appelée directement depuis un controller
├── controller/   @RestController exposant les endpoints /api/**
└── dto/          Records Java immuables échangés avec le frontend
```

## Structure frontend
```
frontend/src/
├── api/              Appels HTTP (auth.js, users.js) — axios avec withCredentials: true
├── components/
│   ├── LoginForm.jsx
│   ├── Navigation.jsx
│   └── users/        UserList, UserForm, ChangePasswordForm
├── App.jsx           Routage par état (currentPage : dashboard | users | profile)
├── App.css           Fichier vide (styles migrés vers Tailwind)
└── index.css         Point d'entrée CSS — @import "tailwindcss"
```

## Styles et thème
- **Tailwind CSS v4** via plugin `@tailwindcss/vite` — pas de `tailwind.config.js` requis
- Toutes les classes sont des utilitaires Tailwind inline dans les JSX
- Palette : indigo-600 (primaire), gray-100 (fond), violet-100/800 (badges rôle)
- `App.css` est conservé vide pour compatibilité — ne pas y remettre de styles

## Documentation associée
- Fonctionnalités détaillées : `docs/architecture/overview.md`
- Gestion des utilisateurs et droits : `docs/architecture/userManagement.md`
- Modèle de données (diagramme de classes) : `docs/architecture/diagram/class-diagram.mmd`
- Décisions d'architecture (ADR) : `docs/architecture/decisions/`
- API authentification : `docs/api/authentication.md`
- API utilisateurs : `docs/api/users.md`

## Endpoints backend existants

| Méthode | URL | Rôle requis | Description |
|---------|-----|-------------|-------------|
| `POST` | `/api/auth/login` | Public | Login (form-urlencoded) → cookie JSESSIONID |
| `POST` | `/api/auth/logout` | Authentifié | Déconnexion |
| `GET` | `/api/auth/me` | Authentifié | Utilisateur courant |
| `PUT` | `/api/auth/password` | Authentifié | Changement de son propre mot de passe |
| `GET` | `/api/users` | ADMIN | Liste tous les utilisateurs |
| `GET` | `/api/users/{id}` | ADMIN | Détail d'un utilisateur |
| `POST` | `/api/users` | ADMIN | Créer un utilisateur |
| `PUT` | `/api/users/{id}` | ADMIN | Modifier un utilisateur (password optionnel) |
| `DELETE` | `/api/users/{id}` | ADMIN | Supprimer un utilisateur |

## Gestion des erreurs
- Les services lèvent des `ResponseStatusException` (404, 409, 401) — jamais depuis les controllers
- Les controllers ne font que déléguer et retourner le `ResponseEntity` approprié
- Spring Security retourne du JSON (pas de redirect HTML) grâce aux handlers personnalisés dans `SecurityConfig`

## Conventions de tests
- Tests unitaires service : `@ExtendWith(MockitoExtension.class)` + `@Mock` / `@InjectMocks`
- Tests controller : `@WebMvcTest(XController.class)` + `@Import({SecurityConfig.class, PasswordEncoderConfig.class})`
  + `@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")`
  + `@MockitoBean XService` + `@WithMockUser(roles = "ADMIN")` pour les endpoints protégés
- `SecurityConfig` et `PasswordEncoderConfig` doivent rester `public` pour être importables dans les tests

## Conventions de code
- Utiliser **Lombok** : `@Data`, `@Builder`, `@RequiredArgsConstructor` sur les entités et services
- Utiliser **Records Java** pour les DTOs (immuables par nature)
- Les controllers ne contiennent **aucune logique métier** — ils délèguent aux services
- Les entités JPA ne sont **jamais** retournées directement dans les réponses HTTP (toujours un DTO)
- Nommage : `camelCase` pour les variables/méthodes, `PascalCase` pour les classes
- Commentaires en **français**
- Endpoints admin protégés par `@PreAuthorize("hasRole('ADMIN')")`

## Commandes utiles
```bash
# Lancer le backend en développement
cd backend
mkdir -p data  # première fois uniquement
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Compiler le JAR pour le NAS
cd backend
./mvnw clean package -DskipTests

# Lancer les tests
cd backend
./mvnw test

# Lancer sur le NAS
java -jar -Dspring.profiles.active=prod backend/target/myFinance-0.0.1-SNAPSHOT.jar

# Lancer le frontend en développement
cd frontend
npm run dev
```

## Points d'attention
- Ne jamais retourner une entité JPA directement depuis un @RestController
- Le profil `prod` désactive les logs SQL et valide le schéma sans le modifier
- Le scheduler Yahoo Finance est désactivé en profil `dev` (évite de spammer l'API)
- Le fichier `application-prod.properties` est dans le `.gitignore`
- SQLite ne supporte pas les connexions concurrentes massives — c'est acceptable ici (usage mono-utilisateur)
- Le Swagger UI est accessible en dev sur `http://localhost:8080/swagger-ui.html`
- En cas de changement d'une information importante, la documentation doit être produite ou mise à jour

## Utilisation de la documentation
- Toujours consulter `docs/api/` avant de modifier un controller
- Se référer à `docs/architecture/diagram/class-diagram.mmd` pour toute modification des entités JPA
- Ne pas inventer de structure de données non documentée

## Statut du projet
🚧 En cours de développement

**Implémenté :**
- Authentification (session cookie, BCrypt, login/logout/me)
- Gestion des utilisateurs CRUD (admin) + changement de mot de passe self-service
- Frontend : navigation, tableau CRUD utilisateurs, formulaire modal, page profil
- Tests unitaires : 28 tests (UserService + UserController)
- Documentation API : `docs/api/` | ADR : `docs/architecture/decisions/`

**À venir :**
- Regroupements familiaux (`FamilyGroup`)
- Gestion du patrimoine (positions, ordres)
- Scheduler Yahoo Finance
- Tableau de bord avec graphiques (Recharts)
