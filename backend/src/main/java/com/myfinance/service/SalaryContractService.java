package com.myfinance.service;

import com.myfinance.config.TaxParameters;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.SalaryRevision;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateSalaryContractRequest;
import com.myfinance.dto.SalaryContractDto;
import com.myfinance.dto.UpdateSalaryContractRequest;
import com.myfinance.repository.ContractBenefitRepository;
import com.myfinance.repository.SalaryContractRepository;
import com.myfinance.repository.SalaryRevisionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalaryContractService {

    private final SalaryContractRepository salaryContractRepository;
    private final ContractBenefitRepository contractBenefitRepository;
    private final SalaryRevisionRepository salaryRevisionRepository;
    private final TaxParameters taxParameters;
    private final TaxSimulatorService taxSimulatorService;

    // ── Lecture ────────────────────────────────────────────────

    public List<SalaryContractDto> findAllByUser(User user) {
        return salaryContractRepository.findByUserOrderByStartDateDesc(user)
                .stream()
                .map(c -> toDto(c, user))
                .toList();
    }

    public SalaryContractDto findById(Long id, User currentUser) {
        SalaryContract contract = getContractWithOwnershipCheck(id, currentUser);
        // On utilise le propriétaire réel du contrat pour le calcul fiscal
        return toDto(contract, contract.getUser());
    }

    // ── Création ───────────────────────────────────────────────

    public SalaryContractDto create(CreateSalaryContractRequest request, User user) {
        // Un seul contrat actif (endDate = null) par utilisateur
        if (request.endDate() == null
                && salaryContractRepository.existsByUserAndEndDateIsNull(user)) {
            log.warn("[user:{}] Création contrat refusée - contrat actif existant pour cet utilisateur", user.getId());
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un contrat actif existe déjà. Clôturez-le avant d'en créer un nouveau.");
        }

        SalaryContract contract = SalaryContract.builder()
                .user(user)
                .companyName(request.companyName())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .annualGrossSalary(request.annualGrossSalary())
                .paidMonthsPerYear(request.paidMonthsPerYear())
                .weeklyHours(request.weeklyHours())
                .mealVoucherAmount(request.mealVoucherAmount())
                .mealVoucherEmployeeRate(request.mealVoucherEmployeeRate())
                .isCadre(request.isCadre())
                .employeePrevoyanceRate(request.employeePrevoyanceRate())
                .build();

        SalaryContractDto dto = toDto(salaryContractRepository.save(contract), user);
        log.info("[user:{}] Contrat salarial créé #{} [{}]", user.getId(), dto.id(), request.companyName());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public SalaryContractDto update(Long id, UpdateSalaryContractRequest request, User currentUser) {
        SalaryContract contract = getContractWithOwnershipCheck(id, currentUser);

        // Si on rend ce contrat actif, vérifie qu'aucun autre ne l'est déjà
        if (request.endDate() == null && contract.getEndDate() != null) {
            if (salaryContractRepository.existsByUserAndEndDateIsNull(contract.getUser())) {
                log.warn("[user:{}] Réactivation contrat #{} refusée - contrat actif existant", currentUser.getId(), id);
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Un contrat actif existe déjà. Clôturez-le avant de réactiver celui-ci.");
            }
        }

        contract.setCompanyName(request.companyName());
        contract.setStartDate(request.startDate());
        contract.setEndDate(request.endDate());
        contract.setAnnualGrossSalary(request.annualGrossSalary());
        contract.setPaidMonthsPerYear(request.paidMonthsPerYear());
        contract.setWeeklyHours(request.weeklyHours());
        contract.setMealVoucherAmount(request.mealVoucherAmount());
        contract.setMealVoucherEmployeeRate(request.mealVoucherEmployeeRate());
        contract.setIsCadre(request.isCadre());
        contract.setEmployeePrevoyanceRate(request.employeePrevoyanceRate());

        SalaryContractDto dto = toDto(salaryContractRepository.save(contract), contract.getUser());
        log.info("[user:{}] Contrat salarial modifié #{} [{}]", currentUser.getId(), id, request.companyName());
        return dto;
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id, User currentUser) {
        getContractWithOwnershipCheck(id, currentUser);
        salaryContractRepository.deleteById(id);
        log.info("[user:{}] Contrat salarial supprimé #{}", currentUser.getId(), id);
    }

    // ── Accès interne (utilisé par MonthlyPaySlipService) ─────

    public SalaryContract getContractWithOwnershipCheck(Long id, User currentUser) {
        SalaryContract contract = salaryContractRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Contrat introuvable : " + id));

        boolean isOwner = contract.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès non autorisé à ce contrat");
        }
        return contract;
    }

    // ── Construction du DTO avec projections ───────────────────

    private SalaryContractDto toDto(SalaryContract contract, User contractOwner) {
        float annualBenefits = (float) contractBenefitRepository
                .findByContractOrderByLabelAsc(contract)
                .stream()
                .mapToDouble(b -> b.getMonthlyAmount() != null ? b.getMonthlyAmount() : 0.0)
                .sum() * 12f;

        // Révision active : la plus récente dont effectiveDate <= aujourd'hui
        Optional<SalaryRevision> activeRevision = salaryRevisionRepository
                .findFirstByContractAndEffectiveDateLessThanEqualOrderByEffectiveDateDesc(
                        contract, LocalDate.now());

        Long activeRevisionId     = activeRevision.map(SalaryRevision::getId).orElse(null);
        float effectiveSalary     = activeRevision
                .map(SalaryRevision::getAnnualGrossSalary)
                .orElse(contract.getAnnualGrossSalary());

        log.debug("[user:{}] Projection contrat #{} - salaire effectif: {} €, révision active: {}",
                contractOwner.getId(), contract.getId(), effectiveSalary, activeRevisionId);
        return SalaryContractDto.from(contract, taxParameters, contractOwner, taxSimulatorService,
                annualBenefits, activeRevisionId, effectiveSalary);
    }
}
