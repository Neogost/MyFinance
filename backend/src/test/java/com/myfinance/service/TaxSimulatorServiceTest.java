package com.myfinance.service;

import com.myfinance.config.TaxParameters;
import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.OtherIncomeTypeEnum;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.TaxSimulationDto;
import com.myfinance.repository.MonthlyPaySlipRepository;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.SalaryContractRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaxSimulatorServiceTest {

    @Mock TaxParameters taxParameters;
    @Mock SalaryContractRepository salaryContractRepository;
    @Mock MonthlyPaySlipRepository monthlyPaySlipRepository;
    @Mock OtherIncomeRepository otherIncomeRepository;
    @InjectMocks TaxSimulatorService taxSimulatorService;

    User user;
    TaxParameters.FlatRateDeduction flatRate;
    List<TaxParameters.TaxBracket> brackets;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .login("jean.dupont")
                .role(RoleEnum.USER)
                .fiscalParts(1.0f)
                .useFlatRateDeduction(true)
                .build();

        // Barème simplifié pour les tests : 0% jusqu'à 10 000, 10% au-delà
        TaxParameters.TaxBracket tranche0 = new TaxParameters.TaxBracket();
        tranche0.setFrom(0f);
        tranche0.setTo(10000f);
        tranche0.setRate(0f);

        TaxParameters.TaxBracket tranche10 = new TaxParameters.TaxBracket();
        tranche10.setFrom(10000f);
        tranche10.setTo(null);
        tranche10.setRate(0.10f);

        brackets = List.of(tranche0, tranche10);

        flatRate = new TaxParameters.FlatRateDeduction();
        flatRate.setRate(0.10f);
        flatRate.setMin(504f);
        flatRate.setMax(13522f);

        // lenient : certains tests lèvent une exception avant d'atteindre le calcul fiscal
        Mockito.lenient().when(taxParameters.getBrackets()).thenReturn(brackets);
        Mockito.lenient().when(taxParameters.getFlatRateDeduction()).thenReturn(flatRate);
    }

    // ── Source : projection du contrat ────────────────────────

    @Test
    void simulate_avecContrat_calculeLImpotCorrectement() {
        SalaryContract contract = SalaryContract.builder()
                .annualGrossSalary(40000f)
                .build();

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        // salaire net = 40000 * 0.75 = 30000
        // abattement 10% = 3000 (dans min/max)
        // revenu net imposable = 27000
        // impôt sur une part : 0% sur [0-10000] + 10% sur [10000-27000] = 1700
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.year()).isEqualTo(2025);
        assertThat(result.salaryIncomeSource()).isEqualTo(TaxSimulatorService.SOURCE_PROJECTION);
        assertThat(result.salaryIncome()).isEqualTo(30000f);
        assertThat(result.deductionType()).isEqualTo("FORFAITAIRE_10_POURCENT");
        assertThat(result.professionalDeduction()).isEqualTo(3000f);
        assertThat(result.netTaxableIncome()).isEqualTo(27000f);
        assertThat(result.baremeEstimatedTax()).isEqualTo(1700f);
        assertThat(result.totalEstimatedTax()).isEqualTo(1700f);
    }

    @Test
    void simulate_avecContrat_leve400_siAucunContratActif() {
        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // ── Source : bulletins réels ───────────────────────────────

    @Test
    void simulate_avecBulletins_utiliseLeNetImposableReel() {
        MonthlyPaySlip slip1 = MonthlyPaySlip.builder().taxableNetSalary(2000f).build();
        MonthlyPaySlip slip2 = MonthlyPaySlip.builder().taxableNetSalary(2000f).build();

        when(monthlyPaySlipRepository.findByContractUserAndPeriodBetween(eq(user), any(), any()))
                .thenReturn(List.of(slip1, slip2));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_BULLETINS, null);

        assertThat(result.salaryIncomeSource()).isEqualTo(TaxSimulatorService.SOURCE_BULLETINS);
        assertThat(result.salaryIncome()).isEqualTo(4000f); // 2000 + 2000
    }

    @Test
    void simulate_avecBulletins_leve400_siAucunBulletin() {
        when(monthlyPaySlipRepository.findByContractUserAndPeriodBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        assertThatThrownBy(() ->
                taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_BULLETINS, null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // ── Revenus complémentaires ────────────────────────────────

    @Test
    void simulate_inclutRevenusImposablesAuBareme() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).build();

        OtherIncome locatif = OtherIncome.builder()
                .id(1L).type(OtherIncomeTypeEnum.LOCATIF)
                .amount(5000f).isTaxable(true)
                .build();

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of(locatif));

        // salaire = 0, abattement = 504 (min), mais netTaxable >= 0
        // otherIncomeInBareme = 5000
        // netTaxableIncome = (0 - 504) + 5000 → max(0, -504 + 5000) = 4496
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, List.of(1L));

        assertThat(result.otherIncomeInBareme()).isEqualTo(5000f);
        assertThat(result.otherIncomeSeparatelyTaxed()).isEqualTo(0f);
        assertThat(result.netTaxableIncome()).isEqualTo(4496f);
    }

    @Test
    void simulate_calculeImpotSeparePourRevenuAuxTauxSpecifique() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).build();

        OtherIncome dividende = OtherIncome.builder()
                .id(2L).type(OtherIncomeTypeEnum.DIVIDENDE)
                .amount(10000f).isTaxable(true).specificTaxRate(12.8f)
                .build();

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of(dividende));

        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, List.of(2L));

        assertThat(result.otherIncomeSeparatelyTaxed()).isEqualTo(10000f);
        assertThat(result.separateTaxAmount()).isCloseTo(1280f, org.assertj.core.data.Offset.offset(0.01f));
    }

    @Test
    void simulate_exclutRevenusNonImposables() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).build();

        OtherIncome nonImposable = OtherIncome.builder()
                .id(3L).type(OtherIncomeTypeEnum.AIDE_SOCIALE)
                .amount(2000f).isTaxable(false)
                .build();

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of(nonImposable));

        // Passer l'ID du revenu non imposable : il doit quand même être exclu
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, List.of(3L));

        assertThat(result.otherIncomeInBareme()).isEqualTo(0f);
        assertThat(result.grossTaxableIncome()).isEqualTo(0f);
        assertThat(result.totalEstimatedTax()).isEqualTo(0f);
    }

    @Test
    void simulate_filtreSurLesIdsInclus() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).build();

        OtherIncome income1 = OtherIncome.builder().id(1L).type(OtherIncomeTypeEnum.LOCATIF)
                .amount(3000f).isTaxable(true).build();
        OtherIncome income2 = OtherIncome.builder().id(2L).type(OtherIncomeTypeEnum.DIVIDENDE)
                .amount(5000f).isTaxable(true).build();

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of(income1, income2));

        // Inclure uniquement income1
        TaxSimulationDto result = taxSimulatorService.simulate(
                user, 2025, TaxSimulatorService.SOURCE_PROJECTION, List.of(1L));

        assertThat(result.otherIncomeInBareme()).isEqualTo(3000f);
    }

    // ── Abattement forfaitaire ─────────────────────────────────

    @Test
    void simulate_appliqueLeMinimumDAbattement() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(1000f).build();
        // net = 750, abattement 10% = 75 < min 504 → abattement = 504

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.professionalDeduction()).isEqualTo(504f);
        assertThat(result.netTaxableIncome()).isEqualTo(246f); // max(0, 750 - 504) = 246
    }

    @Test
    void simulate_avecFraisReels_utiliseLeDeductionPersonnalisee() {
        user = User.builder().id(1L).login("jean.dupont").role(RoleEnum.USER)
                .fiscalParts(1.0f)
                .useFlatRateDeduction(false)
                .customProfessionalDeduction(8000f)
                .build();

        SalaryContract contract = SalaryContract.builder().annualGrossSalary(40000f).build();

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        // salaire net = 30000, déduction = 8000 (frais réels)
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.deductionType()).isEqualTo("FRAIS_REELS");
        assertThat(result.professionalDeduction()).isEqualTo(8000f);
        assertThat(result.netTaxableIncome()).isEqualTo(22000f);
    }

    // ── Quotient familial ──────────────────────────────────────

    @Test
    void simulate_avecDeuxParts_diviseLeRevenuParParts() {
        user = User.builder().id(1L).login("jean.dupont").role(RoleEnum.USER)
                .fiscalParts(2.0f)
                .useFlatRateDeduction(true)
                .build();

        SalaryContract contract = SalaryContract.builder().annualGrossSalary(40000f).build();

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        // net = 30000, abattement = 3000, netTaxable = 27000
        // par part = 13500 → impôt par part = 0% sur [0-10000] + 10% sur [10000-13500] = 350
        // impôt total barème = 350 * 2 = 700
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.fiscalParts()).isEqualTo(2.0f);
        assertThat(result.baremeEstimatedTax()).isEqualTo(700f);
    }

    // ── Taux effectif ──────────────────────────────────────────

    @Test
    void simulate_calculeLeTauxEffectif() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(40000f).build();

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        // grossTaxable = 30000, totalTax = 1700 → taux = 1700/30000 * 100 = 5.67%
        assertThat(result.effectiveTaxRate()).isCloseTo(5.67f, org.assertj.core.data.Offset.offset(0.01f));
    }

    @Test
    void simulate_tauxEffectifZero_siAucunRevenu() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).build();

        when(salaryContractRepository.findByUserAndEndDateIsNull(user))
                .thenReturn(Optional.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.effectiveTaxRate()).isEqualTo(0f);
        assertThat(result.totalEstimatedTax()).isEqualTo(0f);
    }
}
