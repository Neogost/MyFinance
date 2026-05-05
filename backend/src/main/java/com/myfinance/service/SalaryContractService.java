package com.myfinance.service;

import com.myfinance.config.PublicSectorParameters;
import com.myfinance.config.TaxParameters;
import com.myfinance.domain.*;
import com.myfinance.dto.CreateSalaryContractRequest;
import com.myfinance.dto.SalaryContractDto;
import com.myfinance.dto.UpdateSalaryContractRequest;
import com.myfinance.domain.BonusTypeEnum;
import com.myfinance.repository.ContractBenefitRepository;
import com.myfinance.repository.ContractBonusRepository;
import com.myfinance.repository.SalaryContractRepository;
import com.myfinance.repository.SalaryRevisionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalaryContractService {

    private final SalaryContractRepository    salaryContractRepository;
    private final ContractBenefitRepository   contractBenefitRepository;
    private final ContractBonusRepository     contractBonusRepository;
    private final SalaryRevisionRepository    salaryRevisionRepository;
    private final TaxParameters               taxParameters;
    private final PublicSectorParameters      publicSectorParameters;
    private final PointValueService           pointValueService;
    private final TaxSimulatorService         taxSimulatorService;

    // ── Lecture ────────────────────────────────────────────────

    public List<SalaryContractDto> findAllByUser(User user) {
        return salaryContractRepository.findByUserOrderByStartDateDesc(user)
                .stream()
                .map(c -> toDto(c, user))
                .toList();
    }

    public SalaryContractDto findById(Long id, User currentUser) {
        SalaryContract contract = getContractWithOwnershipCheck(id, currentUser);
        return toDto(contract, contract.getUser());
    }

    // ── Création ───────────────────────────────────────────────

    public SalaryContractDto create(CreateSalaryContractRequest request, User user) {
        validateRequest(request);

        if (request.endDate() == null
                && salaryContractRepository.existsByUserAndEndDateIsNull(user)) {
            log.warn("[user:{}] Création contrat refusée - contrat actif existant", user.getId());
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un contrat actif existe déjà. Clôturez-le avant d'en créer un nouveau.");
        }

        ContractTypeEnum type = request.contractType() != null
                ? request.contractType() : ContractTypeEnum.PRIVATE;

        Float annualGross = resolveAnnualGross(request.isPublic(), request.indiceMajore(),
                request.annualGrossSalary(), request.startDate());

        SalaryContract contract = SalaryContract.builder()
                .user(user)
                .contractType(type)
                .publicSubType(request.publicSubType())
                .indiceMajore(request.indiceMajore())
                .companyName(request.companyName())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .annualGrossSalary(annualGross)
                .paidMonthsPerYear(request.isPublic() ? 12 : request.paidMonthsPerYear())
                .weeklyHours(request.weeklyHours())
                .mealVoucherAmount(request.mealVoucherAmount())
                .mealVoucherEmployeeRate(request.mealVoucherEmployeeRate())
                .isCadre(request.isPublic() ? false : request.isCadre())
                .employeePrevoyanceRate(request.employeePrevoyanceRate())
                .partTimePercentage(request.partTimePercentage() != null ? request.partTimePercentage() : 100f)
                .build();

        SalaryContractDto dto = toDto(salaryContractRepository.save(contract), user);
        log.info("[user:{}] Contrat {} créé #{} [{}]", user.getId(), type, dto.id(), request.companyName());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public SalaryContractDto update(Long id, UpdateSalaryContractRequest request, User currentUser) {
        SalaryContract contract = getContractWithOwnershipCheck(id, currentUser);

        if (request.endDate() == null && contract.getEndDate() != null) {
            if (salaryContractRepository.existsByUserAndEndDateIsNull(contract.getUser())) {
                log.warn("[user:{}] Réactivation contrat #{} refusée - contrat actif existant", currentUser.getId(), id);
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Un contrat actif existe déjà. Clôturez-le avant de réactiver celui-ci.");
            }
        }

        boolean isPublic = contract.getContractType() == ContractTypeEnum.PUBLIC;

        Float annualGross = resolveAnnualGross(isPublic,
                isPublic ? request.indiceMajore() : null,
                request.annualGrossSalary(),
                request.startDate());

        contract.setCompanyName(request.companyName());
        contract.setStartDate(request.startDate());
        contract.setEndDate(request.endDate());
        contract.setAnnualGrossSalary(annualGross);
        if (isPublic && request.indiceMajore() != null) {
            contract.setIndiceMajore(request.indiceMajore());
            contract.setPublicSubType(request.publicSubType());
        }
        if (!isPublic) {
            contract.setPaidMonthsPerYear(request.paidMonthsPerYear());
            contract.setIsCadre(request.isCadre());
        }
        contract.setWeeklyHours(request.weeklyHours());
        contract.setMealVoucherAmount(request.mealVoucherAmount());
        contract.setMealVoucherEmployeeRate(request.mealVoucherEmployeeRate());
        contract.setEmployeePrevoyanceRate(request.employeePrevoyanceRate());
        contract.setPartTimePercentage(request.partTimePercentage() != null ? request.partTimePercentage() : 100f);

        SalaryContractDto dto = toDto(salaryContractRepository.save(contract), contract.getUser());
        log.info("[user:{}] Contrat salarial modifié #{}", currentUser.getId(), id);
        return dto;
    }

    // ── Suppression ────────────────────────────────────────────

    @Transactional
    public void delete(Long id, User currentUser) {
        SalaryContract contract = getContractWithOwnershipCheck(id, currentUser);
        salaryRevisionRepository.deleteByContract(contract);
        salaryContractRepository.delete(contract);
        log.info("[user:{}] Contrat salarial supprimé #{}", currentUser.getId(), id);
    }

    // ── Accès interne ──────────────────────────────────────────

    public SalaryContract getContractWithOwnershipCheck(Long id, User currentUser) {
        SalaryContract contract = salaryContractRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Contrat introuvable : " + id));

        boolean isOwner = contract.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès non autorisé à ce contrat");
        }
        return contract;
    }

    // ── Helpers privés ─────────────────────────────────────────

    private void validateRequest(CreateSalaryContractRequest request) {
        if (request.isPublic()) {
            if (request.indiceMajore() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "L'indice majoré est requis pour un contrat fonction publique.");
            }
            if (request.publicSubType() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Le sous-type (TITULAIRE / CONTRACTUEL) est requis pour un contrat fonction publique.");
            }
        } else {
            if (request.annualGrossSalary() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Le salaire brut annuel est requis pour un contrat privé.");
            }
        }
    }

    /**
     * Résout le salaire brut annuel effectif selon le type de contrat.
     * PUBLIC : calculé depuis indiceMajore × valeur du point.
     * PRIVATE : transmis directement depuis le formulaire.
     */
    private Float resolveAnnualGross(boolean isPublic, Integer indiceMajore,
                                     Float annualGrossSalary, LocalDate referenceDate) {
        if (isPublic && indiceMajore != null) {
            return pointValueService.computeAnnualGross(indiceMajore, referenceDate);
        }
        return annualGrossSalary;
    }

    // ── Construction du DTO avec projections ───────────────────

    private SalaryContractDto toDto(SalaryContract contract, User contractOwner) {
        float annualBenefits = (float) contractBenefitRepository
                .findByContractOrderByLabelAsc(contract)
                .stream()
                .mapToDouble(b -> b.getMonthlyAmount() != null ? b.getMonthlyAmount() : 0.0)
                .sum() * 12f;

        LocalDate today = LocalDate.now();
        float monthlyActiveMensuelleGross = (float) contractBonusRepository
                .findByContractOrderByTypeAscPaymentMonthAscPaymentDateDescStartDateAsc(contract)
                .stream()
                .filter(b -> b.getType() == BonusTypeEnum.MENSUELLE)
                .filter(b -> b.getStartDate() != null && !b.getStartDate().isAfter(today))
                .filter(b -> b.getEndDate() == null || !b.getEndDate().isBefore(today))
                .mapToDouble(b -> b.getGrossAmount() != null ? b.getGrossAmount() : 0.0)
                .sum();

        Optional<SalaryRevision> activeRevision = salaryRevisionRepository
                .findFirstByContractAndEffectiveDateLessThanEqualOrderByEffectiveDateDesc(
                        contract, LocalDate.now());

        Long  activeRevisionId = activeRevision.map(SalaryRevision::getId).orElse(null);
        float effectiveSalary;
        Float pointValueUsed = null;

        ContractTypeEnum type = contract.getContractType() != null
                ? contract.getContractType() : ContractTypeEnum.PRIVATE;

        // Indice effectif : révision active en priorité, sinon indice de base du contrat
        Integer effectiveIndiceMajore = activeRevision
                .map(SalaryRevision::getIndiceMajore)
                .orElse(contract.getIndiceMajore());

        if (type == ContractTypeEnum.PUBLIC && effectiveIndiceMajore != null) {
            // Pour PUBLIC : recalcul du brut depuis l'indice effectif × valeur du point à la date de la révision
            LocalDate refDate = activeRevision
                    .map(SalaryRevision::getEffectiveDate)
                    .orElse(contract.getStartDate());
            double pv = pointValueService.getAnnualValueAt(refDate);
            pointValueUsed   = (float) pv;
            effectiveSalary  = (float) (effectiveIndiceMajore * pv);
        } else {
            effectiveSalary = activeRevision
                    .map(SalaryRevision::getAnnualGrossSalary)
                    .orElse(contract.getAnnualGrossSalary() != null ? contract.getAnnualGrossSalary() : 0f);
        }

        // Application de la quotité de travail (ETP → brut réellement perçu)
        float partTime = contract.getPartTimePercentage() != null ? contract.getPartTimePercentage() : 100f;
        effectiveSalary = effectiveSalary * partTime / 100f;

        log.debug("[user:{}] Projection contrat #{} ({}) — brut effectif: {} € (quotité: {}%)",
                contractOwner.getId(), contract.getId(), type, effectiveSalary, partTime);

        return SalaryContractDto.from(contract, taxParameters, publicSectorParameters,
                contractOwner, taxSimulatorService, annualBenefits,
                activeRevisionId, effectiveSalary, pointValueUsed,
                monthlyActiveMensuelleGross);
    }
}
