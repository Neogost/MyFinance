# Patterns de développement — Backend

Référence de démarrage rapide pour implémenter un nouveau module backend.
Tous les exemples sont tirés du code existant et représentent les conventions du projet.

---

## 1. Entité JPA

```java
package com.myfinance.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "nom_table")       // snake_case
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonEntite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relation propriétaire — toujours LAZY
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Enum stocké en String
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MonEnum type;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private Float amount;

    // Champ nullable → pas d'annotation @Column requise
    private LocalDate endDate;

    // Texte long
    @Column(length = 500)
    private String notes;
}
```

**Règles :**
- Lombok `@Data @Builder @NoArgsConstructor @AllArgsConstructor` — toujours les 4
- `FetchType.LAZY` systématique sur les `@ManyToOne`
- `@Enumerated(EnumType.STRING)` — jamais ORDINAL
- Colonnes obligatoires → `nullable = false`

---

## 2. Enum

```java
package com.myfinance.domain;

public enum MonEnum {
    VALEUR_A,
    VALEUR_B,
    AUTRE
}
```

> ⚠ Après ajout d'une valeur à un enum existant, la CHECK constraint SQLite doit être migrée manuellement (voir § Migration SQLite dans les points d'attention de CLAUDE.md).

---

## 3. Repository

```java
package com.myfinance.repository;

import com.myfinance.domain.MonEntite;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MonEntiteRepository extends JpaRepository<MonEntite, Long> {

    // Convention : findBy + champ + OrderBy + champ + Asc/Desc
    List<MonEntite> findByUserOrderByLabelAsc(User user);
}
```

---

## 4. DTOs — Records Java

### DTO de réponse (avec factory statique)

```java
package com.myfinance.dto;

import com.myfinance.domain.MonEntite;
import com.myfinance.domain.MonEnum;
import java.time.LocalDate;

public record MonEntiteDto(
        Long id,
        MonEnum type,
        String label,
        Float amount,
        // Champs calculés à la volée — jamais persistés
        Float computedValue,
        LocalDate endDate
) {
    public static MonEntiteDto from(MonEntite e) {
        float computed = e.getAmount() * 2f; // exemple

        return new MonEntiteDto(
                e.getId(),
                e.getType(),
                e.getLabel(),
                e.getAmount(),
                computed,
                e.getEndDate()
        );
    }
}
```

### DTO de création (avec validation Bean Validation)

```java
package com.myfinance.dto;

import com.myfinance.domain.MonEnum;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record CreateMonEntiteRequest(
        @NotNull MonEnum type,
        @NotBlank String label,
        @NotNull @Positive Float amount,
        @NotNull @DecimalMin("0.01") @DecimalMax("100.0") Float percentage,
        LocalDate endDate,   // nullable → pas d'annotation
        String notes         // nullable → pas d'annotation
) {}
```

### DTO de modification (identique au Create en général)

```java
public record UpdateMonEntiteRequest(
        @NotNull MonEnum type,
        @NotBlank String label,
        @NotNull @Positive Float amount,
        @NotNull @DecimalMin("0.01") @DecimalMax("100.0") Float percentage,
        LocalDate endDate,
        String notes
) {}
```

---

## 5. Service

```java
package com.myfinance.service;

import com.myfinance.domain.MonEntite;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.repository.MonEntiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MonEntiteService {

    private final MonEntiteRepository monEntiteRepository;

    // ── Lecture ────────────────────────────────────────────────

    public List<MonEntiteDto> findAllByUser(User user) {
        return monEntiteRepository.findByUserOrderByLabelAsc(user)
                .stream()
                .map(MonEntiteDto::from)
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public MonEntiteDto create(CreateMonEntiteRequest request, User user) {
        MonEntite entity = MonEntite.builder()
                .user(user)
                .type(request.type())
                .label(request.label())
                .amount(request.amount())
                .endDate(request.endDate())
                .notes(request.notes())
                .build();

        return MonEntiteDto.from(monEntiteRepository.save(entity));
    }

    // ── Modification ───────────────────────────────────────────

    public MonEntiteDto update(Long id, UpdateMonEntiteRequest request, User currentUser) {
        MonEntite entity = getWithOwnershipCheck(id, currentUser);

        entity.setType(request.type());
        entity.setLabel(request.label());
        entity.setAmount(request.amount());
        entity.setEndDate(request.endDate());
        entity.setNotes(request.notes());

        return MonEntiteDto.from(monEntiteRepository.save(entity));
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id, User currentUser) {
        getWithOwnershipCheck(id, currentUser);
        monEntiteRepository.deleteById(id);
    }

    // ── Vérification propriété ─────────────────────────────────
    // Toujours une méthode privée réutilisée par update + delete

    private MonEntite getWithOwnershipCheck(Long id, User currentUser) {
        MonEntite entity = monEntiteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Entité introuvable : " + id));

        boolean isOwner = entity.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès non autorisé à cette entité");
        }
        return entity;
    }
}
```

