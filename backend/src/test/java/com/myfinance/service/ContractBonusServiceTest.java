package com.myfinance.service;

import com.myfinance.domain.BonusTypeEnum;
import com.myfinance.domain.ContractBonus;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.ContractBonusDto;
import com.myfinance.dto.CreateContractBonusRequest;
import com.myfinance.dto.UpdateContractBonusRequest;
import com.myfinance.repository.ContractBonusRepository;
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
class ContractBonusServiceTest {

    @Mock ContractBonusRepository contractBonusRepository;
    @Mock SalaryContractRepository salaryContractRepository;
    @InjectMocks SalaryContractService salaryContractService;
    ContractBonusService contractBonusService;

    User owner;
    SalaryContract contract;
    ContractBonus bonusAnnuel;
    ContractBonus bonusExceptionnel;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).login("owner").role(RoleEnum.USER).build();
        contract = SalaryContract.builder()
                .id(1L).user(owner)
                .startDate(LocalDate.of(2023, 1, 1)).endDate(null)
                .annualGrossSalary(45000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(9.5f).mealVoucherEmployeeRate(50f)
                .build();
        bonusAnnuel = ContractBonus.builder()
                .id(10L).contract(contract)
                .label("13ème mois").grossAmount(3750f)
                .type(BonusTypeEnum.ANNUELLE).paymentMonth(12)
                .build();
        bonusExceptionnel = ContractBonus.builder()
                .id(11L).contract(contract)
                .label("Prime Macron").grossAmount(1000f)
                .type(BonusTypeEnum.EXCEPTIONNELLE)
                .paymentDate(LocalDate.of(2025, 6, 1))
                .build();

        contractBonusService = new ContractBonusService(contractBonusRepository, salaryContractService);
    }

    // ── findAllByContract ──────────────────────────────────────

    @Test
    void findAllByContract_retourneLaListeDesPrimes() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBonusRepository.findByContractOrderByTypeAscPaymentMonthAscPaymentDateDesc(contract))
                .thenReturn(List.of(bonusAnnuel, bonusExceptionnel));

        List<ContractBonusDto> result = contractBonusService.findAllByContract(1L, owner);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).label()).isEqualTo("13ème mois");
        assertThat(result.get(0).type()).isEqualTo(BonusTypeEnum.ANNUELLE);
        assertThat(result.get(1).type()).isEqualTo(BonusTypeEnum.EXCEPTIONNELLE);
    }

    // ── create ─────────────────────────────────────────────────

    @Test
    void create_creeLaPrimeAnnuelle() {
        CreateContractBonusRequest request = new CreateContractBonusRequest(
                "13ème mois", 3750f, BonusTypeEnum.ANNUELLE, null, 12);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBonusRepository.save(any())).thenAnswer(inv -> {
            ContractBonus b = inv.getArgument(0);
            return ContractBonus.builder().id(10L).contract(contract)
                    .label(b.getLabel()).grossAmount(b.getGrossAmount())
                    .type(b.getType()).paymentMonth(b.getPaymentMonth()).build();
        });

        ContractBonusDto result = contractBonusService.create(1L, request, owner);

        assertThat(result.label()).isEqualTo("13ème mois");
        assertThat(result.type()).isEqualTo(BonusTypeEnum.ANNUELLE);
        assertThat(result.paymentMonth()).isEqualTo(12);
        assertThat(result.paymentDate()).isNull();
    }

    @Test
    void create_creeLaPrimeExceptionnelle() {
        CreateContractBonusRequest request = new CreateContractBonusRequest(
                "Prime Macron", 1000f, BonusTypeEnum.EXCEPTIONNELLE,
                LocalDate.of(2025, 6, 1), null);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBonusRepository.save(any())).thenAnswer(inv -> {
            ContractBonus b = inv.getArgument(0);
            return ContractBonus.builder().id(11L).contract(contract)
                    .label(b.getLabel()).grossAmount(b.getGrossAmount())
                    .type(b.getType()).paymentDate(b.getPaymentDate()).build();
        });

        ContractBonusDto result = contractBonusService.create(1L, request, owner);

        assertThat(result.type()).isEqualTo(BonusTypeEnum.EXCEPTIONNELLE);
        assertThat(result.paymentDate()).isEqualTo(LocalDate.of(2025, 6, 1));
        assertThat(result.paymentMonth()).isNull();
    }

    @Test
    void create_leve400_siAnnuelleSansPaymentMonth() {
        CreateContractBonusRequest request = new CreateContractBonusRequest(
                "13ème mois", 3750f, BonusTypeEnum.ANNUELLE, null, null);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> contractBonusService.create(1L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(contractBonusRepository, never()).save(any());
    }

    @Test
    void create_leve400_siExceptionnelleSansPaymentDate() {
        CreateContractBonusRequest request = new CreateContractBonusRequest(
                "Prime Macron", 1000f, BonusTypeEnum.EXCEPTIONNELLE, null, null);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> contractBonusService.create(1L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(contractBonusRepository, never()).save(any());
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLaPrime() {
        UpdateContractBonusRequest request = new UpdateContractBonusRequest(
                "13ème mois modifié", 4000f, BonusTypeEnum.ANNUELLE, null, 11);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBonusRepository.findById(10L)).thenReturn(Optional.of(bonusAnnuel));
        when(contractBonusRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ContractBonusDto result = contractBonusService.update(1L, 10L, request, owner);

        assertThat(result.label()).isEqualTo("13ème mois modifié");
        assertThat(result.grossAmount()).isEqualTo(4000f);
        assertThat(result.paymentMonth()).isEqualTo(11);
    }

    @Test
    void update_leve404_siPrimeNappartientPasAuContrat() {
        SalaryContract autreContrat = SalaryContract.builder().id(99L).user(owner)
                .startDate(LocalDate.of(2020, 1, 1)).endDate(null)
                .annualGrossSalary(30000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(0f).mealVoucherEmployeeRate(0f)
                .build();
        ContractBonus primeAutreContrat = ContractBonus.builder()
                .id(10L).contract(autreContrat)
                .label("Prime").grossAmount(500f)
                .type(BonusTypeEnum.ANNUELLE).paymentMonth(6)
                .build();
        UpdateContractBonusRequest request = new UpdateContractBonusRequest(
                "Prime", 500f, BonusTypeEnum.ANNUELLE, null, 6);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBonusRepository.findById(10L)).thenReturn(Optional.of(primeAutreContrat));

        assertThatThrownBy(() -> contractBonusService.update(1L, 10L, request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── delete ─────────────────────────────────────────────────

    @Test
    void delete_supprimeLaPrime() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBonusRepository.findById(10L)).thenReturn(Optional.of(bonusAnnuel));

        contractBonusService.delete(1L, 10L, owner);

        verify(contractBonusRepository).deleteById(10L);
    }

    @Test
    void delete_leve404_siPrimeIntrouvable() {
        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(contractBonusRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contractBonusService.delete(1L, 99L, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(contractBonusRepository, never()).deleteById(any());
    }
}
