package com.myfinance.dto;

import com.myfinance.config.TaxParameters;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.service.TaxSimulatorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyFloat;
import static org.mockito.Mockito.when;

/**
 * Vérifie que les formules de projection de SalaryContractDto::from sont correctes.
 * Les users de test n'ont pas de fiscalParts → annualNetAfterTax est null dans tous les cas.
 */
@ExtendWith(MockitoExtension.class)
class SalaryContractDtoTest {

    @Mock
    TaxSimulatorService taxSimulatorService;

    TaxParameters taxParams;
    User userSansProfil;

    @BeforeEach
    void setUp() {
        // Paramètres fiscaux réels 2025 pour les tests
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

        taxParams = new TaxParameters();
        taxParams.setPass(47100f);
        taxParams.setEmployeeContributions(ec);

        // Utilisateur sans profil fiscal → estimerImpotSurSalaire retourne null
        userSansProfil = User.builder().id(1L).role(RoleEnum.USER).build();
        when(taxSimulatorService.estimerImpotSurSalaire(anyFloat(), any())).thenReturn(null);
    }

    private SalaryContract buildContract(float annualGross, int paidMonths, float weeklyHours,
                                          float voucherAmount, float employeeRate) {
        return SalaryContract.builder()
                .id(1L).user(userSansProfil)
                .startDate(LocalDate.of(2023, 1, 1)).endDate(null)
                .annualGrossSalary(annualGross)
                .paidMonthsPerYear(paidMonths)
                .weeklyHours(weeklyHours)
                .mealVoucherAmount(voucherAmount)
                .mealVoucherEmployeeRate(employeeRate)
                .isCadre(false)
                .build();
    }

    private SalaryContractDto from(SalaryContract c) {
        return SalaryContractDto.from(c, taxParams, userSansProfil, taxSimulatorService, 0f);
    }

    // ── Salaire net imposable annuel ───────────────────────────

    @Test
    void annualNetImposable_calculeLeNetImposableReel() {
        // 40 000 brut, non-cadre, sans prévoyance → net imposable ≈ 32 803,60
        SalaryContractDto dto = from(buildContract(40000f, 12, 35f, 0f, 0f));

        assertThat(dto.annualNetImposable()).isCloseTo(32803.6f, offset(1f));
    }

    // ── Salaires mensuels ──────────────────────────────────────

    @Test
    void monthlyGrossSalary_estEgalBrutAnnuelDivisePairNbMois() {
        SalaryContractDto dto = from(buildContract(48000f, 12, 35f, 0f, 0f));

        assertThat(dto.monthlyGrossSalary()).isCloseTo(4000f, offset(0.01f));
    }

    @Test
    void monthlyGrossSalary_avec13Mois() {
        SalaryContractDto dto = from(buildContract(52000f, 13, 35f, 0f, 0f));

        assertThat(dto.monthlyGrossSalary()).isCloseTo(4000f, offset(0.01f));
    }

    @Test
    void monthlyNetImposable_estEgalNetAnnuelDivisePairNbMois() {
        // 48 000 brut → net imposable ≈ 39 375,03 / 12 ≈ 3 281,25
        SalaryContractDto dto = from(buildContract(48000f, 12, 35f, 0f, 0f));

        assertThat(dto.monthlyNetImposable()).isCloseTo(39375.03f / 12f, offset(1f));
    }

    // ── Heures annuelles ───────────────────────────────────────

