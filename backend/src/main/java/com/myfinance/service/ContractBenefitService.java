package com.myfinance.service;

import com.myfinance.domain.ContractBenefit;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.ContractBenefitDto;
import com.myfinance.dto.CreateContractBenefitRequest;
import com.myfinance.dto.UpdateContractBenefitRequest;
import com.myfinance.repository.ContractBenefitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContractBenefitService {

    private final ContractBenefitRepository contractBenefitRepository;
    private final SalaryContractService salaryContractService;

    // ── Lecture ────────────────────────────────────────────────

    public List<ContractBenefitDto> findAllByContract(Long contractId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        return contractBenefitRepository.findByContractOrderByLabelAsc(contract)
                .stream()
                .map(ContractBenefitDto::from)
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public ContractBenefitDto create(Long contractId, CreateContractBenefitRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);

        ContractBenefit benefit = ContractBenefit.builder()
                .contract(contract)
                .label(request.label())
                .monthlyAmount(request.monthlyAmount())
                .build();

        ContractBenefitDto dto = ContractBenefitDto.from(contractBenefitRepository.save(benefit));
        log.info("[user:{}] Avantage en nature créé #{} [contrat #{}]", currentUser.getId(), dto.id(), contractId);
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public ContractBenefitDto update(Long contractId, Long benefitId,
                                     UpdateContractBenefitRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        ContractBenefit benefit = getBenefitForContract(benefitId, contract);

        benefit.setLabel(request.label());
        benefit.setMonthlyAmount(request.monthlyAmount());

        ContractBenefitDto dto = ContractBenefitDto.from(contractBenefitRepository.save(benefit));
        log.info("[user:{}] Avantage en nature modifié #{} [contrat #{}]", currentUser.getId(), benefitId, contractId);
        return dto;
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long contractId, Long benefitId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        getBenefitForContract(benefitId, contract);
        contractBenefitRepository.deleteById(benefitId);
        log.info("[user:{}] Avantage en nature supprimé #{} [contrat #{}]", currentUser.getId(), benefitId, contractId);
    }

    // ── Vérification appartenance avantage ────────────────────

    private ContractBenefit getBenefitForContract(Long benefitId, SalaryContract contract) {
        ContractBenefit benefit = contractBenefitRepository.findById(benefitId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Avantage introuvable : " + benefitId));

        if (!benefit.getContract().getId().equals(contract.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Avantage introuvable pour ce contrat");
        }
        return benefit;
    }
}
