package com.myfinance.service;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.OtherIncomeTypeEnum;
import com.myfinance.domain.Position;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateOtherIncomeRequest;
import com.myfinance.dto.OtherIncomeDto;
import com.myfinance.dto.UpdateOtherIncomeRequest;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.PositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtherIncomeServiceTest {

    @Mock OtherIncomeRepository otherIncomeRepository;
    @Mock PositionRepository positionRepository;
    @InjectMocks OtherIncomeService otherIncomeService;

    User owner;
    User otherUser;
    User admin;
    OtherIncome income;

    @BeforeEach
    void setUp() {
        owner     = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("other").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").role(RoleEnum.ADMIN).build();

        income = OtherIncome.builder()
                .id(1L)
                .user(owner)
                .type(OtherIncomeTypeEnum.LOCATIF)
                .label("Loyer appartement Lyon")
                .amount(750f)
                .date(LocalDate.of(2025, 3, 1))
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLaListeDesRevenus() {
        when(otherIncomeRepository.findByUserOrderByDateDesc(owner)).thenReturn(List.of(income));

        List<OtherIncomeDto> result = otherIncomeService.findAllByUser(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).label()).isEqualTo("Loyer appartement Lyon");
        assertThat(result.get(0).type()).isEqualTo(OtherIncomeTypeEnum.LOCATIF);
    }

    @Test
    void findAllByUser_retourneListeVide_siAucunRevenu() {
        when(otherIncomeRepository.findByUserOrderByDateDesc(owner)).thenReturn(List.of());

        assertThat(otherIncomeService.findAllByUser(owner)).isEmpty();
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLDto() {
        CreateOtherIncomeRequest request = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.DIVIDENDE, "Dividendes SCPI", 210.50f, LocalDate.of(2025, 1, 15), null, null, null, null, null, null);

        when(otherIncomeRepository.save(any(OtherIncome.class))).thenAnswer(inv -> {
            OtherIncome i = inv.getArgument(0);
            return OtherIncome.builder()
                    .id(2L).user(owner)
                    .type(i.getType()).label(i.getLabel())
                    .amount(i.getAmount()).date(i.getDate())
                    .build();
        });

        OtherIncomeDto result = otherIncomeService.create(request, owner);

        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.type()).isEqualTo(OtherIncomeTypeEnum.DIVIDENDE);
        assertThat(result.amount()).isEqualTo(210.50f);
        verify(otherIncomeRepository).save(any(OtherIncome.class));
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLeRevenu() {
        UpdateOtherIncomeRequest request = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer révisé", 780f, LocalDate.of(2025, 4, 1), null, null, null, null, null, null);

        when(otherIncomeRepository.findById(1L)).thenReturn(Optional.of(income));
        when(otherIncomeRepository.save(any(OtherIncome.class))).thenAnswer(inv -> inv.getArgument(0));

        OtherIncomeDto result = otherIncomeService.update(1L, request, owner);

        assertThat(result.label()).isEqualTo("Loyer révisé");
        assertThat(result.amount()).isEqualTo(780f);
    }

    @Test
    void update_leve404_siRevenuIntrouvable() {
        UpdateOtherIncomeRequest request = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.AUTRE, "Test", 100f, LocalDate.now(), null, null, null, null, null, null);

        when(otherIncomeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> otherIncomeService.update(99L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_leve403_siAutreUtilisateurNonAdmin() {
        UpdateOtherIncomeRequest request = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer", 750f, LocalDate.of(2025, 3, 1), null, null, null, null, null, null);

        when(otherIncomeRepository.findById(1L)).thenReturn(Optional.of(income));

        assertThatThrownBy(() -> otherIncomeService.update(1L, request, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(otherIncomeRepository, never()).save(any());
    }

    @Test
    void update_autorisePourAdmin() {
        UpdateOtherIncomeRequest request = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer admin", 750f, LocalDate.of(2025, 3, 1), null, null, null, null, null, null);

        when(otherIncomeRepository.findById(1L)).thenReturn(Optional.of(income));
        when(otherIncomeRepository.save(any(OtherIncome.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> otherIncomeService.update(1L, request, admin));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLe_revenu() {
        when(otherIncomeRepository.findById(1L)).thenReturn(Optional.of(income));

        otherIncomeService.delete(1L, owner);

        verify(otherIncomeRepository).deleteById(1L);
    }

    @Test
    void delete_leve403_siPasLeProprietaire() {
        when(otherIncomeRepository.findById(1L)).thenReturn(Optional.of(income));

        assertThatThrownBy(() -> otherIncomeService.delete(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(otherIncomeRepository, never()).deleteById(any());
    }

    @Test
    void delete_autorisePourAdmin() {
        when(otherIncomeRepository.findById(1L)).thenReturn(Optional.of(income));

        otherIncomeService.delete(1L, admin);

        verify(otherIncomeRepository).deleteById(1L);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Tests additionnels — branches validateContractFields + resolvePosition
    // ═══════════════════════════════════════════════════════════════════════════

    // ── validateContractFields ───────────────────────────────────────────────

    @Test
    void create_contractFields_periodStartSurAutreType_leve400() {
        // periodStart fourni mais type DIVIDENDE → 400 (réservé LOCATIF)
        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.DIVIDENDE, "Test", 100f, LocalDate.of(2025, 1, 1),
                null, null, null, LocalDate.of(2025, 1, 1), null, 5);

        assertThatThrownBy(() -> otherIncomeService.create(req, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("LOCATIF");
                });
    }

    @Test
    void create_contractFields_periodStartSansDayOfMonth_leve400() {
        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer", 800f, null,
                null, null, null, LocalDate.of(2025, 1, 1), null, null);  // dayOfMonth = null

        assertThatThrownBy(() -> otherIncomeService.create(req, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("dayOfMonth");
                });
    }

    @Test
    void create_contractFields_periodEndAvantPeriodStart_leve400() {
        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer", 800f, null,
                null, null, null,
                LocalDate.of(2025, 6, 1), LocalDate.of(2025, 1, 1),  // end < start
                5);

        assertThatThrownBy(() -> otherIncomeService.create(req, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("postérieure");
                });
    }

    @Test
    void create_contractFields_periodEndEgaleAPeriodStart_leve400() {
        // periodEnd == periodStart → invalide (doit être strictement après)
        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer", 800f, null,
                null, null, null,
                LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 1),
                5);

        assertThatThrownBy(() -> otherIncomeService.create(req, owner))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void create_saisiePonctuelle_sansDate_leve400() {
        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.DIVIDENDE, "Div", 100f, null,
                null, null, null, null, null, null);

        assertThatThrownBy(() -> otherIncomeService.create(req, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("ponctuelle");
                });
    }

    @Test
    void create_saisiePonctuelle_avecDayOfMonth_leve400() {
        // dayOfMonth fourni sans periodStart → 400
        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Test", 100f, LocalDate.of(2025, 1, 1),
                null, null, null, null, null, 5);  // dayOfMonth=5 sans periodStart

        assertThatThrownBy(() -> otherIncomeService.create(req, owner))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void create_saisiePonctuelle_avecPeriodEnd_leve400() {
        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Test", 100f, LocalDate.of(2025, 1, 1),
                null, null, null, null, LocalDate.of(2025, 6, 1), null);  // periodEnd sans periodStart

        assertThatThrownBy(() -> otherIncomeService.create(req, owner))
                .isInstanceOf(ResponseStatusException.class);
    }

    // ── create avec contrat valide (LOCATIF + periodStart + dayOfMonth) ──────

    @Test
    void create_contratLocatif_valide_sauvegardeAvecDateEffective() {
        when(otherIncomeRepository.save(any())).thenAnswer(inv -> {
            OtherIncome i = inv.getArgument(0);
            return OtherIncome.builder().id(10L).user(owner)
                    .type(i.getType()).label(i.getLabel()).amount(i.getAmount())
                    .date(i.getDate()).periodStart(i.getPeriodStart())
                    .periodEnd(i.getPeriodEnd()).dayOfMonth(i.getDayOfMonth())
                    .isTaxable(i.getIsTaxable()).build();
        });

        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer T2", 800f, null,
                null, null, null,
                LocalDate.of(2025, 1, 1), LocalDate.of(2025, 12, 31), 5);

        OtherIncomeDto result = otherIncomeService.create(req, owner);

        assertThat(result.id()).isEqualTo(10L);
        // date effective = periodStart (pour les requêtes par plage)
        assertThat(result.date()).isEqualTo(LocalDate.of(2025, 1, 1));
        assertThat(result.dayOfMonth()).isEqualTo(5);
    }

    // ── resolvePosition ──────────────────────────────────────────────────────

    @Test
    void create_avecPositionId_typeNonLocatif_leve400() {
        // positionId fourni mais type DIVIDENDE → 400 (réservé LOCATIF)
        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.DIVIDENDE, "Div", 200f, LocalDate.of(2025, 1, 1),
                null, null, 99L, null, null, null);

        assertThatThrownBy(() -> otherIncomeService.create(req, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("LOCATIF");
                });
    }

    @Test
    void create_avecPositionId_positionIntrouvable_leve404() {
        when(positionRepository.findById(99L)).thenReturn(Optional.empty());

        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer", 800f, null,
                null, null, 99L,
                LocalDate.of(2025, 1, 1), null, 5);

        assertThatThrownBy(() -> otherIncomeService.create(req, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void create_avecPositionId_valide_lieLaPosition() {
        Position immo = Position.builder().id(99L).user(owner)
                .category(AssetCategory.IMMO_PHYSIQUE).label("Appartement").build();
        when(positionRepository.findById(99L)).thenReturn(Optional.of(immo));
        when(otherIncomeRepository.save(any())).thenAnswer(inv -> {
            OtherIncome i = inv.getArgument(0);
            return OtherIncome.builder().id(10L).user(owner)
                    .type(i.getType()).label(i.getLabel()).amount(i.getAmount())
                    .date(i.getDate()).position(i.getPosition())
                    .isTaxable(i.getIsTaxable()).build();
        });

        CreateOtherIncomeRequest req = new CreateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer", 800f, null,
                null, null, 99L,
                LocalDate.of(2025, 1, 1), null, 5);

        OtherIncomeDto result = otherIncomeService.create(req, owner);

        assertThat(result.positionId()).isEqualTo(99L);
    }

    // ── update avec isTaxable null → défaut à true ───────────────────────────

    @Test
    void update_isTaxableNull_defautATrue() {
        when(otherIncomeRepository.findById(1L)).thenReturn(Optional.of(income));
        when(otherIncomeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateOtherIncomeRequest req = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.DIVIDENDE, "Div", 100f, LocalDate.of(2025, 1, 1),
                null, null, null, null, null, null);  // isTaxable null

        OtherIncomeDto result = otherIncomeService.update(1L, req, owner);

        assertThat(result.isTaxable()).isTrue();
    }
}
