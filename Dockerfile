# ─── Stage 1 : Build du frontend React ───────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY frontend/package*.json frontend/
RUN cd frontend && npm ci

COPY frontend/ frontend/
# CHANGELOG.md est embarqué dans le bundle JS (modal "Notes de version") via ?raw
COPY CHANGELOG.md CHANGELOG.md
RUN mkdir -p backend/src/main/resources/static \
    && cd frontend && npm run build

# ─── Stage 2 : Build du backend Spring Boot ──────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS backend-builder
WORKDIR /app

COPY backend/.mvn/ .mvn/
COPY backend/mvnw backend/pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:resolve -B -q

COPY backend/src/ src/
COPY --from=frontend-builder /app/backend/src/main/resources/static src/main/resources/static

RUN ./mvnw clean package -DskipTests -B

# ─── Stage 3 : Image d'exécution légère ──────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=backend-builder /app/target/myFinance-*.jar app.jar

RUN mkdir -p /data /logs

EXPOSE 8080
ENTRYPOINT ["java", "-Dspring.profiles.active=docker", "-jar", "app.jar"]
