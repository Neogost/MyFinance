package com.myfinance.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/version")
@RequiredArgsConstructor
@Tag(name = "Info", description = "Informations sur la version déployée")
public class AppInfoController {

    private final BuildProperties buildProperties;

    @Operation(summary = "Version de l'application")
    @GetMapping
    public ResponseEntity<Map<String, String>> getVersion() {
        return ResponseEntity.ok(Map.of("version", buildProperties.getVersion()));
    }
}
