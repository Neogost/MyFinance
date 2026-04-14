package com.myfinance.controller;

import com.myfinance.domain.User;
import com.myfinance.dto.CreateSnapshotRequest;
import com.myfinance.dto.PortfolioSnapshotDto;
import com.myfinance.service.PortfolioSnapshotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/portfolio/snapshots")
@RequiredArgsConstructor
public class PortfolioSnapshotController {

    private final PortfolioSnapshotService portfolioSnapshotService;

    /** GET /api/portfolio/snapshots */
    @GetMapping
    public List<PortfolioSnapshotDto> findAll(@AuthenticationPrincipal User currentUser) {
        return portfolioSnapshotService.findAllByUser(currentUser);
    }

    /** GET /api/portfolio/snapshots/{id} */
    @GetMapping("/{id}")
    public PortfolioSnapshotDto findById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return portfolioSnapshotService.findById(id, currentUser);
    }

    /** POST /api/portfolio/snapshots */
    @PostMapping
    public ResponseEntity<PortfolioSnapshotDto> create(
            @Valid @RequestBody CreateSnapshotRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(portfolioSnapshotService.create(request, currentUser));
    }

    /** PUT /api/portfolio/snapshots/{id}/recalculate */
    @PutMapping("/{id}/recalculate")
    public PortfolioSnapshotDto recalculate(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return portfolioSnapshotService.recalculate(id, currentUser);
    }
}
