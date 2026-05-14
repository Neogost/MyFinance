package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.InfoBannerDto;
import com.myfinance.service.InfoBannerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/info-banners")
@RequiredArgsConstructor
@Tag(name = "Bannières d'information", description = "Messages diffusés à tous les utilisateurs")
public class InfoBannerController {

    private final InfoBannerService infoBannerService;

    @Operation(summary = "Bannières actives pour l'utilisateur courant")
    @ApiResponse(responseCode = "200", description = "Liste triée par priorité (ALERT > WARNING > MAINTENANCE > INFO > SUCCESS)",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = InfoBannerDto.class))))
    @GetMapping("/active")
    public ResponseEntity<List<InfoBannerDto>> getActive(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(infoBannerService.findActive(currentUser));
    }
}
