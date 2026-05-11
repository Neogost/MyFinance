package com.myfinance.service;

import com.myfinance.domain.BonusTypeEnum;
import com.myfinance.domain.ContractBonus;
import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.SalaryEvolutionPointDto;
import com.myfinance.repository.ContractBonusRepository;
import com.myfinance.repository.MonthlyPaySlipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock MonthlyPaySlipRepository monthlyPaySlipRepository;
    @Mock ContractBonusRepository  contractBonusRepository;
    @InjectMocks DashboardService dashboardService;

    User user;
    SalaryContract contratA;
    SalaryContract contratB;
    MonthlyPaySlip slipJan2024;
    MonthlyPaySlip slipFev2024;
    MonthlyPaySlip slipMar2025;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("neogost").role(RoleEnum.USER).build();

        contratA = SalaryContract.builder()
                .id(1L).user(user).companyName("Conserto")
                .startDate(LocalDate.of(2022, 1, 1))
                .endDate(LocalDate.of(2025, 1, 23))
                .annualGrossSalary(45000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(9.5f).mealVoucherEmployeeRate(50f)
                .build();

        contratB = SalaryContract.builder()
                .id(2L).user(user).companyName("Milhertech")
                .startDate(LocalDate.of(2025, 1, 31))
                .annualGrossSalary(47000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(9.5f).mealVoucherEmployeeRate(50f)
                .build();

        slipJan2024 = MonthlyPaySlip.builder()
                .id(1L).contract(contratA).period(LocalDate.of(2024, 1, 1))
                .grossSalary(3750f).taxableNetSalary(3082f).netSalary(2857f).incomeTaxWithholding(225f)
                .build();

        slipFev2024 = MonthlyPaySlip.builder()
                .id(2L).contract(contratA).period(LocalDate.of(2024, 2, 1))
                .grossSalary(3750f).taxableNetSalary(3082f).netSalary(2857f).incomeTaxWithholding(225f)
                .build();

        slipMar2025 = MonthlyPaySlip.builder()
                .id(3L).contract(contratB).period(LocalDate.of(2025, 3, 1))
                .grossSalary(3916f).taxableNetSalary(3220f).netSalary(2980f).incomeTaxWithholding(240f)
                .build();

        // Par défaut aucune prime — les tests existants ne testent pas les primes
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of());
    }

    // ── getSalaryEvolution ─────────────────────────────────────

    @Test
    void getSalaryEvolution_retourneLesPointsTriesParPeriode() {
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024, slipFev2024, slipMar2025));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result).hasSize(3);
        assertThat(result.get(0).period()).isEqualTo(LocalDate.of(2024, 1, 1));
        assertThat(result.get(1).period()).isEqualTo(LocalDate.of(2024, 2, 1));
        assertThat(result.get(2).period()).isEqualTo(LocalDate.of(2025, 3, 1));
    }

    @Test
    void getSalaryEvolution_mappeCorrectementLesChamps() {
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));

        SalaryEvolutionPointDto point = dashboardService.getSalaryEvolution(user).get(0);

        assertThat(point.companyName()).isEqualTo("Conserto");
        assertThat(point.grossSalary()).isEqualTo(3750f);
        assertThat(point.taxableNetSalary()).isEqualTo(3082f);
        assertThat(point.netSalary()).isEqualTo(2857f);
        assertThat(point.incomeTaxWithholding()).isEqualTo(225f);
    }

    @Test
    void getSalaryEvolution_inclutLeNomDeLentrepriseDeChaqueBulletin() {
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipFev2024, slipMar2025));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).companyName()).isEqualTo("Conserto");
        assertThat(result.get(1).companyName()).isEqualTo("Milhertech");
    }

    @Test
    void getSalaryEvolution_retourneListeVide_siAucunBulletin() {
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of());

        assertThat(dashboardService.getSalaryEvolution(user)).isEmpty();
    }

    @Test
    void getSalaryEvolution_aggregeDeuxBulletinsDuMemeMois() {
        // Deux contrats avec chacun un bulletin sur janvier 2025 (chevauchement)
        MonthlyPaySlip slipA = MonthlyPaySlip.builder()
                .id(10L).contract(contratA).period(LocalDate.of(2025, 1, 1))
                .grossSalary(500f).taxableNetSalary(410f).netSalary(380f).incomeTaxWithholding(30f)
                .build();
        MonthlyPaySlip slipB = MonthlyPaySlip.builder()
                .id(11L).contract(contratB).period(LocalDate.of(2025, 1, 1))
                .grossSalary(600f).taxableNetSalary(492f).netSalary(456f).incomeTaxWithholding(36f)
                .build();

        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipA, slipB));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        // Un seul point pour janvier 2025
        assertThat(result).hasSize(1);
        SalaryEvolutionPointDto point = result.get(0);
        assertThat(point.period()).isEqualTo(LocalDate.of(2025, 1, 1));
        assertThat(point.grossSalary()).isEqualTo(1100f);
        assertThat(point.taxableNetSalary()).isEqualTo(902f);
        assertThat(point.netSalary()).isEqualTo(836f);
        assertThat(point.incomeTaxWithholding()).isEqualTo(66f);
        assertThat(point.companyName()).contains("Conserto").contains("Milhertech");
    }

    // ── computeBonusForPeriod : EXCEPTIONNELLE ─────────────────────────────

    @Test
    void getSalaryEvolution_primeExceptionnelle_verseeLeMoisDePaymentDate() {
        ContractBonus exc = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.EXCEPTIONNELLE)
                .paymentDate(LocalDate.of(2024, 1, 15))
                .grossAmount(1000f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024, slipFev2024));
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(exc));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(1000f);  // janvier : prime
        assertThat(result.get(1).bonusGrossAmount()).isEqualTo(0f);     // février : pas de prime
    }

    @Test
    void getSalaryEvolution_primeExceptionnelle_sansPaymentDate_ignoree() {
        ContractBonus exc = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.EXCEPTIONNELLE)
                .paymentDate(null).grossAmount(1000f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(exc));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(0f);
    }

    @Test
    void getSalaryEvolution_primeExceptionnelle_paymentDateAnneeDifferente_ignoree() {
        ContractBonus exc = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.EXCEPTIONNELLE)
                .paymentDate(LocalDate.of(2023, 1, 15))
                .grossAmount(1000f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(exc));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(0f);
    }

    // ── computeBonusForPeriod : ANNUELLE ───────────────────────────────────

    @Test
    void getSalaryEvolution_primeAnnuelle_verseeChaqueAnneeLeMoisPaymentMonth() {
        ContractBonus annuelle = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.ANNUELLE)
                .paymentMonth(1).grossAmount(3000f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024, slipFev2024));
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(annuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(3000f);  // jan : prime
        assertThat(result.get(1).bonusGrossAmount()).isEqualTo(0f);     // fév : pas de prime
    }

    @Test
    void getSalaryEvolution_primeAnnuelle_sansPaymentMonth_ignoree() {
        ContractBonus annuelle = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.ANNUELLE)
                .paymentMonth(null).grossAmount(3000f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(annuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(0f);
    }

    @Test
    void getSalaryEvolution_primeAnnuelle_contratExpireAvantPeriode_ignoree() {
        SalaryContract contratExpire = SalaryContract.builder()
                .id(99L).user(user).companyName("Ancien")
                .startDate(LocalDate.of(2020, 1, 1))
                .endDate(LocalDate.of(2022, 12, 31))  // expire en 2022
                .annualGrossSalary(40000f).paidMonthsPerYear(12).build();
        ContractBonus annuelle = ContractBonus.builder()
                .contract(contratExpire).type(BonusTypeEnum.ANNUELLE)
                .paymentMonth(1).grossAmount(3000f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));  // période 2024 > endDate 2022
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(annuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(0f);
    }

    @Test
    void getSalaryEvolution_primeAnnuelle_contratPasEncoreDemarre_ignoree() {
        SalaryContract contratFutur = SalaryContract.builder()
                .id(99L).user(user).companyName("Futur")
                .startDate(LocalDate.of(2025, 1, 1))  // commence en 2025
                .annualGrossSalary(50000f).paidMonthsPerYear(12).build();
        ContractBonus annuelle = ContractBonus.builder()
                .contract(contratFutur).type(BonusTypeEnum.ANNUELLE)
                .paymentMonth(1).grossAmount(3000f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));  // période 2024 < startDate 2025
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(annuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(0f);
    }

    // ── computeBonusForPeriod : MENSUELLE ──────────────────────────────────

    @Test
    void getSalaryEvolution_primeMensuelle_activeEntreStartEtEnd() {
        ContractBonus mensuelle = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.MENSUELLE)
                .startDate(LocalDate.of(2024, 1, 1))
                .endDate(LocalDate.of(2024, 12, 31))
                .grossAmount(150f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024, slipFev2024));
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(mensuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(150f);
        assertThat(result.get(1).bonusGrossAmount()).isEqualTo(150f);
    }

    @Test
    void getSalaryEvolution_primeMensuelle_endDateNull_indefinie() {
        ContractBonus mensuelle = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.MENSUELLE)
                .startDate(LocalDate.of(2024, 1, 1))
                .endDate(null)  // sans fin
                .grossAmount(100f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipMar2025));  // mars 2025, bien après start
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(mensuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(100f);
    }

    @Test
    void getSalaryEvolution_primeMensuelle_startDateApresLaPeriode_ignoree() {
        ContractBonus mensuelle = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.MENSUELLE)
                .startDate(LocalDate.of(2024, 6, 1))
                .endDate(null).grossAmount(100f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));  // janvier 2024 < startDate juin 2024
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(mensuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(0f);
    }

    @Test
    void getSalaryEvolution_primeMensuelle_endDateAvantLaPeriode_ignoree() {
        ContractBonus mensuelle = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.MENSUELLE)
                .startDate(LocalDate.of(2023, 1, 1))
                .endDate(LocalDate.of(2023, 12, 31))  // se termine avant 2024
                .grossAmount(100f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(mensuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(0f);
    }

    @Test
    void getSalaryEvolution_primeMensuelle_sansStartDate_ignoree() {
        ContractBonus mensuelle = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.MENSUELLE)
                .startDate(null).grossAmount(100f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));
        when(contractBonusRepository.findByContractUser(any())).thenReturn(List.of(mensuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(0f);
    }

    // ── Combinaison de plusieurs primes sur la même période ────────────────

    @Test
    void getSalaryEvolution_plusieursPrimesMemeMois_sommees() {
        ContractBonus exc = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.EXCEPTIONNELLE)
                .paymentDate(LocalDate.of(2024, 1, 15)).grossAmount(500f).build();
        ContractBonus annuelle = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.ANNUELLE)
                .paymentMonth(1).grossAmount(3000f).build();
        ContractBonus mensuelle = ContractBonus.builder()
                .contract(contratA).type(BonusTypeEnum.MENSUELLE)
                .startDate(LocalDate.of(2024, 1, 1)).grossAmount(100f).build();
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of(slipJan2024));
        when(contractBonusRepository.findByContractUser(any()))
                .thenReturn(List.of(exc, annuelle, mensuelle));

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result.get(0).bonusGrossAmount()).isEqualTo(3600f);  // 500 + 3000 + 100
    }

    // ── Edge case : aucun bulletin ─────────────────────────────────────────

    @Test
    void getSalaryEvolution_aucunBulletin_retourneListeVide() {
        when(monthlyPaySlipRepository.findByContractUserOrderByPeriodAsc(user))
                .thenReturn(List.of());

        List<SalaryEvolutionPointDto> result = dashboardService.getSalaryEvolution(user);

        assertThat(result).isEmpty();
    }
}
