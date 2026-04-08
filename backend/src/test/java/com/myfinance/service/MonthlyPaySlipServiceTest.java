package com.myfinance.service;

import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateMonthlyPaySlipRequest;
import com.myfinance.dto.MonthlyPaySlipDto;
import com.myfinance.dto.UpdateMonthlyPaySlipRequest;
import com.myfinance.repository.MonthlyPaySlipRepository;
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
class MonthlyPaySlipServiceTest {

    @Mock MonthlyPaySlipRepository monthlyPaySlipRepository;
    @Mock SalaryContractRepository salaryContractRepository;
    @InjectMocks SalaryContractService salaryContractService;
    // MonthlyPaySlipService dépend de SalaryContractService (pour la vérif ownership)
    MonthlyPaySlipService monthlyPaySlipService;

    User owner;
    SalaryContract contract;
    MonthlyPaySlip slip;

    @BeforeEach
    void setUp() {
        owner    = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        contract = SalaryContract.builder()
                .id(1L).user(owner)
                .startDate(LocalDate.of(2023, 1, 1)).endDate(null)
                .annualGrossSalary(45000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(9.5f).mealVoucherEmployeeRate(50f)
                .build();
        slip = MonthlyPaySlip.builder()
                .id(10L).contract(contract)
                .period(LocalDate.of(2025, 3, 1))
                .grossSalary(3900f).taxableNetSalary(3150f)
                .netSalary(2820f).incomeTaxWithholding(330f)
                .build();

        // Construction manuelle car MonthlyPaySlipService dépend de SalaryContractService
        monthlyPaySlipService = new MonthlyPaySlipService(monthlyPaySlipRepository, salaryContractService);
    }

    // ── findAllByContract ──────────────────────────────────────

    @Test
    void findAllByContract_retourneLaListeDesBulletins() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(monthlyPaySlipRepository.findByContractOrderByPeriodDesc(contract))
                .thenReturn(List.of(slip));

        List<MonthlyPaySlipDto> result = monthlyPaySlipService.findAllByContract(1L, owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).grossSalary()).isEqualTo(3900f);
        assertThat(result.get(0).period()).isEqualTo(LocalDate.of(2025, 3, 1));
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_creeLeContracterEtRetourneLDto() {
        CreateMonthlyPaySlipRequest request = new CreateMonthlyPaySlipRequest(
                LocalDate.of(2025, 4, 1), 3900f, 3150f, 2820f, 330f);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(monthlyPaySlipRepository.existsByContractAndPeriod(contract, LocalDate.of(2025, 4, 1)))
                .thenReturn(false);
        when(monthlyPaySlipRepository.save(any(MonthlyPaySlip.class))).thenAnswer(inv -> {
            MonthlyPaySlip s = inv.getArgument(0);
            return MonthlyPaySlip.builder()
                    .id(11L).contract(contract)
                    .period(s.getPeriod()).grossSalary(s.getGrossSalary())
                    .taxableNetSalary(s.getTaxableNetSalary())
                    .netSalary(s.getNetSalary())
                    .incomeTaxWithholding(s.getIncomeTaxWithholding())
                    .build();
        });

        MonthlyPaySlipDto result = monthlyPaySlipService.create(1L, request, owner);

        assertThat(result.grossSalary()).isEqualTo(3900f);
        assertThat(result.period()).isEqualTo(LocalDate.of(2025, 4, 1));
    }

    @Test
    void create_leve409_siPeriodeDejaPresente() {
        CreateMonthlyPaySlipRequest request = new CreateMonthlyPaySlipRequest(
                LocalDate.of(2025, 3, 1), 3900f, 3150f, 2820f, 330f);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(monthlyPaySlipRepository.existsByContractAndPeriod(contract, LocalDate.of(2025, 3, 1)))
                .thenReturn(true);

        assertThatThrownBy(() -> monthlyPaySlipService.create(1L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(monthlyPaySlipRepository, never()).save(any());
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLeContracter() {
        UpdateMonthlyPaySlipRequest request = new UpdateMonthlyPaySlipRequest(
                LocalDate.of(2025, 3, 1), 4100f, 3300f, 2950f, 350f);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(monthlyPaySlipRepository.findById(10L)).thenReturn(Optional.of(slip));
        when(monthlyPaySlipRepository.save(any(MonthlyPaySlip.class))).thenAnswer(inv -> inv.getArgument(0));

        MonthlyPaySlipDto result = monthlyPaySlipService.update(1L, 10L, request, owner);

        assertThat(result.grossSalary()).isEqualTo(4100f);
        assertThat(result.netSalary()).isEqualTo(2950f);
    }

    @Test
    void update_leve409_siNouvellePerioDejaPresente() {
        UpdateMonthlyPaySlipRequest request = new UpdateMonthlyPaySlipRequest(
                LocalDate.of(2025, 4, 1), 4100f, 3300f, 2950f, 350f);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(monthlyPaySlipRepository.findById(10L)).thenReturn(Optional.of(slip));
        when(monthlyPaySlipRepository.existsByContractAndPeriod(contract, LocalDate.of(2025, 4, 1)))
                .thenReturn(true);

        assertThatThrownBy(() -> monthlyPaySlipService.update(1L, 10L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void update_leve404_siBulletinNappartientPasAuContrat() {
        // Bulletin rattaché à un autre contrat
        SalaryContract autreContrat = SalaryContract.builder().id(99L).user(owner)
                .startDate(LocalDate.of(2020, 1, 1)).endDate(null)
                .annualGrossSalary(30000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(0f).mealVoucherEmployeeRate(0f)
                .build();
        MonthlyPaySlip slipAutreContrat = MonthlyPaySlip.builder()
                .id(10L).contract(autreContrat)
                .period(LocalDate.of(2025, 3, 1))
                .grossSalary(2500f).taxableNetSalary(2000f).netSalary(1800f).incomeTaxWithholding(200f)
                .build();
        UpdateMonthlyPaySlipRequest request = new UpdateMonthlyPaySlipRequest(
                LocalDate.of(2025, 3, 1), 4100f, 3300f, 2950f, 350f);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(monthlyPaySlipRepository.findById(10L)).thenReturn(Optional.of(slipAutreContrat));

        assertThatThrownBy(() -> monthlyPaySlipService.update(1L, 10L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLeBulletin() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(monthlyPaySlipRepository.findById(10L)).thenReturn(Optional.of(slip));

        monthlyPaySlipService.delete(1L, 10L, owner);

        verify(monthlyPaySlipRepository).deleteById(10L);
    }

    @Test
    void delete_leve404_siBulletinIntrouvable() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(monthlyPaySlipRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> monthlyPaySlipService.delete(1L, 99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(monthlyPaySlipRepository, never()).deleteById(any());
    }
}
