# Investment Tracker

Application personnelle de gestion d'investissements, hébergée sur NAS en réseau local.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Java 17 + Spring Boot 3.5 |
| Base de données | SQLite |
| Frontend | React + Vite + Recharts |
| Mise à jour des cours | Yahoo Finance API (@Scheduled) |

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
