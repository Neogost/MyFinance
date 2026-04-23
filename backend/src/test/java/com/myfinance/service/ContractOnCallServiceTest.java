package com.myfinance.service;

import com.myfinance.domain.ContractOnCall;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.ContractOnCallDto;
import com.myfinance.dto.CreateContractOnCallRequest;
import com.myfinance.dto.UpdateContractOnCallRequest;
import com.myfinance.repository.ContractOnCallRepository;
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
class ContractOnCallServiceTest {

    @Mock ContractOnCallRepository contractOnCallRepository;
    @Mock SalaryContractRepository salaryContractRepository;
    @InjectMocks SalaryContractService salaryContractService;
    ContractOnCallService contractOnCallService;

    User owner;
    SalaryContract contract;
    ContractOnCall onCall;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        contract = SalaryContract.builder()
                .id(1L).user(owner)
                .startDate(LocalDate.of(2023, 1, 1)).endDate(null)
                .annualGrossSalary(45000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(0f).mealVoucherEmployeeRate(50f)
                .build();
        onCall = ContractOnCall.builder()
                .id(10L).contract(contract)
                .weeklyFlatRate(500f).estimatedWeeksPerYear(5)
                .build();

        contractOnCallService = new ContractOnCallService(contractOnCallRepository, salaryContractService);
    }

    // ── findAllByContract ──────────────────────────────────────

    @Test
    void findAllByContract_retourneLaListeDesAstreintes() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractOnCallRepository.findByContractOrderByIdAsc(contract)).thenReturn(List.of(onCall));

        List<ContractOnCallDto> result = contractOnCallService.findAllByContract(1L, owner);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).weeklyFlatRate()).isEqualTo(500f);
        assertThat(result.get(0).estimatedWeeksPerYear()).isEqualTo(5);
        assertThat(result.get(0).annualOnCallIncome()).isEqualTo(2500f);
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_sauvegardeLastreinte() {
        CreateContractOnCallRequest request = new CreateContractOnCallRequest(500f, 5);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractOnCallRepository.save(any())).thenAnswer(inv -> {
            ContractOnCall oc = inv.getArgument(0);
            return ContractOnCall.builder().id(10L).contract(contract)
                    .weeklyFlatRate(oc.getWeeklyFlatRate())
                    .estimatedWeeksPerYear(oc.getEstimatedWeeksPerYear())
                    .build();
        });

        ContractOnCallDto result = contractOnCallService.create(1L, request, owner);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.weeklyFlatRate()).isEqualTo(500f);
        assertThat(result.estimatedWeeksPerYear()).isEqualTo(5);
        assertThat(result.annualOnCallIncome()).isEqualTo(2500f);
        verify(contractOnCallRepository).save(any(ContractOnCall.class));
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLastreinte() {
        UpdateContractOnCallRequest request = new UpdateContractOnCallRequest(600f, 10);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractOnCallRepository.findById(10L)).thenReturn(Optional.of(onCall));
        when(contractOnCallRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ContractOnCallDto result = contractOnCallService.update(1L, 10L, request, owner);

        assertThat(result.weeklyFlatRate()).isEqualTo(600f);
        assertThat(result.estimatedWeeksPerYear()).isEqualTo(10);
        assertThat(result.annualOnCallIncome()).isEqualTo(6000f);
    }

    @Test
    void update_leve404_siAstreintIntrouvable() {
        UpdateContractOnCallRequest request = new UpdateContractOnCallRequest(500f, 5);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractOnCallRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractOnCallService.update(1L, 99L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_leve404_siAstreinteNappartientPasAuContrat() {
        SalaryContract autreContrat = SalaryContract.builder().id(99L).user(owner)
                .startDate(LocalDate.of(2020, 1, 1)).endDate(null)
                .annualGrossSalary(30000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(0f).mealVoucherEmployeeRate(0f)
                .build();
        ContractOnCall onCallAutreContrat = ContractOnCall.builder()
                .id(10L).contract(autreContrat)
                .weeklyFlatRate(500f).estimatedWeeksPerYear(5)
                .build();
        UpdateContractOnCallRequest request = new UpdateContractOnCallRequest(500f, 5);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractOnCallRepository.findById(10L)).thenReturn(Optional.of(onCallAutreContrat));

        assertThatThrownBy(() -> contractOnCallService.update(1L, 10L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLastreinte() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractOnCallRepository.findById(10L)).thenReturn(Optional.of(onCall));

        contractOnCallService.delete(1L, 10L, owner);

        verify(contractOnCallRepository).deleteById(10L);
    }

    @Test
    void delete_leve404_siAstreinteIntrouvable() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractOnCallRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractOnCallService.delete(1L, 99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(contractOnCallRepository, never()).deleteById(any());
    }
}
