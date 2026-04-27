package com.myfinance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.LoanSimulation;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateLoanSimulationRequest;
import com.myfinance.dto.LoanSimulationDto;
import com.myfinance.repository.LoanSimulationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanSimulationServiceTest {

    @Mock LoanSimulationRepository loanSimulationRepository;
    @Spy  ObjectMapper objectMapper;
    @InjectMocks LoanSimulationService loanSimulationService;

    User owner;
    User otherUser;
    User admin;
    LoanSimulation simulation;

    @BeforeEach
    void setUp() {
        owner     = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("other").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").role(RoleEnum.ADMIN).build();

        simulation = LoanSimulation.builder()
                .id(1L)
                .user(owner)
                .name("Appartement Paris")
                .savedAt(LocalDateTime.of(2026, 4, 26, 10, 0))
                .parametersJson("{\"propertyPrice\":250000,\"loanDuration\":20}")
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLaListe() {
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(owner))
                .thenReturn(List.of(simulation));

        List<LoanSimulationDto> result = loanSimulationService.findAllByUser(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Appartement Paris");
        assertThat(result.get(0).id()).isEqualTo(1L);
    }

    @Test
    void findAllByUser_retourneListeVide_siAucuneSimulation() {
        when(loanSimulationRepository.findByUserOrderBySavedAtDesc(owner))
                .thenReturn(List.of());

        assertThat(loanSimulationService.findAllByUser(owner)).isEmpty();
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLDto() {
        CreateLoanSimulationRequest request = new CreateLoanSimulationRequest(
                "Maison campagne", Map.of("propertyPrice", 300000, "loanDuration", 25));

        when(loanSimulationRepository.save(any(LoanSimulation.class))).thenAnswer(inv -> {
            LoanSimulation s = inv.getArgument(0);
            return LoanSimulation.builder()
                    .id(2L).user(owner)
                    .name(s.getName()).savedAt(s.getSavedAt())
                    .parametersJson(s.getParametersJson())
                    .build();
        });

        LoanSimulationDto result = loanSimulationService.create(request, owner);

        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.name()).isEqualTo("Maison campagne");
        assertThat(result.parameters()).isNotNull();
        verify(loanSimulationRepository).save(any(LoanSimulation.class));
    }

    @Test
    void create_setSavedAtAvantPersistance() {
        CreateLoanSimulationRequest request = new CreateLoanSimulationRequest(
                "Test", Map.of("loanAmount", 200000));

        when(loanSimulationRepository.save(any(LoanSimulation.class))).thenAnswer(inv -> {
            LoanSimulation s = inv.getArgument(0);
            assertThat(s.getSavedAt()).isNotNull();
            return LoanSimulation.builder().id(3L).user(owner)
                    .name(s.getName()).savedAt(s.getSavedAt()).parametersJson(s.getParametersJson()).build();
        });

        loanSimulationService.create(request, owner);
    }

    @Test
    void create_leve400_siParametersJsonTropVolumineux() {
        // Une chaîne de 51 000 caractères dans une valeur Map produit > 50 000 chars en JSON.
        String hugePayload = "x".repeat(51_000);
        CreateLoanSimulationRequest request = new CreateLoanSimulationRequest(
                "Trop gros", Map.of("garbage", hugePayload));

        assertThatThrownBy(() -> loanSimulationService.create(request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("trop volumineux");
                });

        // Aucune persistance ne doit avoir lieu
        verify(loanSimulationRepository, never()).save(any());
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeSimulation() {
        when(loanSimulationRepository.findById(1L)).thenReturn(Optional.of(simulation));

        loanSimulationService.delete(1L, owner);

        verify(loanSimulationRepository).deleteById(1L);
    }

    @Test
    void delete_leve404_siIntrouvable() {
        when(loanSimulationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> loanSimulationService.delete(99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(loanSimulationRepository, never()).deleteById(any());
    }

    @Test
    void delete_leve403_siAutreUtilisateur() {
        when(loanSimulationRepository.findById(1L)).thenReturn(Optional.of(simulation));

        assertThatThrownBy(() -> loanSimulationService.delete(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(loanSimulationRepository, never()).deleteById(any());
    }

    @Test
    void delete_autorisePourAdmin() {
        when(loanSimulationRepository.findById(1L)).thenReturn(Optional.of(simulation));

        assertThatNoException().isThrownBy(() -> loanSimulationService.delete(1L, admin));
        verify(loanSimulationRepository).deleteById(1L);
    }
}
