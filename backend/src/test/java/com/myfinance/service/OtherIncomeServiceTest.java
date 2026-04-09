package com.myfinance.service;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.OtherIncomeTypeEnum;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateOtherIncomeRequest;
import com.myfinance.dto.OtherIncomeDto;
import com.myfinance.dto.UpdateOtherIncomeRequest;
import com.myfinance.repository.OtherIncomeRepository;
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
                OtherIncomeTypeEnum.DIVIDENDE, "Dividendes SCPI", 210.50f, LocalDate.of(2025, 1, 15), null, null);

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
                OtherIncomeTypeEnum.LOCATIF, "Loyer révisé", 780f, LocalDate.of(2025, 4, 1), null, null);

        when(otherIncomeRepository.findById(1L)).thenReturn(Optional.of(income));
        when(otherIncomeRepository.save(any(OtherIncome.class))).thenAnswer(inv -> inv.getArgument(0));

        OtherIncomeDto result = otherIncomeService.update(1L, request, owner);

        assertThat(result.label()).isEqualTo("Loyer révisé");
        assertThat(result.amount()).isEqualTo(780f);
    }

    @Test
    void update_leve404_siRevenuIntrouvable() {
        UpdateOtherIncomeRequest request = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.AUTRE, "Test", 100f, LocalDate.now(), null, null);

        when(otherIncomeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> otherIncomeService.update(99L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_leve403_siAutreUtilisateurNonAdmin() {
        UpdateOtherIncomeRequest request = new UpdateOtherIncomeRequest(
                OtherIncomeTypeEnum.LOCATIF, "Loyer", 750f, LocalDate.of(2025, 3, 1), null, null);

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
                OtherIncomeTypeEnum.LOCATIF, "Loyer admin", 750f, LocalDate.of(2025, 3, 1), null, null);

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
}
