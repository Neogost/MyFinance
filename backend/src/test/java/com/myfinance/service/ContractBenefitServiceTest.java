package com.myfinance.service;

import com.myfinance.domain.ContractBenefit;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.ContractBenefitDto;
import com.myfinance.dto.CreateContractBenefitRequest;
import com.myfinance.dto.UpdateContractBenefitRequest;
import com.myfinance.repository.ContractBenefitRepository;
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
class ContractBenefitServiceTest {

    @Mock ContractBenefitRepository contractBenefitRepository;
    @Mock SalaryContractRepository salaryContractRepository;
    @InjectMocks SalaryContractService salaryContractService;
    ContractBenefitService contractBenefitService;

    User owner;
    SalaryContract contract;
    ContractBenefit benefitTeletravail;
    ContractBenefit benefitTelephone;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        contract = SalaryContract.builder()
                .id(1L).user(owner)
                .startDate(LocalDate.of(2023, 1, 1)).endDate(null)
                .annualGrossSalary(45000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(9.5f).mealVoucherEmployeeRate(50f)
                .build();
        benefitTeletravail = ContractBenefit.builder()
                .id(10L).contract(contract)
                .label("Frais de télétravail").monthlyAmount(50f)
                .build();
        benefitTelephone = ContractBenefit.builder()
                .id(11L).contract(contract)
                .label("Forfait téléphone").monthlyAmount(30f)
                .build();

        contractBenefitService = new ContractBenefitService(contractBenefitRepository, salaryContractService);
    }

    // ── findAllByContract ──────────────────────────────────────

    @Test
    void findAllByContract_retourneLaListeDesAvantages() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBenefitRepository.findByContractOrderByLabelAsc(contract))
                .thenReturn(List.of(benefitTelephone, benefitTeletravail));

        List<ContractBenefitDto> result = contractBenefitService.findAllByContract(1L, owner);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).label()).isEqualTo("Forfait téléphone");
        assertThat(result.get(1).label()).isEqualTo("Frais de télétravail");
    }

    @Test
    void findAllByContract_leve404_siContratIntrouvable() {
        when(salaryContractRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractBenefitService.findAllByContract(99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_creeLAvantage() {
        CreateContractBenefitRequest request = new CreateContractBenefitRequest(
                "Frais de télétravail", 50f);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBenefitRepository.save(any())).thenAnswer(inv -> {
            ContractBenefit b = inv.getArgument(0);
            return ContractBenefit.builder().id(10L).contract(contract)
                    .label(b.getLabel()).monthlyAmount(b.getMonthlyAmount()).build();
        });

        ContractBenefitDto result = contractBenefitService.create(1L, request, owner);

        assertThat(result.label()).isEqualTo("Frais de télétravail");
        assertThat(result.monthlyAmount()).isEqualTo(50f);
        assertThat(result.id()).isEqualTo(10L);
    }

    @Test
    void create_leve403_siContratAppartientAAutrui() {
        User autre = User.builder().id(2L).login("autre").role(RoleEnum.USER).build();
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> contractBenefitService.create(1L, new CreateContractBenefitRequest("X", 10f), autre))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));

        verify(contractBenefitRepository, never()).save(any());
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLAvantage() {
        UpdateContractBenefitRequest request = new UpdateContractBenefitRequest(
                "Frais de télétravail modifié", 60f);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBenefitRepository.findById(10L)).thenReturn(Optional.of(benefitTeletravail));
        when(contractBenefitRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ContractBenefitDto result = contractBenefitService.update(1L, 10L, request, owner);

        assertThat(result.label()).isEqualTo("Frais de télétravail modifié");
        assertThat(result.monthlyAmount()).isEqualTo(60f);
    }

    @Test
    void update_leve404_siAvantageNappartientPasAuContrat() {
        SalaryContract autreContrat = SalaryContract.builder().id(99L).user(owner)
                .startDate(LocalDate.of(2020, 1, 1)).endDate(null)
                .annualGrossSalary(30000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(0f).mealVoucherEmployeeRate(0f)
                .build();
        ContractBenefit avantageAutreContrat = ContractBenefit.builder()
                .id(10L).contract(autreContrat).label("X").monthlyAmount(20f).build();

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBenefitRepository.findById(10L)).thenReturn(Optional.of(avantageAutreContrat));

        assertThatThrownBy(() -> contractBenefitService.update(1L, 10L,
                new UpdateContractBenefitRequest("X", 20f), owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLAvantage() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBenefitRepository.findById(10L)).thenReturn(Optional.of(benefitTeletravail));

        contractBenefitService.delete(1L, 10L, owner);

        verify(contractBenefitRepository).deleteById(10L);
    }

    @Test
    void delete_leve404_siAvantageIntrouvable() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBenefitRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractBenefitService.delete(1L, 99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(contractBenefitRepository, never()).deleteById(any());
    }
}
