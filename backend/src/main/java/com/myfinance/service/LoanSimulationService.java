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
            LoanSimulation simulation = LoanSimulation.builder()
                    .user(user)
                    .name(request.name())
                    .savedAt(LocalDateTime.now())
                    .parametersJson(objectMapper.writeValueAsString(request.parameters()))
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
