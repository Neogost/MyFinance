package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.PossessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PossessionServiceTest {

    @Mock PossessionRepository possessionRepository;
    @InjectMocks PossessionService possessionService;

    User owner;
    User otherUser;
    User admin;
    Possession possession;

    @BeforeEach
    void setUp() {
        owner     = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("other").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").role(RoleEnum.ADMIN).build();

        possession = Possession.builder()
                .id(1L)
                .user(owner)
                .category(PossessionCategoryEnum.VEHICULE)
                .label("Renault Clio")
                .purchasePrice(new BigDecimal("18500.00"))
                .purchaseDate(LocalDate.now().minusYears(2))
                .estimatedCurrentValue(null)
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLaListeAvecValeursCalculees() {
        when(possessionRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of(possession));

        List<PossessionDto> result = possessionService.findAllByUser(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).label()).isEqualTo("Renault Clio");
        assertThat(result.get(0).isManualOverride()).isFalse();
        // Valeur calculée doit être inférieure au prix d'achat pour un véhicule de 2 ans
        assertThat(result.get(0).computedCurrentValue())
                .isLessThan(new BigDecimal("18500.00"));
    }

    @Test
    void findAllByUser_retourneListeVide_siAucunePossession() {
        when(possessionRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of());

        assertThat(possessionService.findAllByUser(owner)).isEmpty();
    }

    // ── findById ───────────────────────────────────────────────

    @Test
    void findById_retourneLaDto() {
        when(possessionRepository.findById(1L)).thenReturn(Optional.of(possession));

        PossessionDto result = possessionService.findById(1L, owner);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.label()).isEqualTo("Renault Clio");
    }

    @Test
    void findById_leve404_siIntrouvable() {
        when(possessionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> possessionService.findById(99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── calcul décote ──────────────────────────────────────────

    @Test
    void decote_vehicule_appliqueDecoteExponentielle() {
        when(possessionRepository.findById(1L)).thenReturn(Optional.of(possession));

        PossessionDto result = possessionService.findById(1L, owner);

        // Véhicule 2 ans à 15%/an : 18500 × (0.85)^2 ≈ 13361
        assertThat(result.computedCurrentValue())
                .isLessThan(new BigDecimal("14000.00"))
                .isGreaterThan(new BigDecimal("10000.00"));
        assertThat(result.cumulatedDepreciation()).isGreaterThan(BigDecimal.ZERO);
        assertThat(result.depreciationRate()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    void decote_collection_aucuneDecote() {
        Possession collection = Possession.builder()
                .id(2L).user(owner)
                .category(PossessionCategoryEnum.COLLECTION)
                .label("Montre")
                .purchasePrice(new BigDecimal("5000.00"))
                .purchaseDate(LocalDate.now().minusYears(5))
                .createdAt(LocalDateTime.now())
                .build();

        when(possessionRepository.findById(2L)).thenReturn(Optional.of(collection));

        PossessionDto result = possessionService.findById(2L, owner);

        // COLLECTION : taux 0 % → valeur = prix d'achat
        assertThat(result.computedCurrentValue()).isEqualByComparingTo(new BigDecimal("5000.00"));
        assertThat(result.cumulatedDepreciation()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void overrideManuel_utiliseValeurSaisie() {
        possession.setEstimatedCurrentValue(new BigDecimal("10000.00"));
        when(possessionRepository.findById(1L)).thenReturn(Optional.of(possession));

        PossessionDto result = possessionService.findById(1L, owner);

        assertThat(result.isManualOverride()).isTrue();
        assertThat(result.effectiveCurrentValue()).isEqualByComparingTo(new BigDecimal("10000.00"));
    }

    @Test
    void valeurResiduelleMinimale_nonInferieurePlancher() {
        // Informatique achetée il y a 20 ans — plancher à 5 %
        Possession vieux = Possession.builder()
                .id(3L).user(owner)
                .category(PossessionCategoryEnum.INFORMATIQUE)
                .label("Vieux PC")
                .purchasePrice(new BigDecimal("2000.00"))
                .purchaseDate(LocalDate.now().minusYears(20))
                .createdAt(LocalDateTime.now())
                .build();

        when(possessionRepository.findById(3L)).thenReturn(Optional.of(vieux));

        PossessionDto result = possessionService.findById(3L, owner);

        // Plancher = 5 % de 2000 = 100 €
        assertThat(result.computedCurrentValue())
                .isGreaterThanOrEqualTo(new BigDecimal("100.00"));
    }

    // ── getSummary ─────────────────────────────────────────────

    @Test
    void getSummary_retourneTotauxCorrects() {
        Possession p2 = Possession.builder()
                .id(2L).user(owner)
                .category(PossessionCategoryEnum.INFORMATIQUE)
                .label("Laptop")
                .purchasePrice(new BigDecimal("2000.00"))
                .purchaseDate(LocalDate.now().minusYears(1))
                .createdAt(LocalDateTime.now())
                .build();

        when(possessionRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of(possession, p2));

        PossessionSummaryDto summary = possessionService.getSummary(owner);

        assertThat(summary.totalPurchasePrice())
                .isEqualByComparingTo(new BigDecimal("20500.00"));
        assertThat(summary.totalEffectiveValue()).isLessThan(new BigDecimal("20500.00"));
        assertThat(summary.totalDepreciation()).isGreaterThan(BigDecimal.ZERO);
        assertThat(summary.byCategory()).hasSize(2);
    }

    @Test
    void getSummary_retourneTauxZero_siAucunePossession() {
        when(possessionRepository.findByUserOrderByCategoryAscLabelAsc(owner))
                .thenReturn(List.of());

        PossessionSummaryDto summary = possessionService.getSummary(owner);

        assertThat(summary.totalPurchasePrice()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.globalDepreciationRate()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.byCategory()).isEmpty();
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLDto() {
        CreatePossessionRequest request = new CreatePossessionRequest(
                PossessionCategoryEnum.VEHICULE, "Renault Clio",
                new BigDecimal("18500.00"), LocalDate.now().minusYears(2),
                null, null);

        when(possessionRepository.save(any(Possession.class))).thenAnswer(inv -> {
            Possession p = inv.getArgument(0);
            return Possession.builder().id(2L).user(owner)
                    .category(p.getCategory()).label(p.getLabel())
                    .purchasePrice(p.getPurchasePrice()).purchaseDate(p.getPurchaseDate())
                    .createdAt(LocalDateTime.now()).build();
        });

        PossessionDto result = possessionService.create(request, owner);

        assertThat(result.id()).isEqualTo(2L);
        verify(possessionRepository).save(any(Possession.class));
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLaPossession() {
        UpdatePossessionRequest request = new UpdatePossessionRequest(
                PossessionCategoryEnum.VEHICULE, "Clio modifiée",
                new BigDecimal("17000.00"), LocalDate.now().minusYears(2),
                null, "Note");

        when(possessionRepository.findById(1L)).thenReturn(Optional.of(possession));
        when(possessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PossessionDto result = possessionService.update(1L, request, owner);

        assertThat(result.label()).isEqualTo("Clio modifiée");
        verify(possessionRepository).save(any(Possession.class));
    }

    @Test
    void update_leve404_siIntrouvable() {
        when(possessionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> possessionService.update(99L,
                new UpdatePossessionRequest(PossessionCategoryEnum.VEHICULE, "X",
                        new BigDecimal("1.00"), LocalDate.now(), null, null), owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_leve403_siAutreUtilisateur() {
        when(possessionRepository.findById(1L)).thenReturn(Optional.of(possession));

        assertThatThrownBy(() -> possessionService.update(1L,
                new UpdatePossessionRequest(PossessionCategoryEnum.VEHICULE, "X",
                        new BigDecimal("1.00"), LocalDate.now(), null, null), otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(possessionRepository, never()).save(any());
    }

    @Test
    void update_autorisePourAdmin() {
        when(possessionRepository.findById(1L)).thenReturn(Optional.of(possession));
        when(possessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> possessionService.update(1L,
                new UpdatePossessionRequest(PossessionCategoryEnum.VEHICULE, "X",
                        new BigDecimal("18500.00"), LocalDate.now().minusYears(2), null, null), admin));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLaPossession() {
        when(possessionRepository.findById(1L)).thenReturn(Optional.of(possession));

        possessionService.delete(1L, owner);

        verify(possessionRepository).deleteById(1L);
    }

    @Test
    void delete_leve403_siPasLeProprietaire() {
        when(possessionRepository.findById(1L)).thenReturn(Optional.of(possession));

        assertThatThrownBy(() -> possessionService.delete(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(possessionRepository, never()).deleteById(any());
    }

    @Test
    void delete_leve404_siIntrouvable() {
        when(possessionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> possessionService.delete(99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
