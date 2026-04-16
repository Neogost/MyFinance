package com.myfinance.controller;

import com.myfinance.dto.AdminSnapshotDetailDto;
import com.myfinance.dto.ManualSnapshotRequest;
import com.myfinance.dto.PositionAdminRefDto;
import com.myfinance.service.AdminSnapshotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSnapshotController {

    private final AdminSnapshotService adminSnapshotService;

    /** GET /api/admin/snapshots?userId={id} */
    @GetMapping("/api/admin/snapshots")
    public List<AdminSnapshotDetailDto> findAll(@RequestParam Long userId) {
        return adminSnapshotService.findAllByUser(userId);
    }

    /** GET /api/admin/snapshots/{id} */
    @GetMapping("/api/admin/snapshots/{id}")
    public AdminSnapshotDetailDto findById(@PathVariable Long id) {
        return adminSnapshotService.findById(id);
    }

    /** POST /api/admin/snapshots */
    @PostMapping("/api/admin/snapshots")
    public ResponseEntity<AdminSnapshotDetailDto> create(
            @Valid @RequestBody ManualSnapshotRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminSnapshotService.create(request));
    }

    /** PUT /api/admin/snapshots/{id} */
    @PutMapping("/api/admin/snapshots/{id}")
    public AdminSnapshotDetailDto update(
            @PathVariable Long id,
            @Valid @RequestBody ManualSnapshotRequest request) {
        return adminSnapshotService.update(id, request);
    }

    /** DELETE /api/admin/snapshots/{id} */
    @DeleteMapping("/api/admin/snapshots/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        adminSnapshotService.delete(id);
    }

    /** GET /api/admin/users/{userId}/positions — positions actives d'un utilisateur */
    @GetMapping("/api/admin/users/{userId}/positions")
    public List<PositionAdminRefDto> findActivePositions(@PathVariable Long userId) {
        return adminSnapshotService.findActivePositionsByUser(userId);
    }
}
