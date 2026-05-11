package com.myfinance.service;

import com.myfinance.config.TaxParameters;
import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.TaxSimulationDto;
import com.myfinance.domain.BonusTypeEnum;
import com.myfinance.repository.ContractBonusRepository;
import com.myfinance.repository.ContractOnCallRepository;
import com.myfinance.repository.MonthlyPaySlipRepository;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.SalaryContractRepository;
import com.myfinance.repository.SalaryRevisionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaxSimulatorService {

    private final TaxParameters taxParameters;
    private final SalaryContractRepository salaryContractRepository;
    private final SalaryRevisionRepository salaryRevisionRepository;
    private final MonthlyPaySlipRepository monthlyPaySlipRepository;
    private final OtherIncomeRepository otherIncomeRepository;
    private final ContractOnCallRepository contractOnCallRepository;
    private final ContractBonusRepository  contractBonusRepository;

    public static final String SOURCE_PROJECTION = "PROJECTION_CONTRAT";
    public static final String SOURCE_BULLETINS   = "BULLETINS_REELS";

    /**
     * Lance la simulation d'impôt pour un utilisateur.
     *
     * @param user            Utilisateur cible
     * @param year            Année fiscale à simuler
     * @param salarySource    SOURCE_PROJECTION ou SOURCE_BULLETINS
     * @param includedIds     IDs des OtherIncome à inclure (null ou liste vide = aucun revenu complémentaire)
     */
    public TaxSimulationDto simulate(User user, int year, String salarySource, List<Long> includedIds) {

        // ── Étape 1 : Revenus salariaux ────────────────────────
        float salaryIncome;
        String sourceLabel;

        if (SOURCE_BULLETINS.equals(salarySource)) {
            salaryIncome = salaryIncomeFromPaySlips(user, year);
            sourceLabel  = SOURCE_BULLETINS;
        } else {
            salaryIncome = salaryIncomeFromContract(user, year);
            sourceLabel  = SOURCE_PROJECTION;
        }

        // ── Étape 2 : Revenus complémentaires ──────────────────
        LocalDate startOfYear = LocalDate.of(year, 1, 1);
        LocalDate endOfYear   = LocalDate.of(year, 12, 31);

        // Revenus ponctuels dans l'année
        List<OtherIncome> oneTimeIncomes = otherIncomeRepository
                .findByUserAndPeriodStartIsNullAndDateBetween(user, startOfYear, endOfYear);

        // Contrats de location chevauchant l'année
        List<OtherIncome> contracts = otherIncomeRepository
                .findContractsByUserOverlappingPeriod(user, startOfYear, endOfYear);

        List<OtherIncome> allIncomes = new ArrayList<>(oneTimeIncomes);
        allIncomes.addAll(contracts);

        List<OtherIncome> selected = filtrerRevenus(allIncomes, includedIds);

        // Pour les contrats, le montant fiscal = loyer mensuel × nombre de mois dans l'année
        float otherIncomeInBareme = 0f;
        float otherIncomeSeparatelyTaxed = 0f;
        float separateTaxAmount = 0f;

        for (OtherIncome income : selected) {
            float annualAmount = income.getPeriodStart() != null
                    ? income.getAmount() * monthsInYear(income.getPeriodStart(), income.getPeriodEnd(), startOfYear, endOfYear)
                    : income.getAmount();

            if (income.getSpecificTaxRate() == null) {
                otherIncomeInBareme += annualAmount;
            } else {
                otherIncomeSeparatelyTaxed += annualAmount;
                separateTaxAmount += annualAmount * income.getSpecificTaxRate() / 100.0f;
            }
        }

        // ── Étape 3 : Abattement professionnel ─────────────────
        TaxParameters.FlatRateDeduction flatRate = taxParameters.getFlatRateDeduction();
        boolean useFlatRate = user.getUseFlatRateDeduction() == null || user.getUseFlatRateDeduction();

        float deduction;
        String deductionType;

        if (useFlatRate) {
            float computed = salaryIncome * flatRate.getRate();
            deduction     = Math.min(Math.max(computed, flatRate.getMin()), flatRate.getMax());
            deductionType = "FORFAITAIRE_10_POURCENT";
        } else {
            deduction     = user.getCustomProfessionalDeduction() != null ? user.getCustomProfessionalDeduction() : 0f;
            deductionType = "FRAIS_REELS";
        }

        // ── Étape 4 : Revenu net imposable au barème ───────────
        float grossTaxableIncome = salaryIncome + otherIncomeInBareme + otherIncomeSeparatelyTaxed;
        float netTaxableIncome   = (salaryIncome - deduction) + otherIncomeInBareme;
        if (netTaxableIncome < 0) netTaxableIncome = 0f;

        // ── Étape 5 : Quotient familial ────────────────────────
        float parts = user.getFiscalParts() != null && user.getFiscalParts() > 0
                ? user.getFiscalParts()
                : 1.0f;

        // ── Étape 6 : Impôt barème ─────────────────────────────
        float incomePerPart = netTaxableIncome / parts;
        float taxOnOnePart  = calculerImpotSurUnePart(incomePerPart);
        float baremeEstimatedTax = taxOnOnePart * parts;

        // ── Étape 7 bis : Décote ───────────────────────────────
        boolean jointTaxation = user.isJointTaxation();
        float decoteAmount    = applyDecote(baremeEstimatedTax, jointTaxation);
        float taxAfterDecote  = Math.max(0f, baremeEstimatedTax - decoteAmount);

        // ── Étape 8 : Impôt total et taux effectif ─────────────
        float totalEstimatedTax = taxAfterDecote + separateTaxAmount;
        float effectiveTaxRate  = grossTaxableIncome > 0
                ? (totalEstimatedTax / grossTaxableIncome) * 100f
                : 0f;

        log.info("[user:{}] Simulation fiscale {} - source: {}, parts: {}, joint: {}, décote: {}",
                user.getId(), year, sourceLabel, parts, jointTaxation, decoteAmount);
        return new TaxSimulationDto(
                year,
                sourceLabel,
                salaryIncome,
                otherIncomeInBareme,
                otherIncomeSeparatelyTaxed,
                separateTaxAmount,
                grossTaxableIncome,
                deduction,
                deductionType,
                netTaxableIncome,
                parts,
                jointTaxation,
                baremeEstimatedTax,
                decoteAmount,
                taxAfterDecote,
                totalEstimatedTax,
                Math.round(effectiveTaxRate * 100f) / 100f // arrondi 2 décimales
        );
    }

    /**
     * Calcule la décote IRPP applicable (art. 197 I-4 CGI).
     * Retourne 0 si non éligible ou si la config decote est désactivée (rate = 0).
     */
    float applyDecote(float baremeTax, boolean jointTaxation) {
        TaxParameters.Decote d = taxParameters.getDecote();
        if (d == null || d.getRate() <= 0) return 0f;

        float threshold = jointTaxation ? d.getCoupleThreshold() : d.getSingleThreshold();
        float cap       = jointTaxation ? d.getCoupleCap()       : d.getSingleCap();

        if (baremeTax >= threshold) return 0f;

        float decote = cap - baremeTax * d.getRate();
        if (decote < 0)             return 0f;
        if (decote > baremeTax)     return baremeTax; // jamais > impôt
        return decote;
    }

    // ── Revenus salariaux via bulletins réels ──────────────────

    private float salaryIncomeFromPaySlips(User user, int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end   = LocalDate.of(year, 12, 31);
        List<MonthlyPaySlip> paySlips = monthlyPaySlipRepository.findByContractUserAndPeriodBetween(user, start, end);

        if (paySlips.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Aucun bulletin de paie saisi pour l'année " + year + ". Utilisez la projection du contrat.");
        }

        return (float) paySlips.stream()
                .mapToDouble(s -> s.getTaxableNetSalary() != null ? s.getTaxableNetSalary() : 0.0)
                .sum();
    }

    // ── Revenus salariaux via projection du contrat ────────────

    private float salaryIncomeFromContract(User user, int year) {
        // Date de référence : 31/12 de l'année simulée, ou aujourd'hui si c'est l'année courante
        LocalDate referenceDate = LocalDate.of(year, 12, 31).isBefore(LocalDate.now())
                ? LocalDate.of(year, 12, 31)
                : LocalDate.now();

        SalaryContract contract = salaryContractRepository.findContractsActiveAtDate(user, referenceDate)
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Aucun contrat salarial trouvé pour l'année " + year + ". Saisissez un contrat ou utilisez les bulletins réels."));

        if (contract.getAnnualGrossSalary() == null) return 0f;

        // Révision salariale active à la date de référence (brut ETP)
        float effectiveSalary = salaryRevisionRepository
                .findFirstByContractAndEffectiveDateLessThanEqualOrderByEffectiveDateDesc(contract, referenceDate)
                .map(com.myfinance.domain.SalaryRevision::getAnnualGrossSalary)
                .orElse(contract.getAnnualGrossSalary());

        // Application de la quotité de travail (ETP → brut réellement perçu)
        float partTimeRatio = contract.getPartTimePercentage() != null ? contract.getPartTimePercentage() / 100f : 1f;
        effectiveSalary = effectiveSalary * partTimeRatio;

        boolean isCadre = Boolean.TRUE.equals(contract.getIsCadre());
        float salaryNetImposable = NetImposableCalculator.calculer(
                effectiveSalary, isCadre, contract.getEmployeePrevoyanceRate(), taxParameters);

        float onCallNetImposable = (float) contractOnCallRepository.findByContractOrderByIdAsc(contract)
                .stream()
                .mapToDouble(oc -> oc.getWeeklyFlatRate() * oc.getEstimatedWeeksPerYear() * 0.75)
                .sum();

        // Primes MENSUELLE actives à la date de référence (net imposable ≈ 75 % du brut annualisé)
        float bonusMensuelleNetImposable = (float) contractBonusRepository
                .findByContractOrderByTypeAscPaymentMonthAscPaymentDateDescStartDateAsc(contract)
                .stream()
                .filter(b -> b.getType() == BonusTypeEnum.MENSUELLE)
                .filter(b -> b.getStartDate() != null && !b.getStartDate().isAfter(referenceDate))
                .filter(b -> b.getEndDate() == null || !b.getEndDate().isBefore(referenceDate))
                .mapToDouble(b -> b.getGrossAmount() != null ? b.getGrossAmount() * 12 * 0.75 : 0.0)
                .sum();

        return salaryNetImposable + onCallNetImposable + bonusMensuelleNetImposable;
    }

    // ── Calcul du nombre de mois d'un contrat dans une année ──

    /**
     * Retourne le nombre de mois du contrat qui tombent dans [yearStart, yearEnd].
     * Ex : contrat du 01/09/2024 au 31/08/2025, année 2024 → 4 mois (sep-déc).
     */
    private int monthsInYear(LocalDate periodStart, LocalDate periodEnd,
                              LocalDate yearStart, LocalDate yearEnd) {
        LocalDate effectiveStart = periodStart.isBefore(yearStart) ? yearStart : periodStart;
        LocalDate effectiveEnd   = (periodEnd == null || periodEnd.isAfter(yearEnd)) ? yearEnd : periodEnd;

        if (effectiveStart.isAfter(effectiveEnd)) return 0;

        // Nombre de mois entre les deux premiers jours de mois (inclusif)
        long months = ChronoUnit.MONTHS.between(
                effectiveStart.withDayOfMonth(1),
                effectiveEnd.withDayOfMonth(1)
        ) + 1;

        return (int) Math.max(0, months);
    }

    // ── Filtrage des revenus complémentaires ───────────────────

    private List<OtherIncome> filtrerRevenus(List<OtherIncome> all, List<Long> includedIds) {
        // null ou liste vide = aucun revenu complémentaire inclus
        if (includedIds == null || includedIds.isEmpty()) {
            return List.of();
        }
        return all.stream()
                .filter(i -> {
                    boolean taxable = i.getIsTaxable() == null || i.getIsTaxable();
                    return taxable && includedIds.contains(i.getId());
                })
                .toList();
    }

    // ── Estimation de l'impôt sur le seul salaire d'un contrat ─

    /**
     * Estime l'impôt annuel applicable au seul salaire d'un contrat,
     * sans revenus complémentaires.
     *
     * Utilisé par SalaryContractService pour calculer le "net d'impôt" des projections.
     *
     * @param netImposable  Salaire net imposable annuel (brut − cotisations déductibles)
     * @param user          Propriétaire du contrat (profil fiscal : parts, abattement)
     * @return              Impôt estimé en €, ou null si le profil fiscal est incomplet
     */
    public Float estimerImpotSurSalaire(float netImposable, User user) {
        if (user.getFiscalParts() == null || user.getFiscalParts() <= 0f) return null;
        if (taxParameters.getBrackets() == null || taxParameters.getBrackets().isEmpty()) return null;

        TaxParameters.FlatRateDeduction flatRate = taxParameters.getFlatRateDeduction();
        boolean useFlatRate = user.getUseFlatRateDeduction() == null || user.getUseFlatRateDeduction();

        float abattement;
        if (useFlatRate) {
            float computed = netImposable * flatRate.getRate();
            abattement = Math.min(Math.max(computed, flatRate.getMin()), flatRate.getMax());
        } else {
            abattement = user.getCustomProfessionalDeduction() != null
                    ? user.getCustomProfessionalDeduction()
                    : 0f;
        }

        float revenuNetImposable = Math.max(0f, netImposable - abattement);
        float parts = user.getFiscalParts();
        float impotSurUnePart = calculerImpotSurUnePart(revenuNetImposable / parts);
        float impotBareme     = impotSurUnePart * parts;

        // Application de la décote (art. 197 I-4 CGI)
        float decote = applyDecote(impotBareme, user.isJointTaxation());
        return Math.max(0f, impotBareme - decote);
    }

    // ── Calcul de l'impôt sur une part (barème progressif) ─────

    private float calculerImpotSurUnePart(float revenuParPart) {
        float impot = 0f;
        for (TaxParameters.TaxBracket tranche : taxParameters.getBrackets()) {
            if (revenuParPart <= tranche.getFrom()) break;
            float borneSup = tranche.getTo() != null
                    ? Math.min(revenuParPart, tranche.getTo())
                    : revenuParPart;
            impot += (borneSup - tranche.getFrom()) * tranche.getRate();
        }
        return impot;
    }
}
