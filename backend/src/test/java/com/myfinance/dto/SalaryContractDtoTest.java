package com.myfinance.dto;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;

/**
 * Vérifie que les formules de projection de SalaryContractDto::from sont correctes.
 */
class SalaryContractDtoTest {

    private SalaryContract buildContract(float annualGross, int paidMonths, float weeklyHours,
                                          float voucherAmount, float employeeRate) {
        User user = User.builder().id(1L).role(RoleEnum.USER).build();
        return SalaryContract.builder()
                .id(1L).user(user)
                .startDate(LocalDate.of(2023, 1, 1)).endDate(null)
                .annualGrossSalary(annualGross)
                .paidMonthsPerYear(paidMonths)
                .weeklyHours(weeklyHours)
                .mealVoucherAmount(voucherAmount)
                .mealVoucherEmployeeRate(employeeRate)
                .build();
    }

    // ── Salaire net annuel ─────────────────────────────────────

    @Test
    void annualNetSalary_estEgalA75PourcentDuBrut() {
        SalaryContractDto dto = SalaryContractDto.from(buildContract(40000f, 12, 35f, 0f, 0f));

        assertThat(dto.annualNetSalary()).isCloseTo(30000f, offset(0.01f));
    }

    // ── Salaires mensuels ──────────────────────────────────────

    @Test
    void monthlyGrossSalary_estEgalBrutAnnuelDivisePairNbMois() {
        SalaryContractDto dto = SalaryContractDto.from(buildContract(48000f, 12, 35f, 0f, 0f));

        assertThat(dto.monthlyGrossSalary()).isCloseTo(4000f, offset(0.01f));
    }

    @Test
    void monthlyGrossSalary_avec13Mois() {
        SalaryContractDto dto = SalaryContractDto.from(buildContract(52000f, 13, 35f, 0f, 0f));

        assertThat(dto.monthlyGrossSalary()).isCloseTo(4000f, offset(0.01f));
    }

    @Test
    void monthlyNetSalary_estEgalNetAnnuelDivisePairNbMois() {
        // 48000 × 0.75 = 36000 / 12 = 3000
        SalaryContractDto dto = SalaryContractDto.from(buildContract(48000f, 12, 35f, 0f, 0f));

        assertThat(dto.monthlyNetSalary()).isCloseTo(3000f, offset(0.01f));
    }

    // ── Heures annuelles ───────────────────────────────────────

    @Test
    void annualWorkingHours_baseSur228JoursDivise5() {
        // 35h × (228 / 5) = 35 × 45.6 = 1596h
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.annualWorkingHours()).isCloseTo(1596f, offset(0.1f));
    }

    @Test
    void annualWorkingHours_avec39h() {
        // 39 × (228 / 5) = 39 × 45.6 = 1778.4h
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 39f, 0f, 0f));

        assertThat(dto.annualWorkingHours()).isCloseTo(1778.4f, offset(0.1f));
    }

    // ── Salaires horaires ──────────────────────────────────────

    @Test
    void hourlyGrossSalary_estBrutAnnuelDiviseParHeuresAnnuelles() {
        // 45000 / 1596 ≈ 28.20
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.hourlyGrossSalary()).isCloseTo(45000f / 1596f, offset(0.01f));
    }

    @Test
    void hourlyNetSalary_estNetAnnuelDiviseParHeuresAnnuelles() {
        // 33750 / 1596 ≈ 21.15
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.hourlyNetSalary()).isCloseTo(33750f / 1596f, offset(0.01f));
    }

    // ── Salaires journaliers ───────────────────────────────────

    @Test
    void dailyGrossSalary_estBrutAnnuelDivisePar228() {
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.dailyGrossSalary()).isCloseTo(45000f / 228f, offset(0.01f));
    }

    @Test
    void dailyNetSalary_estNetAnnuelDivisePar228() {
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.dailyNetSalary()).isCloseTo(33750f / 228f, offset(0.01f));
    }

    // ── Tickets restaurant ─────────────────────────────────────

    @Test
    void employeeMonthlyMealVoucherCost_base19JoursMois() {
        // 10€ × 50% × 19 = 95€
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 35f, 10f, 50f));

        assertThat(dto.employeeMonthlyMealVoucherCost()).isCloseTo(95f, offset(0.01f));
    }

    @Test
    void employerMonthlyMealVoucherCost_estComplementAiresAuSalarie() {
        // 10€ × 50% × 19 = 95€ (employeur = 100% - 50%)
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 35f, 10f, 50f));

        assertThat(dto.employerMonthlyMealVoucherCost()).isCloseTo(95f, offset(0.01f));
    }

    @Test
    void mealVoucherCosts_avecRepartitionAsymetrique() {
        // 9.5€, salarié 60% → salarié = 9.5 × 0.6 × 19 = 108.3 / employeur = 9.5 × 0.4 × 19 = 72.2
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 35f, 9.5f, 60f));

        assertThat(dto.employeeMonthlyMealVoucherCost()).isCloseTo(108.3f, offset(0.1f));
        assertThat(dto.employerMonthlyMealVoucherCost()).isCloseTo(72.2f, offset(0.1f));
    }

    @Test
    void mealVoucherCosts_sontZero_siAucunTicket() {
        SalaryContractDto dto = SalaryContractDto.from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.employeeMonthlyMealVoucherCost()).isZero();
        assertThat(dto.employerMonthlyMealVoucherCost()).isZero();
    }
}
