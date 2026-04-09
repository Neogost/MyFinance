package com.myfinance.service;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateOtherIncomeRequest;
import com.myfinance.dto.OtherIncomeDto;
import com.myfinance.dto.UpdateOtherIncomeRequest;
import com.myfinance.repository.OtherIncomeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OtherIncomeService {

    private final OtherIncomeRepository otherIncomeRepository;

    // ── Lecture ────────────────────────────────────────────────

    public List<OtherIncomeDto> findAllByUser(User user) {
        return otherIncomeRepository.findByUserOrderByDateDesc(user)
                .stream()
                .map(OtherIncomeDto::from)
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public OtherIncomeDto create(CreateOtherIncomeRequest request, User user) {
        OtherIncome income = OtherIncome.builder()
                .user(user)
                .type(request.type())
                .label(request.label())
                .amount(request.amount())
                .date(request.date())
                .isTaxable(request.isTaxable() != null ? request.isTaxable() : true)
                .specificTaxRate(request.specificTaxRate())
                .build();

        return OtherIncomeDto.from(otherIncomeRepository.save(income));
    }

    // ── Modification ───────────────────────────────────────────

    public OtherIncomeDto update(Long id, UpdateOtherIncomeRequest request, User currentUser) {
        OtherIncome income = getIncomeWithOwnershipCheck(id, currentUser);

        income.setType(request.type());
        income.setLabel(request.label());
        income.setAmount(request.amount());
        income.setDate(request.date());
        income.setIsTaxable(request.isTaxable() != null ? request.isTaxable() : true);
        income.setSpecificTaxRate(request.specificTaxRate());

        return OtherIncomeDto.from(otherIncomeRepository.save(income));
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id, User currentUser) {
        getIncomeWithOwnershipCheck(id, currentUser);
        otherIncomeRepository.deleteById(id);
    }

    // ── Vérification propriété ─────────────────────────────────

    private OtherIncome getIncomeWithOwnershipCheck(Long id, User currentUser) {
        OtherIncome income = otherIncomeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Revenu introuvable : " + id));

        boolean isOwner = income.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès non autorisé à ce revenu");
        }
        return income;
    }
}
