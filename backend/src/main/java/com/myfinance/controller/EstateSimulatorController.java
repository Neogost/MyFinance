package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CreatePastDonationRequest;
import com.myfinance.dto.DonationSimulationRequest;
import com.myfinance.dto.DonationSimulationResultDto;
import com.myfinance.dto.JointDonationRequest;
import com.myfinance.dto.JointDonationResultDto;
import com.myfinance.dto.MultiRecipientDonationRequest;
import com.myfinance.dto.MultiRecipientDonationResultDto;
import com.myfinance.dto.JointMultiRecipientDonationRequest;
import com.myfinance.dto.JointMultiRecipientDonationResultDto;
import com.myfinance.dto.PastDonationDto;
import com.myfinance.dto.StrategySimulationResultDto;
import com.myfinance.dto.SuccessionSimulationResultDto;
import com.myfinance.service.EstateSimulatorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/estate")
@RequiredArgsConstructor
@Tag(name = "Donation & succession", description = "Simulation de donation et historique des donations passées")
public class EstateSimulatorController {

    private final EstateSimulatorService estateSimulatorService;

    @Operation(summary = "Simuler une donation",
            description = "Calcule l'abattement disponible, la part taxable et les droits selon le barème en vigueur. Sans persistance.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = DonationSimulationResultDto.class)))
    @PostMapping("/donation/simulate")
    public ResponseEntity<DonationSimulationResultDto> simulateDonation(
            @Valid @RequestBody DonationSimulationRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(estateSimulatorService.simulateDonation(currentUser, request));
    }

    @Operation(summary = "Stratégie de donations sur 15 ans (V3)",
            description = "Planifie des cycles de donations tous les 15 ans pour épuiser les abattements. "
                    + "Calcule le maximum transmissible sans droits sur la durée de vie du donateur.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = StrategySimulationResultDto.class)))
    @GetMapping("/strategy/simulate")
    public ResponseEntity<StrategySimulationResultDto> simulateStrategy(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(estateSimulatorService.simulateStrategy(currentUser));
    }

    @Operation(summary = "Simuler la succession (V2)",
            description = "Calcule la masse successorale (patrimoine net + donations rapportées < 15 ans), "
                    + "applique les règles de réserve héréditaire et calcule les droits par héritier. "
                    + "Le conjoint est exonéré depuis 2007.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = SuccessionSimulationResultDto.class)))
    @GetMapping("/succession/simulate")
    public ResponseEntity<SuccessionSimulationResultDto> simulateSuccession(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(estateSimulatorService.simulateSuccession(currentUser));
    }

    @Operation(summary = "Simuler une donation à plusieurs bénéficiaires",
            description = "Simule la donation d'un même bien à N bénéficiaires (typiquement les enfants). "
                    + "Chaque bénéficiaire a son propre abattement et calcul de droits. "
                    + "Les frais de notaire sont calculés une seule fois sur le total (1 acte).")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = MultiRecipientDonationResultDto.class)))
    @ApiResponse(responseCode = "400", description = "Somme des parts ≠ 100 %")
    @PostMapping("/donation/simulate-multi")
    public ResponseEntity<MultiRecipientDonationResultDto> simulateMultiRecipientDonation(
            @Valid @RequestBody MultiRecipientDonationRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(estateSimulatorService.simulateMultiRecipientDonation(currentUser, request));
    }

    @Operation(summary = "Simuler une donation conjointe à plusieurs bénéficiaires",
            description = "2 donateurs × N bénéficiaires. Chaque pair (donateur, bénéficiaire) bénéficie "
                    + "de son propre abattement. Les frais de notaire sont calculés une seule fois.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = JointMultiRecipientDonationResultDto.class)))
    @PostMapping("/donation/simulate-joint-multi")
    public ResponseEntity<JointMultiRecipientDonationResultDto> simulateJointMultiRecipientDonation(
            @Valid @RequestBody JointMultiRecipientDonationRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(estateSimulatorService.simulateJointMultiRecipientDonation(currentUser, request));
    }

    @Operation(summary = "Simuler une donation conjointe (2 co-propriétaires)",
            description = "Simule la donation des deux parents à un même bénéficiaire. "
                    + "Les abattements sont indépendants (100 k€ par parent). Les frais de notaire sont calculés sur un seul acte.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = JointDonationResultDto.class)))
    @PostMapping("/donation/simulate-joint")
    public ResponseEntity<JointDonationResultDto> simulateJointDonation(
            @Valid @RequestBody JointDonationRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(estateSimulatorService.simulateJointDonation(currentUser, request));
    }

    @Operation(summary = "Lister les donations passées enregistrées")
    @ApiResponse(responseCode = "200", content = @Content(array = @ArraySchema(schema = @Schema(implementation = PastDonationDto.class))))
    @GetMapping("/past-donations")
    public ResponseEntity<List<PastDonationDto>> getPastDonations(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(estateSimulatorService.getPastDonations(currentUser));
    }

    @Operation(summary = "Enregistrer une donation passée",
            description = "Mémorise une donation déjà effectuée pour calculer l'abattement résiduel dans les simulations futures.")
    @ApiResponse(responseCode = "201", content = @Content(schema = @Schema(implementation = PastDonationDto.class)))
    @PostMapping("/past-donations")
    public ResponseEntity<PastDonationDto> recordPastDonation(
            @Valid @RequestBody CreatePastDonationRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(estateSimulatorService.recordPastDonation(currentUser, request));
    }

    @Operation(summary = "Supprimer une donation passée")
    @ApiResponse(responseCode = "204", description = "Donation supprimée")
    @ApiResponse(responseCode = "404", description = "Donation introuvable")
    @DeleteMapping("/past-donations/{id}")
    public ResponseEntity<Void> deletePastDonation(
            @Parameter(description = "Identifiant de la donation") @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        estateSimulatorService.deletePastDonation(id, currentUser);
        return ResponseEntity.noContent().build();
    }
}