**Règles :**
- Aucune logique dans les controllers — tout dans les services
- `ResponseStatusException` levée depuis les services uniquement (pas les controllers)
- `getWithOwnershipCheck()` mutualisé pour `update` et `delete`
- Admin peut toujours accéder (vérifier `RoleEnum.ADMIN`)

---

## 6. Controller

```java
package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.service.MonEntiteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/mon-entite")
@RequiredArgsConstructor
@Tag(name = "Mon entité", description = "Description courte du domaine")
public class MonEntiteController {

    private final MonEntiteService monEntiteService;

    @Operation(summary = "Lister mes entités")
    @ApiResponse(responseCode = "200", description = "Liste des entités",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = MonEntiteDto.class))))
    @GetMapping
    public ResponseEntity<List<MonEntiteDto>> findAll(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(monEntiteService.findAllByUser(currentUser));
    }

    @Operation(summary = "Créer une entité")
    @ApiResponse(responseCode = "201", description = "Entité créée",
        content = @Content(schema = @Schema(implementation = MonEntiteDto.class)))
    @PostMapping
    public ResponseEntity<MonEntiteDto> create(
            @Valid @RequestBody CreateMonEntiteRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(monEntiteService.create(request, currentUser));
    }

    @Operation(summary = "Modifier une entité")
    @ApiResponse(responseCode = "200", description = "Entité modifiée",
        content = @Content(schema = @Schema(implementation = MonEntiteDto.class)))
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Entité introuvable")
    @PutMapping("/{id}")
    public ResponseEntity<MonEntiteDto> update(
            @Parameter(description = "Identifiant de l'entité") @PathVariable Long id,
            @Valid @RequestBody UpdateMonEntiteRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(monEntiteService.update(id, request, currentUser));
    }

    @Operation(summary = "Supprimer une entité")
    @ApiResponse(responseCode = "204", description = "Entité supprimée")
    @ApiResponse(responseCode = "403", description = "Accès non autorisé")
    @ApiResponse(responseCode = "404", description = "Entité introuvable")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "Identifiant de l'entité") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        monEntiteService.delete(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
```

**Règles :**
- `@AuthenticationPrincipal User currentUser` — toujours injecter l'utilisateur connecté ainsi
- Controllers ne délèguent qu'au service — zéro logique
- `@Valid` sur tous les `@RequestBody`
- Toujours les annotations Swagger `@Operation` + `@ApiResponse`

---

## 7. Test service

