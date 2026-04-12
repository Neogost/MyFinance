package com.myfinance.service;

import com.myfinance.config.TaxParameters;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateSalaryContractRequest;
import com.myfinance.dto.SalaryContractDto;
import com.myfinance.dto.UpdateSalaryContractRequest;
import com.myfinance.repository.ContractBenefitRepository;
import com.myfinance.repository.SalaryContractRepository;
import com.myfinance.repository.SalaryRevisionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyFloat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalaryContractServiceTest {

    @Mock SalaryContractRepository salaryContractRepository;
    @Mock ContractBenefitRepository contractBenefitRepository;
    @Mock SalaryRevisionRepository salaryRevisionRepository;
    @Mock TaxParameters taxParameters;
    @Mock TaxSimulatorService taxSimulatorService;
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
                .isCadre(false)
                .build();

        // Paramètres fiscaux 2025 pour les projections de net imposable
        TaxParameters.EmployeeContributions ec = new TaxParameters.EmployeeContributions();
        ec.setCsgBaseRate(0.9825f);
        ec.setCsgDeductibleRate(0.0680f);
        ec.setVieillessePlafonneRate(0.0690f);
        ec.setVieillesseDePlafonneeRate(0.0040f);
        ec.setAgircArrcoT1Rate(0.0315f);
        ec.setCegT1Rate(0.0086f);
        ec.setAgircArrcoT2Rate(0.0864f);
        ec.setCegT2Rate(0.0108f);
        ec.setApecRate(0.00024f);

        // lenient : certains tests lèvent une exception avant d'atteindre le calcul de projection
        Mockito.lenient().when(taxParameters.getPass()).thenReturn(47100f);
        Mockito.lenient().when(taxParameters.getEmployeeContributions()).thenReturn(ec);
        // Pas de fiscalParts sur les users de test → estimerImpotSurSalaire retourne null
        Mockito.lenient().when(taxSimulatorService.estimerImpotSurSalaire(anyFloat(), any())).thenReturn(null);
        // Aucun avantage en nature par défaut
        Mockito.lenient().when(contractBenefitRepository.findByContractOrderByLabelAsc(any())).thenReturn(List.of());
        // Aucune révision salariale par défaut → salaire du contrat utilisé
        Mockito.lenient().when(salaryRevisionRepository
                .findFirstByContractAndEffectiveDateLessThanEqualOrderByEffectiveDateDesc(any(), any()))
                .thenReturn(java.util.Optional.empty());
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
        // net imposable 45 000 brut non-cadre ≈ 36 904 €
        assertThat(result.annualNetImposable()).isCloseTo(36904.05f, offset(1f));
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
                LocalDate.of(2024, 1, 1), null, 50000f, 12, 35f, 10f, 50f, false, null);

        when(salaryContractRepository.existsByUserAndEndDateIsNull(owner)).thenReturn(false);
        when(salaryContractRepository.save(any(SalaryContract.class))).thenAnswer(inv -> {
            SalaryContract c = inv.getArgument(0);
            return SalaryContract.builder()
                    .id(2L).user(owner)
                    .startDate(c.getStartDate()).endDate(c.getEndDate())
                    .annualGrossSalary(c.getAnnualGrossSalary())
                    .paidMonthsPerYear(c.getPaidMonthsPerYear())
                    .weeklyHours(c.getWeeklyHours())
                    .mealVoucherAmount(c.getMealVoucherAmount())
                    .mealVoucherEmployeeRate(c.getMealVoucherEmployeeRate())
                    .isCadre(c.getIsCadre())
                    .employeePrevoyanceRate(c.getEmployeePrevoyanceRate())
                    .build();
        });

        SalaryContractDto result = salaryContractService.create(request, owner);

        // net imposable 50 000 brut non-cadre ≈ 41 039 €
        assertThat(result.annualGrossSalary()).isEqualTo(50000f);
        assertThat(result.annualNetImposable()).isCloseTo(41039.01f, offset(1f));
        verify(salaryContractRepository).save(any(SalaryContract.class));
    }

    @Test
    void create_leve409_siContratActifExisteDeja() {
        CreateSalaryContractRequest request = new CreateSalaryContractRequest(
                LocalDate.of(2024, 1, 1), null, 50000f, 12, 35f, 10f, 50f, false, null);

        when(salaryContractRepository.existsByUserAndEndDateIsNull(owner)).thenReturn(true);

        assertThatThrownBy(() -> salaryContractService.create(request, owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.CONFLICT));

        verify(salaryContractRepository, never()).save(any());
    }

    @Test
    void create_accepteContratCloture_memeSiUnAutreEstActif() {
        CreateSalaryContractRequest request = new CreateSalaryContractRequest(
                LocalDate.of(2022, 1, 1), LocalDate.of(2022, 12, 31), 40000f, 12, 35f, 0f, 0f, false, null);

        when(salaryContractRepository.save(any(SalaryContract.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(() -> salaryContractService.create(request, owner));
        verify(salaryContractRepository, never()).existsByUserAndEndDateIsNull(any());
    }

    // ── update ─────────────────────────────────────────────────

    @Test
    void update_modifieLeContrat() {
        UpdateSalaryContractRequest request = new UpdateSalaryContractRequest(
                LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31), 48000f, 13, 35f, 9.5f, 60f, false, null);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));
        when(salaryContractRepository.save(any(SalaryContract.class))).thenAnswer(inv -> inv.getArgument(0));

        SalaryContractDto result = salaryContractService.update(1L, request, owner);

        assertThat(result.annualGrossSalary()).isEqualTo(48000f);
        assertThat(result.paidMonthsPerYear()).isEqualTo(13);
    }

    @Test
    void update_leve403_siPasLeProprietaire() {
        UpdateSalaryContractRequest request = new UpdateSalaryContractRequest(
                LocalDate.of(2023, 1, 1), null, 48000f, 12, 35f, 9.5f, 50f, false, null);

        when(salaryContractRepository.findById(1L)).thenReturn(Optional.of(activeContract));

        assertThatThrownBy(() -> salaryContractService.update(1L, request, otherUser))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void update_leve409_siReactivationConflitAvecContratActif() {
        SalaryContract closedContract = SalaryContract.builder()
                .id(2L).user(owner)
                .startDate(LocalDate.of(2022, 1, 1))
                .endDate(LocalDate.of(2022, 12, 31))
                .annualGrossSalary(40000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(0f).mealVoucherEmployeeRate(0f)
                .isCadre(false)
                .build();
        UpdateSalaryContractRequest request = new UpdateSalaryContractRequest(
                LocalDate.of(2022, 1, 1), null, 40000f, 12, 35f, 0f, 0f, false, null);

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
