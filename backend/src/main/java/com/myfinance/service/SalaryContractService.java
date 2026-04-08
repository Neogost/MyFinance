package com.myfinance.service;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.SalaryContract;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateSalaryContractRequest;
import com.myfinance.dto.SalaryContractDto;
import com.myfinance.dto.UpdateSalaryContractRequest;
import com.myfinance.repository.SalaryContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SalaryContractService {

    private final SalaryContractRepository salaryContractRepository;

    // ── Lecture ────────────────────────────────────────────────

    public List<SalaryContractDto> findAllByUser(User user) {
        return salaryContractRepository.findByUserOrderByStartDateDesc(user)
                .stream()
                .map(SalaryContractDto::from)
                .toList();
    }

    public SalaryContractDto findById(Long id, User currentUser) {
        return SalaryContractDto.from(getContractWithOwnershipCheck(id, currentUser));
    }

    // ── Création ───────────────────────────────────────────────

    public SalaryContractDto create(CreateSalaryContractRequest request, User user) {
        // Un seul contrat actif (endDate = null) par utilisateur
        if (request.endDate() == null
                && salaryContractRepository.existsByUserAndEndDateIsNull(user)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un contrat actif existe déjà. Clôturez-le avant d'en créer un nouveau.");
        }

        SalaryContract contract = SalaryContract.builder()
                .user(user)
                .startDate(request.startDate())
                .endDate(request.endDate())
                .annualGrossSalary(request.annualGrossSalary())
                .paidMonthsPerYear(request.paidMonthsPerYear())
                .weeklyHours(request.weeklyHours())
                .mealVoucherAmount(request.mealVoucherAmount())
                .mealVoucherEmployeeRate(request.mealVoucherEmployeeRate())
                .build();

        return SalaryContractDto.from(salaryContractRepository.save(contract));
    }

    // ── Modification ───────────────────────────────────────────

    public SalaryContractDto update(Long id, UpdateSalaryContractRequest request, User currentUser) {
        SalaryContract contract = getContractWithOwnershipCheck(id, currentUser);

        // Si on rend ce contrat actif, vérifie qu'aucun autre ne l'est déjà
        if (request.endDate() == null && contract.getEndDate() != null) {
            if (salaryContractRepository.existsByUserAndEndDateIsNull(contract.getUser())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Un contrat actif existe déjà. Clôturez-le avant de réactiver celui-ci.");
            }
        }

        contract.setStartDate(request.startDate());
        contract.setEndDate(request.endDate());
        contract.setAnnualGrossSalary(request.annualGrossSalary());
        contract.setPaidMonthsPerYear(request.paidMonthsPerYear());
        contract.setWeeklyHours(request.weeklyHours());
        contract.setMealVoucherAmount(request.mealVoucherAmount());
        contract.setMealVoucherEmployeeRate(request.mealVoucherEmployeeRate());

        return SalaryContractDto.from(salaryContractRepository.save(contract));
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id, User currentUser) {
        getContractWithOwnershipCheck(id, currentUser);
        salaryContractRepository.deleteById(id);
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
}
