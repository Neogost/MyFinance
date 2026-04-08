package com.myfinance.service;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateSalaryContractRequest;
import com.myfinance.dto.SalaryContractDto;
import com.myfinance.dto.UpdateSalaryContractRequest;
import com.myfinance.repository.SalaryContractRepository;
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
class SalaryContractServiceTest {

    @Mock SalaryContractRepository salaryContractRepository;
    @InjectMocks SalaryContractService salaryContractService;

    User owner;
    User otherUser;
    User admin;
    SalaryContract activeContract;

    @BeforeEach
    void setUp() {
        owner     = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        otherUser = User.builder().id(2L).login("other").role(RoleEnum.USER).build();
        admin     = User.builder().id(3L).login("admin").role(RoleEnum.ADMIN).build();

        activeContract = SalaryContract.builder()
                .id(1L)
                .user(owner)
                .startDate(LocalDate.of(2023, 1, 1))
                .endDate(null)
                .annualGrossSalary(45000f)
                .paidMonthsPerYear(12)
                .weeklyHours(35f)
                .mealVoucherAmount(9.5f)
                .mealVoucherEmployeeRate(50f)
                .build();
    }

    // ── findAllByUser ──────────────────────────────────────────

    @Test
    void findAllByUser_retourneLaListeDesContrats() {
        when(salaryContractRepository.findByUserOrderByStartDateDesc(owner))
                .thenReturn(List.of(activeContract));

        List<SalaryContractDto> result = salaryContractService.findAllByUser(owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).annualGrossSalary()).isEqualTo(45000f);
    }

    @Test
    void findAllByUser_retourneListeVide_siAucunContrat() {
        when(salaryContractRepository.findByUserOrderByStartDateDesc(owner))
                .thenReturn(List.of());

        assertThat(salaryContractService.findAllByUser(owner)).isEmpty();
    }

    // ── findById ───────────────────────────────────────────────

    @Test
    void findById_retourneLeDtoAvecProjections_siProprietaire() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));

        SalaryContractDto result = salaryContractService.findById(1L, owner);

        assertThat(result.id()).isEqualTo(1L);
        // Vérifie que les projections sont calculées
        assertThat(result.annualNetSalary()).isCloseTo(33750f, offset(0.01f));
        assertThat(result.monthlyGrossSalary()).isCloseTo(3750f, offset(0.01f));
    }

    @Test
    void findById_retourneLeDtoAvecProjections_siAdmin() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));

        assertThatNoException().isThrownBy(() -> salaryContractService.findById(1L, admin));
    }

    @Test
    void findById_leve404_siContratIntrouvable() {
        when(salaryContractRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> salaryContractService.findById(99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void findById_leve403_siAutreUtilisateurNonAdmin() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));

        assertThatThrownBy(() -> salaryContractService.findById(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_creeLeContratEtRetourneLeDtoAvecProjections() {
        CreateSalaryContractRequest request = new CreateSalaryContractRequest(
                LocalDate.of(2024, 1, 1), null, 50000f, 12, 35f, 10f, 50f);

        when(salaryContractRepository.existsByUserAndEndDateIsNull(owner)).thenReturn(false);
        when(salaryContractRepository.save(any(SalaryContract.class))).thenAnswer(inv -> {
            SalaryContract c = inv.getArgument(0);
            c = SalaryContract.builder()
                    .id(2L).user(owner)
                    .startDate(c.getStartDate()).endDate(c.getEndDate())
                    .annualGrossSalary(c.getAnnualGrossSalary())
                    .paidMonthsPerYear(c.getPaidMonthsPerYear())
                    .weeklyHours(c.getWeeklyHours())
                    .mealVoucherAmount(c.getMealVoucherAmount())
                    .mealVoucherEmployeeRate(c.getMealVoucherEmployeeRate())
                    .build();
            return c;
        });

        SalaryContractDto result = salaryContractService.create(request, owner);

        assertThat(result.annualGrossSalary()).isEqualTo(50000f);
        assertThat(result.annualNetSalary()).isCloseTo(37500f, offset(0.01f));
        verify(salaryContractRepository).save(any(SalaryContract.class));
    }

    @Test
    void create_leve409_siContratActifExisteDeja() {
        CreateSalaryContractRequest request = new CreateSalaryContractRequest(
                LocalDate.of(2024, 1, 1), null, 50000f, 12, 35f, 10f, 50f);

        when(salaryContractRepository.existsByUserAndEndDateIsNull(owner)).thenReturn(true);

        assertThatThrownBy(() -> salaryContractService.create(request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(salaryContractRepository, never()).save(any());
    }

    @Test
    void create_accepteContratCloture_memeSiUnAutreEstActif() {
        // endDate non null → pas de vérification du contrat actif
        CreateSalaryContractRequest request = new CreateSalaryContractRequest(
                LocalDate.of(2022, 1, 1), LocalDate.of(2022, 12, 31), 40000f, 12, 35f, 0f, 0f);

        when(salaryContractRepository.save(any(SalaryContract.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> salaryContractService.create(request, owner));
        verify(salaryContractRepository, never()).existsByUserAndEndDateIsNull(any());
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLeContrat() {
        UpdateSalaryContractRequest request = new UpdateSalaryContractRequest(
                LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31), 48000f, 13, 35f, 9.5f, 60f);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));
        when(salaryContractRepository.save(any(SalaryContract.class))).thenAnswer(inv -> inv.getArgument(0));

        SalaryContractDto result = salaryContractService.update(1L, request, owner);

        assertThat(result.annualGrossSalary()).isEqualTo(48000f);
        assertThat(result.paidMonthsPerYear()).isEqualTo(13);
    }

    @Test
    void update_leve403_siPasLeProprietaire() {
        UpdateSalaryContractRequest request = new UpdateSalaryContractRequest(
                LocalDate.of(2023, 1, 1), null, 48000f, 12, 35f, 9.5f, 50f);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));

        assertThatThrownBy(() -> salaryContractService.update(1L, request, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void update_leve409_siReactivationConflitAvecContratActif() {
        // Contrat actuellement clôturé que l'on veut remettre actif
        SalaryContract closedContract = SalaryContract.builder()
                .id(2L).user(owner)
                .startDate(LocalDate.of(2022, 1, 1))
                .endDate(LocalDate.of(2022, 12, 31))
                .annualGrossSalary(40000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(0f).mealVoucherEmployeeRate(0f)
                .build();
        UpdateSalaryContractRequest request = new UpdateSalaryContractRequest(
                LocalDate.of(2022, 1, 1), null, 40000f, 12, 35f, 0f, 0f);

        when(salaryContractRepository.findById(2L)).thenReturn(Optional.of(closedContract));
        when(salaryContractRepository.existsByUserAndEndDateIsNull(owner)).thenReturn(true);

        assertThatThrownBy(() -> salaryContractService.update(2L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLe_contrat() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));

        salaryContractService.delete(1L, owner);

        verify(salaryContractRepository).deleteById(1L);
    }

    @Test
    void delete_leve403_siPasLeProprietaire() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));

        assertThatThrownBy(() -> salaryContractService.delete(1L, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(salaryContractRepository, never()).deleteById(any());
    }

    @Test
    void delete_autorisePourAdmin() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));

        salaryContractService.delete(1L, admin);

        verify(salaryContractRepository).deleteById(1L);
    }
}