    @Test
    void annualWorkingHours_baseSur228JoursDivise5() {
        // 35h × (228 / 5) = 35 × 45.6 = 1596h
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.annualWorkingHours()).isCloseTo(1596f, offset(0.1f));
    }

    @Test
    void annualWorkingHours_avec39h() {
        // 39 × (228 / 5) = 39 × 45.6 = 1778.4h
        SalaryContractDto dto = from(buildContract(45000f, 12, 39f, 0f, 0f));

        assertThat(dto.annualWorkingHours()).isCloseTo(1778.4f, offset(0.1f));
    }

    // ── Salaires horaires ──────────────────────────────────────

    @Test
    void hourlyGrossSalary_estBrutAnnuelDiviseParHeuresAnnuelles() {
        // 45000 / 1596 ≈ 28.20
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.hourlyGrossSalary()).isCloseTo(45000f / 1596f, offset(0.01f));
    }

    @Test
    void hourlyNetImposable_estNetAnnuelDiviseParHeuresAnnuelles() {
        // net ≈ 36 904,05 / 1596 ≈ 23.12
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.hourlyNetImposable()).isCloseTo(36904.05f / 1596f, offset(0.1f));
    }

    // ── Salaires journaliers ───────────────────────────────────

    @Test
    void dailyGrossSalary_estBrutAnnuelDivisePar228() {
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.dailyGrossSalary()).isCloseTo(45000f / 228f, offset(0.01f));
    }

    @Test
    void dailyNetImposable_estNetAnnuelDivisePar228() {
        // net ≈ 36 904,05 / 228 ≈ 161.86
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.dailyNetImposable()).isCloseTo(36904.05f / 228f, offset(0.1f));
    }

    // ── Tickets restaurant ─────────────────────────────────────

    @Test
    void employeeMonthlyMealVoucherCost_base19JoursMois() {
        // 10€ × 50% × 19 = 95€
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 10f, 50f));

        assertThat(dto.employeeMonthlyMealVoucherCost()).isCloseTo(95f, offset(0.01f));
    }

    @Test
    void employerMonthlyMealVoucherCost_estComplementAiresAuSalarie() {
        // 10€ × 50% × 19 = 95€ (employeur = 100% - 50%)
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 10f, 50f));

        assertThat(dto.employerMonthlyMealVoucherCost()).isCloseTo(95f, offset(0.01f));
    }

    @Test
    void mealVoucherCosts_avecRepartitionAsymetrique() {
        // 9.5€, salarié 60% → salarié = 9.5 × 0.6 × 19 = 108.3 / employeur = 9.5 × 0.4 × 19 = 72.2
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 9.5f, 60f));

        assertThat(dto.employeeMonthlyMealVoucherCost()).isCloseTo(108.3f, offset(0.1f));
        assertThat(dto.employerMonthlyMealVoucherCost()).isCloseTo(72.2f, offset(0.1f));
    }

    @Test
    void mealVoucherCosts_sontZero_siAucunTicket() {
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.employeeMonthlyMealVoucherCost()).isZero();
        assertThat(dto.employerMonthlyMealVoucherCost()).isZero();
    }

    // ── isCadre et prévoyance ──────────────────────────────────

    @Test
    void isCadreEtPrevoyance_sontRestituesDansLeDto() {
        SalaryContract contract = SalaryContract.builder()
                .id(1L).user(userSansProfil)
                .startDate(LocalDate.of(2023, 1, 1)).endDate(null)
                .annualGrossSalary(50000f).paidMonthsPerYear(12)
                .weeklyHours(35f).mealVoucherAmount(0f).mealVoucherEmployeeRate(0f)
                .isCadre(true).employeePrevoyanceRate(0.015f)
                .build();

        SalaryContractDto dto = SalaryContractDto.from(contract, taxParams, userSansProfil, taxSimulatorService, 0f);

        assertThat(dto.isCadre()).isTrue();
        assertThat(dto.employeePrevoyanceRate()).isEqualTo(0.015f);
        // Net imposable avec prévoyance 1,5% doit être inférieur à celui sans
        assertThat(dto.annualNetImposable()).isLessThan(41039.01f);
    }

    // ── Net d'impôt ────────────────────────────────────────────

    @Test
    void annualNetAfterTax_estNul_siProfilFiscalIncomplet() {
        SalaryContractDto dto = from(buildContract(45000f, 12, 35f, 0f, 0f));

        assertThat(dto.annualNetAfterTax()).isNull();
        assertThat(dto.monthlyNetAfterTax()).isNull();
        assertThat(dto.dailyNetAfterTax()).isNull();
        assertThat(dto.hourlyNetAfterTax()).isNull();
    }

    @Test
    void annualNetAfterTax_estCalcule_siImpotEstime() {
        // Simulateur retourne un impôt estimé de 3000€
        when(taxSimulatorService.estimerImpotSurSalaire(anyFloat(), any())).thenReturn(3000f);

        // 45 000 brut → net imposable ≈ 36 904€, avantages 1200€/an
        // annualNetAfterTax = 36904 - 3000 + 1200 = 35104
        SalaryContractDto dto = SalaryContractDto.from(
                buildContract(45000f, 12, 35f, 0f, 0f),
                taxParams, userSansProfil, taxSimulatorService, 1200f);

        assertThat(dto.annualNetAfterTax()).isCloseTo(36904.05f - 3000f + 1200f, offset(1f));
        assertThat(dto.monthlyNetAfterTax()).isCloseTo(dto.annualNetAfterTax() / 12f, offset(0.1f));
        assertThat(dto.dailyNetAfterTax()).isCloseTo(dto.annualNetAfterTax() / 228f, offset(0.1f));
        assertThat(dto.hourlyNetAfterTax()).isCloseTo(dto.annualNetAfterTax() / 1596f, offset(0.1f));
    }
}
