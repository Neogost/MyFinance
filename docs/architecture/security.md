# Architecture — Sécurité

Ce document couvre la configuration de sécurité Spring Boot, la politique de mots de passe, la protection contre les attaques brute-force, la gestion de session, le support HTTPS et le formulaire de connexion frontend.

---

## Vue d'ensemble

```
Navigateur
    │
    ├─ HTTP :8080  ──→  HttpsRedirectConfig (Tomcat)  ──→  302 vers HTTPS
    │
    └─ HTTPS :8443
           │
           ├─ LoginRateLimitFilter  (@Order HIGHEST_PRECEDENCE)
           │       │  compte verrouillé → 429 immédiat (avant Spring Security)
           │
           ├─ Spring Security FilterChain (SecurityConfig)
           │       ├─ CORS
           │       ├─ CSRF (double-submit cookie, prod uniquement)
           │       ├─ Headers HTTP
           │       └─ Autorisation des routes
           │
           ├─ /api/**  →  Controllers REST (authentification requise)
           └─ /**      →  SpaController → index.html (React SPA)
```

---

## SecurityConfig

Fichier : `backend/src/main/java/com/myfinance/config/SecurityConfig.java`

### CORS

```java
config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
config.setAllowedHeaders(List.of("Content-Type", "Accept", "X-XSRF-TOKEN"));
config.setAllowCredentials(true);
config.setMaxAge(3600L);
```

L'origine autorisée est lue depuis `cors.allowed-origins` (propriété par profil).  
En production, le frontend est servi depuis le même JAR Spring Boot — la config CORS est conservée mais n'a aucun effet (même origine, le navigateur n'envoie pas d'en-tête `Origin`).

### CSRF

Stratégie **double-submit cookie** adaptée aux SPA :

```java
CookieCsrfTokenRepository.withHttpOnlyFalse()   // JavaScript peut lire XSRF-TOKEN
CsrfTokenRequestAttributeHandler()              // comparaison brute (non-XOR), compatible Axios
```

- Le backend pose le cookie `XSRF-TOKEN` (non-HttpOnly).
- Axios lit ce cookie automatiquement et l'envoie dans l'en-tête `X-XSRF-TOKEN`.
- Spring Security compare les deux valeurs.
- Les endpoints publics `/api/auth/login` et `/api/auth/register` sont exemptés.

