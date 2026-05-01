package com.myfinance.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.info.BuildProperties;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/version")
@Tag(name = "Info", description = "Informations sur la version déployée")
public class AppInfoController {

    // Optional : BuildProperties n'existe que si build-info.properties a été généré
    // (./mvnw package ou goal build-info). En dev sans compilation préalable, retourne "dev".
    @Nullable
    @Autowired(required = false)
    private BuildProperties buildProperties;

    @Operation(summary = "Version de l'application")
    @GetMapping
    public ResponseEntity<Map<String, String>> getVersion() {
        String version = (buildProperties != null && buildProperties.getVersion() != null)
                ? buildProperties.getVersion()
                : "dev";
        return ResponseEntity.ok(Map.of("version", version));
    }
}
