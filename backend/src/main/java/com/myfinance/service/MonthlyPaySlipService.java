package com.myfinance.service;

import com.myfinance.domain.MonthlyPaySlip;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateMonthlyPaySlipRequest;
import com.myfinance.dto.MonthlyPaySlipDto;
import com.myfinance.dto.UpdateMonthlyPaySlipRequest;
import com.myfinance.repository.MonthlyPaySlipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MonthlyPaySlipService {

    private final MonthlyPaySlipRepository monthlyPaySlipRepository;
    private final SalaryContractService salaryContractService;

    // ── Lecture ────────────────────────────────────────────────

    public List<MonthlyPaySlipDto> findAllByContract(Long contractId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        return monthlyPaySlipRepository.findByContractOrderByPeriodDesc(contract)
                .stream()
                .map(MonthlyPaySlipDto::from)
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public MonthlyPaySlipDto create(Long contractId, CreateMonthlyPaySlipRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);

        if (monthlyPaySlipRepository.existsByContractAndPeriod(contract, request.period())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un bulletin existe déjà pour la période : " + request.period());
        }

        MonthlyPaySlip slip = MonthlyPaySlip.builder()
                .contract(contract)
                .period(request.period())
                .grossSalary(request.grossSalary())
                .taxableNetSalary(request.taxableNetSalary())
                .netSalary(request.netSalary())
                .incomeTaxWithholding(request.incomeTaxWithholding())
                .build();

        return MonthlyPaySlipDto.from(monthlyPaySlipRepository.save(slip));
    }

    // ── Modification ───────────────────────────────────────────

    public MonthlyPaySlipDto update(Long contractId, Long slipId,
                                    UpdateMonthlyPaySlipRequest request, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        MonthlyPaySlip slip = getSlipForContract(slipId, contract);

        // Si la période change, vérifie qu'elle n'est pas déjà prise
        if (!slip.getPeriod().equals(request.period())
                && monthlyPaySlipRepository.existsByContractAndPeriod(contract, request.period())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un bulletin existe déjà pour la période : " + request.period());
        }

        slip.setPeriod(request.period());
        slip.setGrossSalary(request.grossSalary());
        slip.setTaxableNetSalary(request.taxableNetSalary());
        slip.setNetSalary(request.netSalary());
        slip.setIncomeTaxWithholding(request.incomeTaxWithholding());

        return MonthlyPaySlipDto.from(monthlyPaySlipRepository.save(slip));
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long contractId, Long slipId, User currentUser) {
        SalaryContract contract = salaryContractService.getContractWithOwnershipCheck(contractId, currentUser);
        getSlipForContract(slipId, contract);
        monthlyPaySlipRepository.deleteById(slipId);
    }

    // ── Vérification appartenance bulletin ────────────────────

    private MonthlyPaySlip getSlipForContract(Long slipId, SalaryContract contract) {
        MonthlyPaySlip slip = monthlyPaySlipRepository.findById(slipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Bulletin introuvable : " + slipId));

        if (!slip.getContract().getId().equals(contract.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Bulletin introuvable pour ce contrat");
        }
        return slip;
    }
}
