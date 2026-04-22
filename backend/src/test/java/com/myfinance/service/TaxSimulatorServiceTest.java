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
    @Mock SalaryRevisionRepository salaryRevisionRepository;
    @Mock MonthlyPaySlipRepository monthlyPaySlipRepository;
    @Mock OtherIncomeRepository otherIncomeRepository;
    @InjectMocks TaxSimulatorService taxSimulatorService;

    User user;
    TaxParameters.FlatRateDeduction flatRate;
    TaxParameters.EmployeeContributions employeeContributions;
    List<TaxParameters.TaxBracket> brackets;

    /*
     * Valeurs de référence pour les tests de simulation (barème simplifié) :
     *   40 000 € brut, non-cadre, sans prévoyance :
     *     → net imposable ≈ 32 803,60 €
     *     → abattement 10% = 3 280,36 €
     *     → net taxable  = 29 523,24 €
     *     → impôt (barème simplifié 0%/10%) = 1 952,32 €
     *     → taux effectif ≈ 5,95 %
     */

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
        tranche0.setFrom(0f); tranche0.setTo(10000f); tranche0.setRate(0f);

        TaxParameters.TaxBracket tranche10 = new TaxParameters.TaxBracket();
        tranche10.setFrom(10000f); tranche10.setTo(null); tranche10.setRate(0.10f);

        brackets = List.of(tranche0, tranche10);

        flatRate = new TaxParameters.FlatRateDeduction();
        flatRate.setRate(0.10f); flatRate.setMin(504f); flatRate.setMax(13522f);

        employeeContributions = new TaxParameters.EmployeeContributions();
        employeeContributions.setCsgBaseRate(0.9825f);
        employeeContributions.setCsgDeductibleRate(0.0680f);
        employeeContributions.setVieillessePlafonneRate(0.0690f);
        employeeContributions.setVieillesseDePlafonneeRate(0.0040f);
        employeeContributions.setAgircArrcoT1Rate(0.0315f);
        employeeContributions.setCegT1Rate(0.0086f);
        employeeContributions.setAgircArrcoT2Rate(0.0864f);
        employeeContributions.setCegT2Rate(0.0108f);
        employeeContributions.setApecRate(0.00024f);

        // lenient : certains tests lèvent avant d'atteindre le calcul fiscal
        Mockito.lenient().when(taxParameters.getBrackets()).thenReturn(brackets);
        Mockito.lenient().when(taxParameters.getFlatRateDeduction()).thenReturn(flatRate);
        Mockito.lenient().when(taxParameters.getPass()).thenReturn(47100f);
        Mockito.lenient().when(taxParameters.getEmployeeContributions()).thenReturn(employeeContributions);
        // Aucune révision salariale par défaut → salaire du contrat utilisé
        Mockito.lenient().when(salaryRevisionRepository
                .findFirstByContractAndEffectiveDateLessThanEqualOrderByEffectiveDateDesc(any(), any()))
                .thenReturn(Optional.empty());
    }

    // ── Source : projection du contrat ────────────────────────

    @Test
    void simulate_avecContrat_calculeLImpotCorrectement() {
        SalaryContract contract = SalaryContract.builder()
                .annualGrossSalary(40000f).isCadre(false).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        // net imposable 40 000 non-cadre ≈ 32 803,60
        // abattement 10% = 3 280,36  →  net taxable ≈ 29 523,24
        // impôt (barème simplifié) = (29 523,24 − 10 000) × 10% ≈ 1 952,32
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.year()).isEqualTo(2025);
        assertThat(result.salaryIncomeSource()).isEqualTo(TaxSimulatorService.SOURCE_PROJECTION);
        assertThat(result.salaryIncome()).isCloseTo(32803.6f, org.assertj.core.data.Offset.offset(1f));
        assertThat(result.deductionType()).isEqualTo("FORFAITAIRE_10_POURCENT");
        assertThat(result.professionalDeduction()).isCloseTo(3280.36f, org.assertj.core.data.Offset.offset(1f));
        assertThat(result.netTaxableIncome()).isCloseTo(29523.24f, org.assertj.core.data.Offset.offset(1f));
        assertThat(result.baremeEstimatedTax()).isCloseTo(1952.32f, org.assertj.core.data.Offset.offset(1f));
        assertThat(result.totalEstimatedTax()).isCloseTo(1952.32f, org.assertj.core.data.Offset.offset(1f));
    }

    @Test
    void simulate_avecContrat_leve400_siAucunContratActif() {
        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of());

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
        assertThat(result.salaryIncome()).isEqualTo(4000f);
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
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).isCadre(false).build();

        OtherIncome locatif = OtherIncome.builder()
                .id(1L).type(OtherIncomeTypeEnum.LOCATIF)
                .amount(5000f).isTaxable(true).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of(locatif));

        // salaire = 0, abattement min = 504 → netTaxable = max(0, 0-504+5000) = 4496
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, List.of(1L));

        assertThat(result.otherIncomeInBareme()).isEqualTo(5000f);
        assertThat(result.otherIncomeSeparatelyTaxed()).isEqualTo(0f);
        assertThat(result.netTaxableIncome()).isEqualTo(4496f);
    }

    @Test
    void simulate_calculeImpotSeparePourRevenuAuxTauxSpecifique() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).isCadre(false).build();

        OtherIncome dividende = OtherIncome.builder()
                .id(2L).type(OtherIncomeTypeEnum.DIVIDENDE)
                .amount(10000f).isTaxable(true).specificTaxRate(12.8f).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of(dividende));

        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, List.of(2L));

        assertThat(result.otherIncomeSeparatelyTaxed()).isEqualTo(10000f);
        assertThat(result.separateTaxAmount()).isCloseTo(1280f, org.assertj.core.data.Offset.offset(0.01f));
    }

    @Test
    void simulate_exclutRevenusNonImposables() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).isCadre(false).build();

        OtherIncome nonImposable = OtherIncome.builder()
                .id(3L).type(OtherIncomeTypeEnum.AIDE_SOCIALE)
                .amount(2000f).isTaxable(false).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
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
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).isCadre(false).build();

        OtherIncome income1 = OtherIncome.builder().id(1L).type(OtherIncomeTypeEnum.LOCATIF)
                .amount(3000f).isTaxable(true).build();
        OtherIncome income2 = OtherIncome.builder().id(2L).type(OtherIncomeTypeEnum.DIVIDENDE)
                .amount(5000f).isTaxable(true).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of(income1, income2));

        TaxSimulationDto result = taxSimulatorService.simulate(
                user, 2025, TaxSimulatorService.SOURCE_PROJECTION, List.of(1L));

        assertThat(result.otherIncomeInBareme()).isEqualTo(3000f);
    }

    // ── Abattement forfaitaire ─────────────────────────────────

    @Test
    void simulate_appliqueLeMinimumDAbattement() {
        // brut = 1 000 → net imposable ≈ 820,09 → abattement 10% = 82 < min 504 → 504
        // netTaxable = max(0, 820,09 - 504) = 316,09
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(1000f).isCadre(false).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.professionalDeduction()).isEqualTo(504f);
        assertThat(result.netTaxableIncome()).isCloseTo(316.09f, org.assertj.core.data.Offset.offset(1f));
    }

    @Test
    void simulate_avecFraisReels_utiliseLeDeductionPersonnalisee() {
        user = User.builder().id(1L).login("jean.dupont").role(RoleEnum.USER)
                .fiscalParts(1.0f)
                .useFlatRateDeduction(false)
                .customProfessionalDeduction(8000f)
                .build();

        SalaryContract contract = SalaryContract.builder().annualGrossSalary(40000f).isCadre(false).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        // net imposable ≈ 32 803,60 − 8 000 = 24 803,60
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.deductionType()).isEqualTo("FRAIS_REELS");
        assertThat(result.professionalDeduction()).isEqualTo(8000f);
        assertThat(result.netTaxableIncome()).isCloseTo(24803.6f, org.assertj.core.data.Offset.offset(1f));
    }

    // ── Quotient familial ──────────────────────────────────────

    @Test
    void simulate_avecDeuxParts_diviseLeRevenuParParts() {
        user = User.builder().id(1L).login("jean.dupont").role(RoleEnum.USER)
                .fiscalParts(2.0f)
                .useFlatRateDeduction(true)
                .build();

        SalaryContract contract = SalaryContract.builder().annualGrossSalary(40000f).isCadre(false).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        // net imposable ≈ 32 803,60 → abattement ≈ 3 280,36 → netTaxable ≈ 29 523,24
        // par part = 14 761,62 → impôt/part = (14 761,62 − 10 000) × 10% = 476,16
        // impôt total = 476,16 × 2 = 952,32
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.fiscalParts()).isEqualTo(2.0f);
        assertThat(result.baremeEstimatedTax()).isCloseTo(952.32f, org.assertj.core.data.Offset.offset(1f));
    }

    // ── Taux effectif ──────────────────────────────────────────

    @Test
    void simulate_calculeLeTauxEffectif() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(40000f).isCadre(false).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        // grossTaxable ≈ 32 803,60, totalTax ≈ 1 952,32 → taux ≈ 5,95 %
        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.effectiveTaxRate()).isCloseTo(5.95f, org.assertj.core.data.Offset.offset(0.1f));
    }

    @Test
    void simulate_tauxEffectifZero_siAucunRevenu() {
        SalaryContract contract = SalaryContract.builder().annualGrossSalary(0f).isCadre(false).build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        assertThat(result.effectiveTaxRate()).isEqualTo(0f);
        assertThat(result.totalEstimatedTax()).isEqualTo(0f);
    }

    // ── estimerImpotSurSalaire ─────────────────────────────────

    @Test
    void estimerImpotSurSalaire_retourneNul_siProfilFiscalIncomplet() {
        User sansParts = User.builder().id(2L).role(RoleEnum.USER).build(); // fiscalParts = null

        assertThat(taxSimulatorService.estimerImpotSurSalaire(32803f, sansParts)).isNull();
    }

    @Test
    void estimerImpotSurSalaire_calculeLImpotCorrectement() {
        // net imposable ≈ 32 803,60, abattement 10% ≈ 3 280,36, netTaxable ≈ 29 523,24
        // impôt (barème simplifié) = (29 523,24 − 10 000) × 10% ≈ 1 952,32
        Float impot = taxSimulatorService.estimerImpotSurSalaire(32803.6f, user);

        assertThat(impot).isNotNull();
        assertThat(impot).isCloseTo(1952.32f, org.assertj.core.data.Offset.offset(1f));
    }

    @Test
    void estimerImpotSurSalaire_avecFraisReels() {
        User avecFraisReels = User.builder().id(3L).role(RoleEnum.USER)
                .fiscalParts(1.0f)
                .useFlatRateDeduction(false)
                .customProfessionalDeduction(8000f)
                .build();

        // net imposable ≈ 32 803,60 − 8 000 = 24 803,60
        // impôt = (24 803,60 − 10 000) × 10% ≈ 1 480,36
        Float impot = taxSimulatorService.estimerImpotSurSalaire(32803.6f, avecFraisReels);

        assertThat(impot).isNotNull();
        assertThat(impot).isCloseTo(1480.36f, org.assertj.core.data.Offset.offset(1f));
    }

    @Test
    void estimerImpotSurSalaire_avecDeuxParts() {
        User deuxParts = User.builder().id(4L).role(RoleEnum.USER)
                .fiscalParts(2.0f)
                .useFlatRateDeduction(true)
                .build();

        // net imposable ≈ 32 803,60 → abattement ≈ 3 280,36 → netTaxable ≈ 29 523,24
        // par part = 14 761,62 → impôt/part = (14 761,62 − 10 000) × 10% = 476,16
        // impôt total = 476,16 × 2 = 952,32
        Float impot = taxSimulatorService.estimerImpotSurSalaire(32803.6f, deuxParts);

        assertThat(impot).isNotNull();
        assertThat(impot).isCloseTo(952.32f, org.assertj.core.data.Offset.offset(1f));
    }

    // ── Révision salariale active ──────────────────────────────

    @Test
    void simulate_avecRevisionActive_utiliseLesSalaireRevise() {
        SalaryContract contract = SalaryContract.builder()
                .annualGrossSalary(40000f).isCadre(false).build();
        com.myfinance.domain.SalaryRevision revision = com.myfinance.domain.SalaryRevision.builder()
                .id(1L).contract(contract)
                .effectiveDate(java.time.LocalDate.of(2025, 1, 1))
                .annualGrossSalary(48000f).label("Augmentation 2025")
                .build();

        when(salaryContractRepository.findContractsActiveAtDate(eq(user), any()))
                .thenReturn(List.of(contract));
        when(salaryRevisionRepository.findFirstByContractAndEffectiveDateLessThanEqualOrderByEffectiveDateDesc(
                eq(contract), any()))
                .thenReturn(Optional.of(revision));
        when(otherIncomeRepository.findByUserAndDateBetween(eq(user), any(), any()))
                .thenReturn(List.of());

        TaxSimulationDto result = taxSimulatorService.simulate(user, 2025, TaxSimulatorService.SOURCE_PROJECTION, null);

        // net imposable 48 000 non-cadre ≈ 39 375,03 (supérieur à celui de 40 000)
        assertThat(result.salaryIncome()).isGreaterThan(35000f);
        assertThat(result.salaryIncome()).isCloseTo(39375f, org.assertj.core.data.Offset.offset(10f));
    }
}
