package com.myfinance.service;

import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.SalaryRevision;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateSalaryRevisionRequest;
import com.myfinance.dto.SalaryRevisionDto;
import com.myfinance.dto.UpdateSalaryRevisionRequest;
import com.myfinance.repository.SalaryRevisionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SalaryRevisionService {

    private final SalaryRevisionRepository salaryRevisionRepository;
    private final SalaryContractService salaryContractService;

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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La date de révision ne peut pas être antérieure au début du contrat : " + contract.getStartDate());
        }

        // Unicité (contract, effectiveDate)
        if (salaryRevisionRepository.existsByContractAndEffectiveDate(contract, request.effectiveDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Une révision existe déjà pour la date : " + request.effectiveDate());
        }

        SalaryRevision revision = SalaryRevision.builder()
                .contract(contract)
                .effectiveDate(request.effectiveDate())
                .annualGrossSalary(request.annualGrossSalary())
                .label(request.label())
                .build();

        return SalaryRevisionDto.from(salaryRevisionRepository.save(revision));
    }

    // ── Modification ───────────────────────────────────────────

    public SalaryRevisionDto update(Long contractId, Long revisionId,
                                    UpdateSalaryRevisionRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        SalaryRevision revision = getRevisionForContract(revisionId, contract);

        // effectiveDate >= contrat.startDate
        if (request.effectiveDate().isBefore(contract.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La date de révision ne peut pas être antérieure au début du contrat : " + contract.getStartDate());
        }

        // Unicité — on exclut la révision courante
        if (!revision.getEffectiveDate().equals(request.effectiveDate())
                && salaryRevisionRepository.existsByContractAndEffectiveDate(contract, request.effectiveDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Une révision existe déjà pour la date : " + request.effectiveDate());
        }

        revision.setEffectiveDate(request.effectiveDate());
        revision.setAnnualGrossSalary(request.annualGrossSalary());
        revision.setLabel(request.label());

        return SalaryRevisionDto.from(salaryRevisionRepository.save(revision));
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long contractId, Long revisionId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        getRevisionForContract(revisionId, contract);
        salaryRevisionRepository.deleteById(revisionId);
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
