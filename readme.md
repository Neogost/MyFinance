# MyFinance

Application web personnelle de gestion financière, hébergée sur NAS QNAP en réseau local.

## Fonctionnalités

| Domaine | Statut | Description |
|---------|--------|-------------|
| Authentification | ✅ Implémenté | Login/logout par session cookie, changement de mot de passe |
| Gestion des utilisateurs | ✅ Implémenté | CRUD complet (admin), rôles ADMIN / USER |
| Revenus salariaux | ✅ Implémenté | Contrats, projections net/mensuel/journalier/horaire, bulletins de paie réels |
| Revenus complémentaires | ✅ Implémenté | Locatif, dividendes, aides sociales, autres — totaux par catégorie |
| Gestion du patrimoine | 🔜 À venir | Positions, ordres, valorisation |
| Tableau de bord | 🔜 À venir | Graphiques Recharts (patrimoine, revenus, dépenses) |
| Mise à jour des cours | 🔜 À venir | Yahoo Finance API via tâches @Scheduled |

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Java 17 + Spring Boot 3.5 |
| Base de données | SQLite (fichier local) |
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Graphiques | Recharts |
| Documentation API | Swagger UI (`/swagger-ui.html`) |

## Structure du projet

```
MyFinance/
├── backend/       Java / Spring Boot
├── frontend/      React / Vite
├── docs/          Documentation architecture et API
├── .gitignore
└── readme.md
```

## Lancer le projet en développement

### Prérequis
- Java 17+
- Maven 3.9+
- Node.js 20+

### Backend

```bash
cd backend
mkdir -p data  # créer le dossier SQLite (première fois uniquement)
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# API accessible sur http://localhost:8080
# Swagger UI : http://localhost:8080/swagger-ui.html
```

### Frontend

```bash
cd frontend
npm install    # première fois uniquement
npm run dev
# Accessible sur http://localhost:3000
```

## Déploiement sur NAS

```bash
cd backend
./mvnw clean package -DskipTests
java -jar -Dspring.profiles.active=prod target/myFinance-0.0.1-SNAPSHOT.jar
```

## Variables d'environnement

Le fichier `backend/src/main/resources/application-prod.properties` est dans le `.gitignore`.
Créer ce fichier sur le NAS avant le premier démarrage en prod.

## Tests

```bash
cd backend
./mvnw test
# 107 tests unitaires (services + controllers)
```

## Documentation

| Document | Description |
|----------|-------------|
| `docs/architecture/overview.md` | Architecture générale et diagrammes |
| `docs/architecture/salary.md` | Modèle de données revenus, formules de calcul |
| `docs/api/authentication.md` | API authentification |
| `docs/api/users.md` | API utilisateurs |
| `docs/api/salary-contracts.md` | API contrats salariaux et bulletins |
| `docs/api/other-incomes.md` | API revenus complémentaires |
| `docs/architecture/decisions/` | Décisions d'architecture (ADR) |
