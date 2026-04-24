package com.myfinance.service;

import com.myfinance.domain.BonusTypeEnum;
import com.myfinance.domain.ContractBonus;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.ContractBonusDto;
import com.myfinance.dto.CreateContractBonusRequest;
import com.myfinance.dto.UpdateContractBonusRequest;
import com.myfinance.repository.ContractBonusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContractBonusService {

    private final ContractBonusRepository contractBonusRepository;
    private final SalaryContractService salaryContractService;

    // ── Lecture ────────────────────────────────────────────────

    public List<ContractBonusDto> findAllByContract(Long contractId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        return contractBonusRepository.findByContractOrderByTypeAscPaymentMonthAscPaymentDateDesc(contract)
                .stream()
                .map(ContractBonusDto::from)
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public ContractBonusDto create(Long contractId, CreateContractBonusRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        validateRequest(request.type(), request.paymentDate(), request.paymentMonth());

        ContractBonus bonus = ContractBonus.builder()
                .contract(contract)
                .label(request.label())
                .grossAmount(request.grossAmount())
                .type(request.type())
                .paymentDate(request.type() == BonusTypeEnum.EXCEPTIONNELLE ? request.paymentDate() : null)
                .paymentMonth(request.type() == BonusTypeEnum.ANNUELLE ? request.paymentMonth() : null)
                .build();

        ContractBonusDto dto = ContractBonusDto.from(contractBonusRepository.save(bonus));
        log.info("[user:{}] Prime créée #{} [contrat #{}, type: {}]", currentUser.getId(), dto.id(), contractId, request.type());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public ContractBonusDto update(Long contractId, Long bonusId,
                                   UpdateContractBonusRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        ContractBonus bonus = getBonusForContract(bonusId, contract);
        validateRequest(request.type(), request.paymentDate(), request.paymentMonth());

        bonus.setLabel(request.label());
        bonus.setGrossAmount(request.grossAmount());
        bonus.setType(request.type());
        bonus.setPaymentDate(request.type() == BonusTypeEnum.EXCEPTIONNELLE ? request.paymentDate() : null);
        bonus.setPaymentMonth(request.type() == BonusTypeEnum.ANNUELLE ? request.paymentMonth() : null);

        ContractBonusDto dto = ContractBonusDto.from(contractBonusRepository.save(bonus));
        log.info("[user:{}] Prime modifiée #{} [contrat #{}, type: {}]", currentUser.getId(), bonusId, contractId, request.type());
        return dto;
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long contractId, Long bonusId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        getBonusForContract(bonusId, contract);
        contractBonusRepository.deleteById(bonusId);
        log.info("[user:{}] Prime supprimée #{} [contrat #{}]", currentUser.getId(), bonusId, contractId);
    }

    // ── Validation ────────────────────────────────────────────

    private void validateRequest(BonusTypeEnum type, java.time.LocalDate paymentDate, Integer paymentMonth) {
        if (type == BonusTypeEnum.EXCEPTIONNELLE && paymentDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Une prime exceptionnelle doit avoir une date de versement.");
        }
        if (type == BonusTypeEnum.ANNUELLE && paymentMonth == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Une prime annuelle doit préciser le mois de versement.");
        }
    }

    // ── Vérification appartenance prime ───────────────────────

    private ContractBonus getBonusForContract(Long bonusId, SalaryContract contract) {
        ContractBonus bonus = contractBonusRepository.findById(bonusId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Prime introuvable : " + bonusId));

        if (!bonus.getContract().getId().equals(contract.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Prime introuvable pour ce contrat");
        }
        return bonus;
    }
}
