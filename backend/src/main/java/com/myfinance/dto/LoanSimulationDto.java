package com.myfinance.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfinance.domain.LoanSimulation;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public record LoanSimulationDto(
        Long id,
        String name,
        String savedAt,
        Object parameters
) {
    public static LoanSimulationDto from(LoanSimulation s, ObjectMapper mapper) {
        try {
            return new LoanSimulationDto(
                    s.getId(),
                    s.getName(),
                    s.getSavedAt().toString(),
                    mapper.readValue(s.getParametersJson(), Object.class)
            );
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur de désérialisation de la simulation " + s.getId());
        }
    }
}
