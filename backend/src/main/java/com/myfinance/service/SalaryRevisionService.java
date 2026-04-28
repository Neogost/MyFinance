package com.myfinance.service;

import com.myfinance.domain.ContractTypeEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.SalaryRevision;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateSalaryRevisionRequest;
import com.myfinance.dto.SalaryRevisionDto;
import com.myfinance.dto.UpdateSalaryRevisionRequest;
import com.myfinance.repository.SalaryRevisionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalaryRevisionService {

    private final SalaryRevisionRepository salaryRevisionRepository;
    private final SalaryContractService    salaryContractService;
    private final PointValueService        pointValueService;

    // ── Lecture ────────────────────────────────────────────────

    public List<SalaryRevisionDto> findAllByContract(Long contractId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        return salaryRevisionRepository.findByContractOrderByEffectiveDateDesc(contract)
                .stream()
                .map(SalaryRevisionDto::from)
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public SalaryRevisionDto create(Long contractId, CreateSalaryRevisionRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);

        // effectiveDate >= contrat.startDate
        if (request.effectiveDate().isBefore(contract.getStartDate())) {
            log.warn("[user:{}] Révision refusée - date {} antérieure au début du contrat #{} ({})",
                    currentUser.getId(), request.effectiveDate(), contractId, contract.getStartDate());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La date de révision ne peut pas être antérieure au début du contrat : " + contract.getStartDate());
        }

        // Unicité (contract, effectiveDate)
        if (salaryRevisionRepository.existsByContractAndEffectiveDate(contract, request.effectiveDate())) {
            log.warn("[user:{}] Révision refusée - date {} déjà existante sur contrat #{}",
                    currentUser.getId(), request.effectiveDate(), contractId);
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Une révision existe déjà pour la date : " + request.effectiveDate());
        }

        float annualGross = resolveAnnualGross(contract, request.indiceMajore(),
                request.annualGrossSalary(), request.effectiveDate());

        SalaryRevision revision = SalaryRevision.builder()
                .contract(contract)
                .effectiveDate(request.effectiveDate())
                .annualGrossSalary(annualGross)
                .indiceMajore(request.indiceMajore())
                .label(request.label())
                .build();

        SalaryRevisionDto dto = SalaryRevisionDto.from(salaryRevisionRepository.save(revision));
        log.info("[user:{}] Révision salariale créée #{} [contrat #{}]", currentUser.getId(), dto.id(), contractId);
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public SalaryRevisionDto update(Long contractId, Long revisionId,
                                    UpdateSalaryRevisionRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        SalaryRevision revision = getRevisionForContract(revisionId, contract);

        // effectiveDate >= contrat.startDate
        if (request.effectiveDate().isBefore(contract.getStartDate())) {
            log.warn("[user:{}] Modification révision #{} refusée - date {} antérieure au début du contrat #{}",
                    currentUser.getId(), revisionId, request.effectiveDate(), contractId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La date de révision ne peut pas être antérieure au début du contrat : " + contract.getStartDate());
        }

        // Unicité — on exclut la révision courante
        if (!revision.getEffectiveDate().equals(request.effectiveDate())
                && salaryRevisionRepository.existsByContractAndEffectiveDate(contract, request.effectiveDate())) {
            log.warn("[user:{}] Modification révision #{} refusée - date {} déjà existante sur contrat #{}",
                    currentUser.getId(), revisionId, request.effectiveDate(), contractId);
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Une révision existe déjà pour la date : " + request.effectiveDate());
        }

        float annualGross = resolveAnnualGross(contract, request.indiceMajore(),
                request.annualGrossSalary(), request.effectiveDate());

        revision.setEffectiveDate(request.effectiveDate());
        revision.setAnnualGrossSalary(annualGross);
        revision.setIndiceMajore(request.indiceMajore());
        revision.setLabel(request.label());

        SalaryRevisionDto dto = SalaryRevisionDto.from(salaryRevisionRepository.save(revision));
        log.info("[user:{}] Révision salariale modifiée #{} [contrat #{}]", currentUser.getId(), revisionId, contractId);
        return dto;
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long contractId, Long revisionId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        getRevisionForContract(revisionId, contract);
        salaryRevisionRepository.deleteById(revisionId);
        log.info("[user:{}] Révision salariale supprimée #{} [contrat #{}]", currentUser.getId(), revisionId, contractId);
    }

    // ── Helpers ────────────────────────────────────────────────

    /**
     * Pour PUBLIC + indiceMajore fourni : calcule le brut via PointValueService.
     * Pour PRIVATE (ou PUBLIC contractuel sans indice) : utilise annualGrossSalary directement.
     */
    private float resolveAnnualGross(SalaryContract contract, Integer indiceMajore,
                                     Float annualGrossSalary, java.time.LocalDate referenceDate) {
        if (ContractTypeEnum.PUBLIC == contract.getContractType() && indiceMajore != null) {
            return pointValueService.computeAnnualGross(indiceMajore, referenceDate);
        }
        if (annualGrossSalary == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Le salaire brut annuel est requis pour un contrat privé.");
        }
        return annualGrossSalary;
    }

    // ── Vérification appartenance ─────────────────────────────

    private SalaryRevision getRevisionForContract(Long revisionId, SalaryContract contract) {
        SalaryRevision revision = salaryRevisionRepository.findById(revisionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Révision introuvable : " + revisionId));

        if (!revision.getContract().getId().equals(contract.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Révision introuvable pour ce contrat");
        }
        return revision;
    }
}