```java
package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.MonEntiteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonEntiteServiceTest {

    @Mock MonEntiteRepository monEntiteRepository;
    @InjectMocks MonEntiteService monEntiteService;

    // Toujours 3 utilisateurs : owner, otherUser, admin
    User owner;
    User otherUser;
    User admin;
    MonEntite entity;

    @BeforeEach
    void setUp() {
        owner     = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("other").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").role(RoleEnum.ADMIN).build();

        entity = MonEntite.builder()
                .id(1L).user(owner)
                .type(MonEnum.VALEUR_A).label("Test").amount(100f)
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLaListe() {
        when(monEntiteRepository.findByUserOrderByLabelAsc(owner)).thenReturn(List.of(entity));

        List<MonEntiteDto> result = monEntiteService.findAllByUser(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).label()).isEqualTo("Test");
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLDto() {
        CreateMonEntiteRequest request = new CreateMonEntiteRequest(
                MonEnum.VALEUR_A, "Nouveau", 200f, 100f, null, null);

        when(monEntiteRepository.save(any(MonEntite.class))).thenAnswer(inv -> {
            MonEntite e = inv.getArgument(0);
            return MonEntite.builder().id(2L).user(owner)
                    .type(e.getType()).label(e.getLabel()).amount(e.getAmount()).build();
        });

        MonEntiteDto result = monEntiteService.create(request, owner);

        assertThat(result.id()).isEqualTo(2L);
        verify(monEntiteRepository).save(any(MonEntite.class));
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_leve404_siIntrouvable() {
        when(monEntiteRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> monEntiteService.update(99L,
                new UpdateMonEntiteRequest(MonEnum.AUTRE, "X", 1f, 100f, null, null), owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_leve403_siAutreUtilisateur() {
        when(monEntiteRepository.findById(1L)).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> monEntiteService.update(1L,
                new UpdateMonEntiteRequest(MonEnum.VALEUR_A, "Test", 100f, 100f, null, null), otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(monEntiteRepository, never()).save(any());
    }

    @Test
    void update_autorisePourAdmin() {
        when(monEntiteRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(monEntiteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> monEntiteService.update(1L,
                new UpdateMonEntiteRequest(MonEnum.VALEUR_A, "Test", 100f, 100f, null, null), admin));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLentite() {
        when(monEntiteRepository.findById(1L)).thenReturn(Optional.of(entity));
        monEntiteService.delete(1L, owner);
        verify(monEntiteRepository).deleteById(1L);
    }

    @Test
    void delete_leve403_siPasLeProprietaire() {
        when(monEntiteRepository.findById(1L)).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> monEntiteService.delete(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(monEntiteRepository, never()).deleteById(any());
    }
}
```

---

## 8. Test controller

```java
package com.myfinance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.config.PasswordEncoderConfig;
import com.myfinance.config.SecurityConfig;
import com.myfinance.domain.MonEnum;
import com.myfinance.dto.*;
import com.myfinance.service.MonEntiteService;
import com.myfinance.support.WithMockCustomUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Les 4 annotations sont toujours présentes ensemble
@WebMvcTest(MonEntiteController.class)
@Import({SecurityConfig.class, PasswordEncoderConfig.class})
@TestPropertySource(properties = "cors.allowed-origins=http://localhost:3000")
class MonEntiteControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean MonEntiteService monEntiteService;  // @MockitoBean (pas @Mock)

    MonEntiteDto dto;

    @BeforeEach
    void setUp() {
        dto = new MonEntiteDto(1L, MonEnum.VALEUR_A, "Test", 100f, 200f, null);
    }

    // ── GET ────────────────────────────────────────────────────

    @Test
    @WithMockCustomUser                          // toujours sur les endpoints authentifiés
    void findAll_retourne200() throws Exception {
        when(monEntiteService.findAllByUser(any())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/mon-entite"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].label").value("Test"));
    }

    @Test
    void findAll_sansAuthentification_retourne401() throws Exception {
        mockMvc.perform(get("/api/mon-entite"))
                .andExpect(status().isUnauthorized());
    }

    // ── POST ───────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void create_avecCorpsValide_retourne201() throws Exception {
        CreateMonEntiteRequest request = new CreateMonEntiteRequest(
                MonEnum.VALEUR_A, "Test", 100f, 100f, null, null);
        when(monEntiteService.create(any(), any())).thenReturn(dto);

        mockMvc.perform(post("/api/mon-entite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Test"));
    }

    @Test
    @WithMockCustomUser
    void create_avecCorpsInvalide_retourne400() throws Exception {
        // Tester au moins une contrainte de validation
        CreateMonEntiteRequest request = new CreateMonEntiteRequest(
                MonEnum.VALEUR_A, "", -1f, 100f, null, null);

        mockMvc.perform(post("/api/mon-entite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── PUT ────────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void update_retourne403() throws Exception {
        when(monEntiteService.update(eq(1L), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        mockMvc.perform(put("/api/mon-entite/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateMonEntiteRequest(MonEnum.VALEUR_A, "X", 1f, 100f, null, null))))
                .andExpect(status().isForbidden());
    }

    // ── DELETE ─────────────────────────────────────────────────

    @Test
    @WithMockCustomUser
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete("/api/mon-entite/1"))
                .andExpect(status().isNoContent());

        verify(monEntiteService).delete(eq(1L), any());
    }
}
```

