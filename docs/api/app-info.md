# API — Informations sur l'application

Base URL : `http://localhost:8080`

---

## GET /api/version

Retourne la version actuellement déployée de l'application.

**Accès** : public (affichée en pied de landing avant connexion)

```http
GET /api/version
```

### Réponse — 200 OK

```json
{
  "version": "1.15.0"
}
```

La version est extraite du fichier `META-INF/build-info.properties` généré automatiquement lors du build Maven (`spring-boot-maven-plugin` goal `build-info`). Elle correspond à la valeur du champ `<version>` dans `backend/pom.xml`.

### Utilisation

Affiché dans :
- Le footer de toutes les pages (desktop)
- Le bas du menu mobile

> Le versionnage suit le **versionnage sémantique** (`MAJOR.MINOR.PATCH`). Voir la checklist de release dans `docs/deployment/docker-deployment.md`.
