package com.myfinance.service;

import com.myfinance.domain.OtherIncome;
import com.myfinance.domain.OtherIncomeTypeEnum;
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

import java.time.LocalDate;
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
        validateContractFields(request.type(), request.date(), request.periodStart(),
                request.periodEnd(), request.dayOfMonth());

        LocalDate effectiveDate = resolveEffectiveDate(request.date(), request.periodStart());

        OtherIncome income = OtherIncome.builder()
                .user(user)
                .type(request.type())
                .label(request.label())
                .amount(request.amount())
                .date(effectiveDate)
                .isTaxable(request.isTaxable() != null ? request.isTaxable() : true)
                .specificTaxRate(request.specificTaxRate())
                .position(resolvePosition(request.positionId(), request.type()))
                .periodStart(request.periodStart())
                .periodEnd(request.periodEnd())
                .dayOfMonth(request.dayOfMonth())
                .build();

        OtherIncomeDto dto = OtherIncomeDto.from(otherIncomeRepository.save(income));
        log.info("[user:{}] Revenu complémentaire créé #{} [type: {}]", user.getId(), dto.id(), request.type());
        return dto;
    }

    // ── Modification ───────────────────────────────────────────

    public OtherIncomeDto update(Long id, UpdateOtherIncomeRequest request, User currentUser) {
        OtherIncome income = getIncomeWithOwnershipCheck(id, currentUser);

        validateContractFields(request.type(), request.date(), request.periodStart(),
                request.periodEnd(), request.dayOfMonth());

        LocalDate effectiveDate = resolveEffectiveDate(request.date(), request.periodStart());

        income.setType(request.type());
        income.setLabel(request.label());
        income.setAmount(request.amount());
        income.setDate(effectiveDate);
        income.setIsTaxable(request.isTaxable() != null ? request.isTaxable() : true);
        income.setSpecificTaxRate(request.specificTaxRate());
        income.setPosition(resolvePosition(request.positionId(), request.type()));
        income.setPeriodStart(request.periodStart());
        income.setPeriodEnd(request.periodEnd());
        income.setDayOfMonth(request.dayOfMonth());

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

    private void validateContractFields(OtherIncomeTypeEnum type, LocalDate date,
                                        LocalDate periodStart, LocalDate periodEnd,
                                        Integer dayOfMonth) {
        if (periodStart != null) {
            if (type != OtherIncomeTypeEnum.LOCATIF) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Les champs de contrat (periodStart, periodEnd, dayOfMonth) sont réservés aux revenus de type LOCATIF");
            }
            if (dayOfMonth == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Le jour de perception (dayOfMonth) est obligatoire pour un contrat de location");
            }
            if (periodEnd != null && !periodEnd.isAfter(periodStart)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "La date de fin doit être postérieure à la date de début du contrat");
            }
        } else {
            if (date == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "La date de perception est obligatoire pour une saisie ponctuelle");
            }
            if (dayOfMonth != null || periodEnd != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "dayOfMonth et periodEnd requièrent que periodStart soit renseigné");
            }
        }
    }

    /** Pour un contrat, date = periodStart (pour les requêtes par plage temporelle). */
    private LocalDate resolveEffectiveDate(LocalDate date, LocalDate periodStart) {
        return periodStart != null ? periodStart : date;
    }

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

    private Position resolvePosition(Long positionId, OtherIncomeTypeEnum type) {
        if (positionId == null) return null;
        if (type != OtherIncomeTypeEnum.LOCATIF) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le lien à un bien immobilier est réservé aux revenus de type LOCATIF");
        }
        return positionRepository.findById(positionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Position introuvable : " + positionId));
    }
}