**Règles tests controller :**
- `@WithMockCustomUser` sur tous les tests d'endpoints authentifiés (pas `@WithMockUser` — incompatible avec `@AuthenticationPrincipal User`)
- `@MockitoBean` (Spring) et non `@Mock` (Mockito) pour le service
- Tester systématiquement : 200/201/204 nominal + 401 sans auth + 403 ownership + 404 introuvable + 400 validation

---

## 9. Bonnes pratiques tests backend

Convention figée après audit de qualité — ces règles tiennent compte du code existant et des choix d'architecture.

### 9.1 Hiérarchie d'assertions et stubbing

| Outil | Usage | Pourquoi |
|---|---|---|
| **AssertJ `assertThat(...)`** | défaut, exclusif | Lisible, fluent, messages d'échec riches. **Bannir** `assertEquals`, `assertTrue`, `assertNull` JUnit (0 occurrence dans le code actuel — on garde cette règle) |
| **Mockito `when(...).thenReturn(...)`** | défaut | Style cohérent dans tout le projet. Ne pas mixer avec BDD `given().willReturn()` |
| **`assertThatThrownBy(...).isInstanceOf(...).satisfies(ex -> ...)`** | exceptions | Préférer à `assertThrows` pour vérifier le `HttpStatus` en plus du type |
| **`verify(repo).save(any())`** | side-effects | Pas de `times(1)` redondant (default) |
| **`verify(repo, never()).save(any())`** | non-appel | Obligatoire dans les branches d'erreur |

### 9.2 Convention de nommage des méthodes

Format : `<méthodeTestée>_<action>_<condition>()` en français snake-case.

```java
@Test void findAllByUser_retourneListeVide_siAucunRevenu()
@Test void update_leve404_siRevenuIntrouvable()
@Test void create_leve400_siChampMontantManquant()
@Test void delete_autorisePourAdmin()
```

Cette convention rend `@DisplayName` superflu — le rapport JUnit reste lisible. **Ne pas ajouter `@DisplayName`** (0 occurrence aujourd'hui — uniformité).

### 9.3 Méthodes courtes — règle des 40 lignes

Cible : médiane ≤ 15 lignes, **aucune méthode > 40 lignes** (état actuel : médiane 9, P90 17, max 39).

Au-delà de 40 lignes : extraire les fixtures dans `@BeforeEach` ou des méthodes helper privées dans la classe de test. Si plusieurs méthodes ont la même fixture lourde, créer une classe `support/` (cf. `WithMockCustomUser`).

### 9.4 `@ParameterizedTest` pour les cas dupliqués

**Quand l'utiliser :** chaque fois que vous écrivez 3+ tests avec la même structure et un seul paramètre qui varie (typiquement validation 400, codes HTTP, types d'enum).

```java
// ❌ Avant — 4 tests quasi-identiques
@Test void create_leve400_siLabelManquant()  { ... request avec label="" ... }
@Test void create_leve400_siLabelTropLong()  { ... request avec label=300chars ... }
@Test void create_leve400_siMontantNegatif() { ... request avec amount=-1 ... }
@Test void create_leve400_siMontantNull()    { ... request avec amount=null ... }

// ✅ Après
@ParameterizedTest(name = "create_leve400 — {0}")
@MethodSource("invalidRequests")
void create_leve400_siRequetteInvalide(String desc, CreateRequest invalid) throws Exception {
    mockMvc.perform(post("/api/mon-entite")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(invalid)))
            .andExpect(status().isBadRequest());
}

static Stream<Arguments> invalidRequests() {
    return Stream.of(
        Arguments.of("label vide",     new CreateRequest("",     100f, ...)),
        Arguments.of("label trop long",new CreateRequest("x".repeat(300), 100f, ...)),
        Arguments.of("montant négatif",new CreateRequest("OK",   -1f,  ...)),
        Arguments.of("montant null",   new CreateRequest("OK",   null, ...))
    );
}
```

Le nom `{0}` dans le rapport JUnit affiche la description — chaque cas reste identifiable individuellement.

### 9.5 `@Nested` — uniquement si la classe dépasse 30 tests

