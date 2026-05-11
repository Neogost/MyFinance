# API — Hauts faits (Achievements)

Endpoints du système de gamification : récupération des badges débloqués par l'utilisateur connecté et marquage des nouveautés comme vues.

> Architecture détaillée et catalogue complet des 67 badges : [`docs/architecture/achievements.md`](../architecture/achievements.md)

---

## Endpoints

### `GET /api/achievements/me`

Retourne le catalogue complet des hauts faits avec, pour chaque badge, l'état de déblocage de l'utilisateur connecté.

**Authentification :** session cookie requis · accessible à tout utilisateur authentifié.

**Comportement :**
- Évalue tous les badges et persiste les nouveaux niveaux dans la **même transaction** (évite `SQLITE_BUSY_SNAPSHOT`)
- Fallback silencieux : si le lock SQLite ne peut être acquis, retourne les badges déjà persistés sans réévaluation
- Les badges secrets non encore débloqués sont **masqués** : nom = `"???"`, emoji = `"❓"`, description = `"Badge secret — à découvrir !"`, seuils = `null`

**Réponse — `UserAchievementsDto`**
```json
{
  "totalUnlocked": 12,
  "totalBadges": 67,
  "unseen": 2,
  "achievements": [
    {
      "code": "TO_THE_MOON",
      "emoji": "🚀",
      "name": "To The Moon",
      "description": "Patrimoine total déclaré",
      "sensitivity": "FORTE",
      "secret": false,
      "earnedLevel": 2,
      "unlockedAt": "2026-04-15T14:32:00",
      "isNew": true,
      "levels": [
        { "level": 1, "palierName": "Bronze",  "palierEmoji": "🥉", "threshold": 50000,  "earned": true  },
        { "level": 2, "palierName": "Argent",  "palierEmoji": "🥈", "threshold": 100000, "earned": true  },
        { "level": 3, "palierName": "Or",      "palierEmoji": "🥇", "threshold": 250000, "earned": false },
        { "level": 4, "palierName": "Diamant", "palierEmoji": "💎", "threshold": 1000000, "earned": false }
      ]
    }
  ]
}
```

| Champ | Description |
|---|---|
| `totalUnlocked` | Somme des niveaux confirmés sur l'ensemble des badges (un badge à 2 niveaux confirmés compte pour 2) |
| `totalBadges` | Taille du catalogue (67 en v1.8.0) |
| `unseen` | Nombre de badges débloqués depuis `lastAchievementSeenAt` (affiché dans la navigation) |
| `achievements[].code` | Identifiant unique du badge (`AchievementCode` enum) |
| `achievements[].sensitivity` | `FORTE` / `MOYENNE` / `FAIBLE` / `NULLE` — détermine la robustesse de la validation (3 snapshots consécutifs pour `FORTE`) |
| `achievements[].secret` | `true` pour les easter eggs (`VAMPIRE`, `THE_ANSWER`) |
| `achievements[].earnedLevel` | Plus haut niveau confirmé (0 = aucun) |
| `achievements[].unlockedAt` | Date de déblocage du **dernier** niveau confirmé (null si non débloqué) |
| `achievements[].isNew` | `true` si `unlockedAt > user.lastAchievementSeenAt` |
| `achievements[].levels[]` | Détail de chaque palier — `threshold` est `null` pour les badges uniques et les paliers secrets non débloqués |

---

### `PUT /api/achievements/me/seen`

Marque tous les badges comme "vus" en mettant à jour `users.last_achievement_seen_at`. Efface le compteur de nouveautés (`unseen`) affiché dans la navigation.

**Authentification :** session cookie requis.

**Réponse :** `204 No Content`

**Effet de bord :** met à jour `user.lastAchievementSeenAt = LocalDateTime.now()` en base.

---

## Erreurs

| Code HTTP | Cas |
|---|---|
| `401` | Utilisateur non authentifié |
| `500` | Erreur serveur — la table `user_achievement` n'est pas accessible (migration 020 non jouée ?) |

Le fallback sur `CannotAcquireLockException` (SQLite `BUSY_SNAPSHOT`) ne remonte **jamais** une 500 à l'utilisateur : la route retourne les badges déjà persistés et un log WARN côté serveur.
