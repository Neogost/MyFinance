package com.myfinance.service;

import com.myfinance.config.TaxParameters;
import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.TaxSimulationDto;
import com.myfinance.repository.MonthlyPaySlipRepository;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.SalaryContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaxSimulatorService {

    private final TaxParameters taxParameters;
    private final SalaryContractRepository salaryContractRepository;
    private final MonthlyPaySlipRepository monthlyPaySlipRepository;
    private final OtherIncomeRepository otherIncomeRepository;

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
            salaryIncome = salaryIncomeFromContract(user);
            sourceLabel  = SOURCE_PROJECTION;
        }

        // ── Étape 2 : Revenus complémentaires ──────────────────
        LocalDate startOfYear = LocalDate.of(year, 1, 1);
        LocalDate endOfYear   = LocalDate.of(year, 12, 31);
        List<OtherIncome> allIncomes = otherIncomeRepository.findByUserAndDateBetween(user, startOfYear, endOfYear);

        List<OtherIncome> selected = filtrerRevenus(allIncomes, includedIds);

        float otherIncomeInBareme = (float) selected.stream()
                .filter(i -> i.getSpecificTaxRate() == null)
                .mapToDouble(OtherIncome::getAmount)
                .sum();

        float otherIncomeSeparatelyTaxed = (float) selected.stream()
                .filter(i -> i.getSpecificTaxRate() != null)
                .mapToDouble(OtherIncome::getAmount)
                .sum();

        float separateTaxAmount = (float) selected.stream()
                .filter(i -> i.getSpecificTaxRate() != null)
                .mapToDouble(i -> i.getAmount() * i.getSpecificTaxRate() / 100.0)
                .sum();

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

        // ── Étape 7 : Impôt total et taux effectif ─────────────
        float totalEstimatedTax = baremeEstimatedTax + separateTaxAmount;
        float effectiveTaxRate  = grossTaxableIncome > 0
                ? (totalEstimatedTax / grossTaxableIncome) * 100f
                : 0f;

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
                baremeEstimatedTax,
                totalEstimatedTax,
                Math.round(effectiveTaxRate * 100f) / 100f // arrondi 2 décimales
        );
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

    private float salaryIncomeFromContract(User user) {
        SalaryContract contract = salaryContractRepository.findByUserAndEndDateIsNull(user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Aucun contrat salarial actif. Saisissez un contrat ou utilisez les bulletins réels."));

        return contract.getAnnualGrossSalary() != null
                ? contract.getAnnualGrossSalary() * 0.75f
                : 0f;
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
