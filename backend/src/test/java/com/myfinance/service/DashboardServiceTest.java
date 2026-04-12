package com.myfinance.service;

import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.SalaryEvolutionPointDto;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock MonthlyPaySlipRepository monthlyPaySlipRepository;
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
}