**Pas obligatoire.** À envisager pour les services à 30+ méthodes testées où le rapport plat devient illisible. Grouper alors par méthode SUT (System Under Test) :

```java
class PositionServiceTest {
    @Nested class FindById { @Test void ... @Test void ... }
    @Nested class CreateOrder { @Test void ... @Test void ... }
}
```

Ne pas créer de `@Nested` artificiel pour 5-10 tests — surcoût de structure sans valeur.

### 9.6 Couverture branches — cible ≥ 70 %

Métrique JaCoCo `BRANCH` (et non `INSTRUCTION`). État actuel : **50 %** — chemins conditionnels (if/else, ternaires, switch, validation) souvent non couverts.

Pour chaque service ou helper avec > 5 conditions :
- 1 test par branche `true` ET `false`
- 1 test par valeur limite (null, 0, vide, max)
- 1 test par exception interceptable

Vérifier avec `./mvnw test` puis ouvrir `backend/target/site/jacoco/index.html`. Trier par "Missed Branches" desc pour cibler les classes les moins couvertes.

### 9.7 Tests d'intégration (`@SpringBootTest`)

Les tests unitaires (services mockés + controllers slicés) ne valident **pas** :
- la chaîne sécurité réelle (filtres + handlers)
- les requêtes JPA contre une vraie DB (limites de la mock)
- l'enchaînement scheduler → service → repo
- la cohérence des migrations SQLite avec les entités

**Cible :** au moins 1 test d'intégration par module critique (auth, patrimoine, dépenses), exécuté avec H2 en mémoire pour rester rapide :

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional  // rollback systématique en fin de test
class MonModuleIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired MonEntiteRepository repository;

    @Test
    void scenario_createReadDelete_chaine_complete() throws Exception {
        // Création via API réelle (security + JPA + commit)
        // Vérification via repository (état réel en DB)
        // Cleanup automatique via @Transactional
    }
}
```

Profil `test` : `application-test.properties` avec H2 + `spring.jpa.hibernate.ddl-auto=create-drop`.

### 9.8 Checklist tests backend

- [ ] Service : `@ExtendWith(MockitoExtension.class)` + `@Mock` repos + `@InjectMocks`
- [ ] Service : 3 utilisateurs en `@BeforeEach` (owner, otherUser, admin)
- [ ] Service : tests des 4 codes d'erreur (404, 403, 409, 400) en plus du happy path
- [ ] Service : `verify(..., never())` dans les branches d'erreur
- [ ] Controller : `@WebMvcTest` + `@Import({SecurityConfig, PasswordEncoderConfig})` + `@TestPropertySource` + `@MockitoBean`
- [ ] Controller : `@WithMockCustomUser` sur les endpoints authentifiés
- [ ] Controller : 200/201/204 nominal + 401 sans auth + 403 ownership + 404 introuvable + 400 validation
- [ ] Pour 3+ cas similaires sur une même méthode → utiliser `@ParameterizedTest`
- [ ] Méthode > 40 lignes → extraire fixtures vers `@BeforeEach` ou helper
- [ ] Avant commit : `./mvnw test` BUILD SUCCESS + branch coverage ≥ 70 % sur les nouvelles classes (vérifier dans `target/site/jacoco/`)
- [ ] Module critique sans test d'intégration → en ajouter 1 (`@SpringBootTest` + H2)

---

## 10. Checklist ajout d'un nouveau module

- [ ] Enum(s) dans `domain/`
- [ ] Entité `@Entity` dans `domain/`
- [ ] Repository dans `repository/`
- [ ] DTOs (réponse + create request + update request) dans `dto/`
- [ ] Service dans `service/`
- [ ] Controller dans `controller/`
- [ ] Test service dans `test/.../service/` (cf. section 9 pour la convention)
- [ ] Test controller dans `test/.../controller/` (cf. section 9)
- [ ] Test d'intégration `@SpringBootTest` si module critique (cf. section 9.7)
- [ ] Documentation API dans `docs/api/`
- [ ] Référence dans `docs/architecture/overview.md`
- [ ] Section endpoints dans `CLAUDE.md`
- [ ] Entrée dans le statut projet de `CLAUDE.md`
- [ ] ⚠ Si nouvel enum → vérifier si migration SQLite nécessaire sur la CHECK constraint
