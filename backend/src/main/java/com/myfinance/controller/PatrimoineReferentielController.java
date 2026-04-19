package com.myfinance.controller;

import com.myfinance.config.PatrimoineReferentiel;
import com.myfinance.dto.PatrimoineReferentielDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/patrimoine/referentiel")
@RequiredArgsConstructor
public class PatrimoineReferentielController {

    private final PatrimoineReferentiel referentiel;

    @GetMapping
    public ResponseEntity<PatrimoineReferentielDto> get() {
        return ResponseEntity.ok(PatrimoineReferentielDto.from(referentiel));
    }
}
