package com.myfinance.service;

import com.myfinance.domain.BonusTypeEnum;
import com.myfinance.domain.ContractBonus;
import com.myfinance.domain.ContractTypeEnum;
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

import java.time.LocalDate;
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
        return contractBonusRepository.findByContractOrderByTypeAscPaymentMonthAscPaymentDateDescStartDateAsc(contract)
                .stream()
                .map(ContractBonusDto::from)
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public ContractBonusDto create(Long contractId, CreateContractBonusRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        validateRequest(request.type(), request.paymentDate(), request.paymentMonth(), request.startDate(), request.endDate());
        validateGrossAmountForContractType(request.grossAmount(), contract);

        ContractBonus bonus = ContractBonus.builder()
                .contract(contract)
                .label(request.label())
                .grossAmount(request.grossAmount())
                .type(request.type())
                .paymentDate(request.type() == BonusTypeEnum.EXCEPTIONNELLE ? request.paymentDate() : null)
                .paymentMonth(request.type() == BonusTypeEnum.ANNUELLE ? request.paymentMonth() : null)
                .startDate(request.type() == BonusTypeEnum.MENSUELLE ? request.startDate() : null)
                .endDate(request.type() == BonusTypeEnum.MENSUELLE ? request.endDate() : null)
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
        validateRequest(request.type(), request.paymentDate(), request.paymentMonth(), request.startDate(), request.endDate());
        validateGrossAmountForContractType(request.grossAmount(), contract);

        bonus.setLabel(request.label());
        bonus.setGrossAmount(request.grossAmount());
        bonus.setType(request.type());
        bonus.setPaymentDate(request.type() == BonusTypeEnum.EXCEPTIONNELLE ? request.paymentDate() : null);
        bonus.setPaymentMonth(request.type() == BonusTypeEnum.ANNUELLE ? request.paymentMonth() : null);
        bonus.setStartDate(request.type() == BonusTypeEnum.MENSUELLE ? request.startDate() : null);
        bonus.setEndDate(request.type() == BonusTypeEnum.MENSUELLE ? request.endDate() : null);

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

    // ── Validation ─────────────────────────────────────────────

    private void validateRequest(BonusTypeEnum type, LocalDate paymentDate,
                                  Integer paymentMonth, LocalDate startDate, LocalDate endDate) {
        if (type == BonusTypeEnum.EXCEPTIONNELLE && paymentDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Une prime exceptionnelle doit avoir une date de versement.");
        }
        if (type == BonusTypeEnum.ANNUELLE && paymentMonth == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Une prime annuelle doit préciser le mois de versement.");
        }
        if (type == BonusTypeEnum.MENSUELLE && startDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Une prime mensuelle doit avoir une date de début.");
        }
        if (type == BonusTypeEnum.MENSUELLE && endDate != null && startDate != null && endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La date de fin doit être postérieure à la date de début.");
        }
    }

    /**
     * Les montants de prime peuvent être négatifs uniquement pour les contrats PUBLIC
     * (utilisé pour saisir des retenues type IFSE/CIA). Pour les contrats PRIVATE on impose
     * un montant strictement positif (comme avant).
     */
    private void validateGrossAmountForContractType(Float grossAmount, SalaryContract contract) {
        ContractTypeEnum type = contract.getContractType() != null
                ? contract.getContractType() : ContractTypeEnum.PRIVATE;
        if (type != ContractTypeEnum.PUBLIC && grossAmount != null && grossAmount <= 0f) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le montant doit être strictement positif pour un contrat privé.");
        }
        if (grossAmount != null && grossAmount == 0f) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le montant ne peut pas être nul.");
        }
    }

    // ── Vérification appartenance prime ────────────────────────

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
