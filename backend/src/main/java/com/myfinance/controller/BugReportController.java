package com.myfinance.controller;

import com.myfinance.domain.BugStatus;
import com.myfinance.domain.User;
import com.myfinance.dto.*;
import com.myfinance.service.BugReportService;
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
@RequestMapping("/api/bug-reports")
@RequiredArgsConstructor
@Tag(name = "Signalement de bugs", description = "Remontée et suivi communautaire des bugs")
public class BugReportController {

    private final BugReportService bugReportService;

    @Operation(summary = "Liste des bugs (triés par score décroissant)")
    @ApiResponse(responseCode = "200",
        content = @Content(array = @ArraySchema(schema = @Schema(implementation = BugReportSummaryDto.class))))
    @GetMapping
    public ResponseEntity<List<BugReportSummaryDto>> findAll(
            @Parameter(description = "Filtre optionnel sur le statut")
            @RequestParam(required = false) BugStatus status,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bugReportService.findAll(status, currentUser));
    }

    @Operation(summary = "Détail d'un bug avec commentaires et vote courant")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = BugReportDetailDto.class)))
    @ApiResponse(responseCode = "404", description = "Bug introuvable")
    @GetMapping("/{id}")
    public ResponseEntity<BugReportDetailDto> findById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bugReportService.findById(id, currentUser));
    }

    @Operation(summary = "Signaler un bug")
    @ApiResponse(responseCode = "201", content = @Content(schema = @Schema(implementation = BugReportSummaryDto.class)))
    @PostMapping
    public ResponseEntity<BugReportSummaryDto> create(
            @Valid @RequestBody CreateBugReportRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bugReportService.create(request, currentUser));
    }

    @Operation(summary = "Voter sur un bug (UP ou DOWN) — interdit sur son propre bug")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = VoteResultDto.class)))
    @ApiResponse(responseCode = "403", description = "Vote sur son propre bug interdit")
    @PutMapping("/{id}/vote")
    public ResponseEntity<VoteResultDto> vote(
            @PathVariable Long id,
            @Valid @RequestBody VoteRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bugReportService.vote(id, request.voteType(), currentUser));
    }

    @Operation(summary = "Retirer son vote sur un bug")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = VoteResultDto.class)))
    @DeleteMapping("/{id}/vote")
    public ResponseEntity<VoteResultDto> removeVote(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(bugReportService.removeVote(id, currentUser));
    }

    @Operation(summary = "Commenter un bug")
    @ApiResponse(responseCode = "201", content = @Content(schema = @Schema(implementation = BugCommentDto.class)))
    @PostMapping("/{id}/comments")
    public ResponseEntity<BugCommentDto> addComment(
            @PathVariable Long id,
            @Valid @RequestBody CreateBugCommentRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bugReportService.addComment(id, request, currentUser));
    }
}