**Désactivation par profil** via `security.csrf.enabled` (défaut : `true`) :
- `false` en dev (frontend `:3000` et backend `:8080` sont cross-origin, le cookie n'est pas lisible par Axios)
- `false` dans les tests (`src/test/resources/application.properties`)

### Headers HTTP de sécurité

| Header | Valeur | Rôle |
|--------|--------|------|
| `X-Frame-Options` | `DENY` | Prévient le clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prévient le MIME sniffing |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS pendant 1 an |
| `Content-Security-Policy` | Voir ci-dessous | Limite les sources autorisées |

Politique CSP :
```
default-src 'self';
style-src 'self' 'unsafe-inline';
script-src 'self';
img-src 'self' data:;
font-src 'self' data:;
connect-src 'self';
object-src 'none';
base-uri 'self'
```

> `'unsafe-inline'` sur `style-src` est nécessaire pour Tailwind CSS (classes inline générées à la compilation).

### Autorisation des routes

```java
.requestMatchers("/api/auth/login", "/api/auth/register").permitAll()  // public
.requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()       // Swagger
.requestMatchers("/api/**").authenticated()                             // API protégée
.anyRequest().permitAll()                                               // fichiers statiques + routes SPA
```

La séparation `/api/**` vs `/**` permet de servir le frontend React sans authentification (le contrôle se fait côté React via `GET /api/auth/me`).

---

## HTTPS / TLS

### Configuration (profil prod)

Fichier : `backend/src/main/resources/application-prod.properties`

```properties
server.port=8443
server.ssl.enabled=true
server.ssl.key-store=file:/share/myFinance/ssl/myfinance.p12
server.ssl.key-store-password=CHANGE_ME
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=myfinance
server.servlet.session.cookie.secure=true
```

### Redirection HTTP → HTTPS

Fichier : `backend/src/main/java/com/myfinance/config/HttpsRedirectConfig.java`  
Profil : prod uniquement (`@Profile("prod")`)

Un second connecteur Tomcat écoute sur le port `8080` en HTTP et retourne un `302 Found` vers le port HTTPS `8443`. La redirection est gérée au niveau Tomcat, avant Spring Security.

```java
Connector connector = new Connector(...);
connector.setPort(8080);
connector.setRedirectPort(httpsPort);  // 8443
factory.addAdditionalTomcatConnectors(connector);
```

### Génération du certificat

```bash
# Auto-signé (développement ou NAS sans domaine)
keytool -genkeypair \
  -alias myfinance \
  -keyalg RSA -keysize 2048 \
  -storetype PKCS12 \
  -keystore /share/myFinance/ssl/myfinance.p12 \
  -validity 3650 \
  -dname "CN=MyFinance NAS, O=Personnel, C=FR" \
  -storepass CHANGE_ME \
  -keypass CHANGE_ME
```

> Avec un nom de domaine, remplacer par un certificat Let's Encrypt (Certbot) pour supprimer l'avertissement navigateur.

### Frontend intégré au JAR

En production, le frontend React est buildé dans `backend/src/main/resources/static/` et servi directement par Spring Boot (même origine → pas de CORS).

```bash
cd frontend && npm run build   # → backend/src/main/resources/static/
cd backend  && mvn clean package -DskipTests
java -jar -Dspring.profiles.active=prod myFinance-0.0.1-SNAPSHOT.jar
```

Le `SpaController` (`config/SpaController.java`) renvoie `index.html` pour toutes les routes SPA sans extension de fichier :

```java
@GetMapping(value = { "/", "/{path:[^\\.]*}" })
public String index() {
    return "forward:/index.html";
}
```

Les fichiers avec extension (`/assets/main.js`, `/favicon.svg`…) sont servis directement par le `ResourceHttpRequestHandler` de Spring Boot.

---

## Protection brute-force

### Composants

| Composant | Rôle |
|-----------|------|
| `LoginAttemptService` | Compte les échecs par login en mémoire (`ConcurrentHashMap`), calcule la durée de blocage |
| `LoginRateLimitFilter` | Filtre Servlet `@Order(HIGHEST_PRECEDENCE)`, bloque avant Spring Security |
| `SecurityConfig` failure handler | Incrémente le compteur à chaque échec d'authentification |
| `SecurityConfig` success handler | Réinitialise le compteur après une connexion réussie |

### Durée de blocage exponentielle

```
durée = min(base × 2^(n-1), max)
```

Avec les valeurs par défaut prod (`base=5 min`, `max=80 min`) :

| Tentatives échouées | Durée |
|--------------------:|-------|
| 5 – 9  | 5 min  |
| 10 – 14 | 10 min |
| 15 – 19 | 20 min |
| 20 – 24 | 40 min |
| 25+     | 80 min |

### Paramétrage par profil

```properties
# Prod (défauts)
security.login.max-attempts=5
security.login.base-lock-minutes=5
security.login.max-lock-minutes=80

# Dev (seuils réduits pour les tests)
security.login.max-attempts=3
security.login.base-lock-minutes=1
security.login.max-lock-minutes=10
```

### Réponse HTTP 429

```json
{
  "message": "Compte bloqué après trop de tentatives. Réessayez dans 5 min.",
  "secondesRestantes": 287
}
```

---

## Politique de mot de passe

### Règles

| Règle | Valeur |
|-------|--------|
| Longueur minimale | 8 caractères |
| Longueur maximale | 128 caractères |
| Au moins une majuscule | obligatoire |
| Au moins une minuscule | obligatoire |
| Au moins un chiffre | obligatoire |

### Validation backend

Appliquée via Bean Validation sur les DTOs :

```java
@Size(min = 8, max = 128)
@Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$")
String password;
```

Présent sur : `CreateUserRequest`, `ChangePasswordRequest`, `CreateRegistrationRequest`.

### Indicateurs frontend

Composant `PasswordHints` affiché en temps réel sous les champs de saisie. Les règles non respectées apparaissent en gris, les règles validées en vert.

Présent sur : `ChangePasswordForm`, `UserForm`, `RegistrationForm`.

---

## Formulaire de connexion (LoginForm)

Fichier : `frontend/src/components/LoginForm.jsx`

### États

| État | Type | Description |
|------|------|-------------|
| `username` / `password` | `string` | Valeurs des champs |
| `loading` | `boolean` | Désactive le bouton pendant la requête |
| `error` | `string \| null` | Message d'erreur affiché |
| `lockoutSecondes` | `number` | Secondes restantes avant déverrouillage (0 = pas de blocage) |

### Gestion du verrouillage

Quand le backend retourne `429`, le frontend :
1. Extrait `secondesRestantes` de la réponse
2. Lance un `setInterval` de 1 seconde pour décrémenter le compteur
3. Désactive les champs et le bouton tant que `lockoutSecondes > 0`
4. Affiche le message d'erreur en orange avec le temps restant formaté
5. Réactive automatiquement le formulaire quand le compteur atteint 0

```
lockoutSecondes > 0
  → champs disabled
  → bouton : "Bloqué (X min Y s)"
  → message orange : "Réessayez dans X min Y s"

lockoutSecondes === 0
  → formulaire réactivé
  → message d'erreur effacé
```

### Navigation vers l'inscription

Le lien "Faire une demande" affiche le composant `RegistrationForm` en remplacement de `LoginForm`.  
La bascule se fait via l'état `showRegister` — le test `if (showRegister)` est placé **après** toutes les déclarations de hooks pour respecter les règles React (pas de hook conditionnel).

```jsx
// Tous les hooks déclarés ici (useState, useRef, useEffect)
// ...

if (showRegister) {
  return <RegistrationForm onBack={() => setShowRegister(false)} />
}

// Rendu du formulaire de login
```

---

## Gestion de session

| Paramètre | Valeur | Fichier |
|-----------|--------|---------|
| Durée de vie | 12 heures | `application.properties` |
| Cookie `HttpOnly` | `true` | `application.properties` |
| Cookie `SameSite` | `Strict` | `application.properties` |
| Cookie `Secure` | `true` en prod | `application-prod.properties` |

La session est restaurée au rechargement de page via `GET /api/auth/me` dans `App.jsx` — si le cookie `JSESSIONID` est encore valide, l'utilisateur n'a pas à se reconnecter.
