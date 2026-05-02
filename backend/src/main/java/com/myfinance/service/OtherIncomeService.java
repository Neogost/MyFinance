package com.myfinance.service;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.Position;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateOtherIncomeRequest;
import com.myfinance.dto.OtherIncomeDto;
import com.myfinance.dto.UpdateOtherIncomeRequest;
import com.myfinance.repository.OtherIncomeRepository;
import com.myfinance.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtherIncomeService {

    private final OtherIncomeRepository otherIncomeRepository;
    private final PositionRepository positionRepository;

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
                .position(resolvePosition(request.positionId()))
                .build();

        OtherIncomeDto dto = OtherIncomeDto.from(otherIncomeRepository.save(income));
        log.info("[user:{}] Revenu complémentaire créé #{} [type: {}]", user.getId(), dto.id(), request.type());
        return dto;
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
        income.setPosition(resolvePosition(request.positionId()));

        OtherIncomeDto dto = OtherIncomeDto.from(otherIncomeRepository.save(income));
        log.info("[user:{}] Revenu complémentaire modifié #{} [type: {}]", currentUser.getId(), id, request.type());
        return dto;
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id, User currentUser) {
        getIncomeWithOwnershipCheck(id, currentUser);
        otherIncomeRepository.deleteById(id);
        log.info("[user:{}] Revenu complémentaire supprimé #{}", currentUser.getId(), id);
    }

    // ── Helpers privés ─────────────────────────────────────────

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

    private Position resolvePosition(Long positionId) {
        if (positionId == null) return null;
        return positionRepository.findById(positionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Position introuvable : " + positionId));
    }
}
