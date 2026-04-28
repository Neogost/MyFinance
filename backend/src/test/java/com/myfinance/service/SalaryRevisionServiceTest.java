package com.myfinance.service;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.SalaryRevision;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateSalaryRevisionRequest;
import com.myfinance.dto.SalaryRevisionDto;
import com.myfinance.dto.UpdateSalaryRevisionRequest;
import com.myfinance.repository.SalaryContractRepository;
import com.myfinance.repository.SalaryRevisionRepository;
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
class SalaryRevisionServiceTest {

    @Mock SalaryRevisionRepository salaryRevisionRepository;
    @Mock SalaryContractRepository salaryContractRepository;
    @Mock PointValueService         pointValueService;
    @InjectMocks SalaryContractService salaryContractService;
    SalaryRevisionService salaryRevisionService;

    User owner;
    SalaryContract contract;
    SalaryRevision revision2024;
    SalaryRevision revision2025;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        contract = SalaryContract.builder()
                .id(1L).user(owner)
                .startDate(LocalDate.of(2023, 1, 1)).endDate(null)
                .annualGrossSalary(43000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(9.5f).mealVoucherEmployeeRate(50f)
                .build();
        revision2024 = SalaryRevision.builder()
                .id(1L).contract(contract)
                .effectiveDate(LocalDate.of(2024, 1, 1))
                .annualGrossSalary(45000f).label("Augmentation 2024")
                .build();
        revision2025 = SalaryRevision.builder()
                .id(2L).contract(contract)
                .effectiveDate(LocalDate.of(2025, 1, 1))
                .annualGrossSalary(47000f).label("Augmentation 2025")
                .build();

        salaryRevisionService = new SalaryRevisionService(salaryRevisionRepository, salaryContractService, pointValueService);
    }

    // ── findAllByContract ──────────────────────────────────────

    @Test
    void findAllByContract_retourneLaListeTrieeParDateDesc() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(salaryRevisionRepository.findByContractOrderByEffectiveDateDesc(contract))
                .thenReturn(List.of(revision2025, revision2024));

        List<SalaryRevisionDto> result = salaryRevisionService.findAllByContract(1L, owner);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).annualGrossSalary()).isEqualTo(47000f);
        assertThat(result.get(1).annualGrossSalary()).isEqualTo(45000f);
    }

    @Test
    void findAllByContract_leve404_siContratIntrouvable() {
        when(salaryContractRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> salaryRevisionService.findAllByContract(99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_creeLaRevision() {
        CreateSalaryRevisionRequest request = new CreateSalaryRevisionRequest(
                LocalDate.of(2025, 1, 1), 47000f, null, "Augmentation 2025");

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(salaryRevisionRepository.existsByContractAndEffectiveDate(contract, LocalDate.of(2025, 1, 1)))
                .thenReturn(false);
        when(salaryRevisionRepository.save(any())).thenAnswer(inv -> {
            SalaryRevision r = inv.getArgument(0);
            return SalaryRevision.builder().id(2L).contract(contract)
                    .effectiveDate(r.getEffectiveDate())
                    .annualGrossSalary(r.getAnnualGrossSalary())
                    .label(r.getLabel()).build();
        });

        SalaryRevisionDto result = salaryRevisionService.create(1L, request, owner);

        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.annualGrossSalary()).isEqualTo(47000f);
        assertThat(result.label()).isEqualTo("Augmentation 2025");
    }

    @Test
    void create_leve400_siDateAvantDebutContrat() {
        CreateSalaryRevisionRequest request = new CreateSalaryRevisionRequest(
                LocalDate.of(2022, 6, 1), 47000f, null, null);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> salaryRevisionService.create(1L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(salaryRevisionRepository, never()).save(any());
    }

    @Test
    void create_leve409_siDateDejaExistante() {
        CreateSalaryRevisionRequest request = new CreateSalaryRevisionRequest(
                LocalDate.of(2024, 1, 1), 46000f, null, null);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(salaryRevisionRepository.existsByContractAndEffectiveDate(contract, LocalDate.of(2024, 1, 1)))
                .thenReturn(true);

        assertThatThrownBy(() -> salaryRevisionService.create(1L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(salaryRevisionRepository, never()).save(any());
    }

    @Test
    void create_leve403_siContratAppartientAAutrui() {
        User autre = User.builder().id(2L).login("autre").role(RoleEnum.USER).build();
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> salaryRevisionService.create(1L,
                new CreateSalaryRevisionRequest(LocalDate.of(2025, 1, 1), 47000f, null, null), autre))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLaRevision() {
        UpdateSalaryRevisionRequest request = new UpdateSalaryRevisionRequest(
                LocalDate.of(2024, 1, 1), 46000f, null, "Augmentation 2024 corrigée");

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(salaryRevisionRepository.findById(1L)).thenReturn(Optional.of(revision2024));
        when(salaryRevisionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SalaryRevisionDto result = salaryRevisionService.update(1L, 1L, request, owner);

        assertThat(result.annualGrossSalary()).isEqualTo(46000f);
        assertThat(result.label()).isEqualTo("Augmentation 2024 corrigée");
    }

    @Test
    void update_leve409_siNouvelleDateDejaExistante() {
        UpdateSalaryRevisionRequest request = new UpdateSalaryRevisionRequest(
                LocalDate.of(2025, 1, 1), 46000f, null, null);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(salaryRevisionRepository.findById(1L)).thenReturn(Optional.of(revision2024));
        when(salaryRevisionRepository.existsByContractAndEffectiveDate(contract, LocalDate.of(2025, 1, 1)))
                .thenReturn(true);

        assertThatThrownBy(() -> salaryRevisionService.update(1L, 1L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLaRevision() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(salaryRevisionRepository.findById(1L)).thenReturn(Optional.of(revision2024));

        salaryRevisionService.delete(1L, 1L, owner);

        verify(salaryRevisionRepository).deleteById(1L);
    }

    @Test
    void delete_leve404_siRevisionIntrouvable() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(salaryRevisionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> salaryRevisionService.delete(1L, 99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(salaryRevisionRepository, never()).deleteById(any());
    }
}
