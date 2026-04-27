package com.myfinance.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.LoanSimulation;
import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.dto.CreateLoanSimulationRequest;
import com.myfinance.dto.LoanSimulationDto;
import com.myfinance.repository.LoanSimulationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LoanSimulationService {

    /**
     * Taille maximale du JSON sérialisé `parametersJson`. Le simulateur frontend gère
     * environ 40 paramètres (~3 KB en JSON compacté), donc 50 000 caractères laissent
     * une marge ~10× pour l'évolution future. Au-delà, on rejette en 400 pour empêcher
     * un utilisateur authentifié de stocker des MB de JSON arbitraire (M13 — DoS storage).
     */
    private static final int MAX_PARAMETERS_JSON_LENGTH = 50_000;

    private final LoanSimulationRepository loanSimulationRepository;
    private final ObjectMapper objectMapper;

    // ── Lecture ────────────────────────────────────────────────

    public List<LoanSimulationDto> findAllByUser(User user) {
        return loanSimulationRepository.findByUserOrderBySavedAtDesc(user)
                .stream()
                .map(s -> LoanSimulationDto.from(s, objectMapper))
                .toList();
    }

    // ── Création ───────────────────────────────────────────────

    public LoanSimulationDto create(CreateLoanSimulationRequest request, User user) {
        try {
            String parametersJson = objectMapper.writeValueAsString(request.parameters());
            if (parametersJson.length() > MAX_PARAMETERS_JSON_LENGTH) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Paramètres de simulation trop volumineux (limite : "
                                + MAX_PARAMETERS_JSON_LENGTH + " caractères, reçu : "
                                + parametersJson.length() + ").");
            }

            LoanSimulation simulation = LoanSimulation.builder()
                    .user(user)
                    .name(request.name())
                    .savedAt(LocalDateTime.now())
                    .parametersJson(parametersJson)
                    .build();

            return LoanSimulationDto.from(loanSimulationRepository.save(simulation), objectMapper);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paramètres de simulation invalides");
        }
    }

    // ── Suppression ────────────────────────────────────────────

    public void delete(Long id, User currentUser) {
        getWithOwnershipCheck(id, currentUser);
        loanSimulationRepository.deleteById(id);
    }

    // ── Vérification propriété ─────────────────────────────────

    private LoanSimulation getWithOwnershipCheck(Long id, User currentUser) {
        LoanSimulation simulation = loanSimulationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Simulation introuvable : " + id));

        boolean isOwner = simulation.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == RoleEnum.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès non autorisé à cette simulation");
        }
        return simulation;
    }
}
