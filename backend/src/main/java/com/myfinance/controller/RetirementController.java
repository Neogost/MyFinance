package com.myfinance.controller;

import com.myfinance.config.RetirementParameters;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/retirement")
@RequiredArgsConstructor
public class RetirementController {

    private final RetirementParameters retirementParameters;

    @GetMapping("/parameters")
    public ResponseEntity<RetirementParameters> getParameters() {
        return ResponseEntity.ok(retirementParameters);
    }
}
