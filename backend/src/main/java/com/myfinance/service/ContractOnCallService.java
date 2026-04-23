package com.myfinance.service;

import com.myfinance.domain.ContractOnCall;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.ContractOnCallDto;
import com.myfinance.dto.CreateContractOnCallRequest;
import com.myfinance.dto.UpdateContractOnCallRequest;
import com.myfinance.repository.ContractOnCallRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContractOnCallService {

    private final ContractOnCallRepository contractOnCallRepository;
    private final SalaryContractService salaryContractService;

    // ── Lecture ────────────────────────────────────────────────

    public List<ContractOnCallDto> findAllByContract(Long contractId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        return contractOnCallRepository.findByContractOrderByIdAsc(contract)
                .stream()
                .map(ContractOnCallDto::from)
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public ContractOnCallDto create(Long contractId, CreateContractOnCallRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);

        ContractOnCall onCall = ContractOnCall.builder()
                .contract(contract)
                .weeklyFlatRate(request.weeklyFlatRate())
                .estimatedWeeksPerYear(request.estimatedWeeksPerYear())
                .build();

        return ContractOnCallDto.from(contractOnCallRepository.save(onCall));
    }

    // ── Modification ───────────────────────────────────────────

    public ContractOnCallDto update(Long contractId, Long onCallId,
                                    UpdateContractOnCallRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        ContractOnCall onCall = getOnCallForContract(onCallId, contract);

        onCall.setWeeklyFlatRate(request.weeklyFlatRate());
        onCall.setEstimatedWeeksPerYear(request.estimatedWeeksPerYear());

        return ContractOnCallDto.from(contractOnCallRepository.save(onCall));
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long contractId, Long onCallId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        getOnCallForContract(onCallId, contract);
        contractOnCallRepository.deleteById(onCallId);
    }

    // ── Vérification appartenance astreinte ───────────────────

    private ContractOnCall getOnCallForContract(Long onCallId, SalaryContract contract) {
        ContractOnCall onCall = contractOnCallRepository.findById(onCallId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Astreinte introuvable : " + onCallId));

        if (!onCall.getContract().getId().equals(contract.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Astreinte introuvable pour ce contrat");
        }
        return onCall;
    }
}
