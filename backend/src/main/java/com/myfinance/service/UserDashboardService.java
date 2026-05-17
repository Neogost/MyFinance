package com.myfinance.service;

import com.myfinance.domain.User;
import com.myfinance.domain.UserDashboard;
import com.myfinance.domain.UserDashboardLayout;
import com.myfinance.dto.*;
import com.myfinance.repository.UserDashboardLayoutRepository;
import com.myfinance.repository.UserDashboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDashboardService {

    private final UserDashboardRepository dashboardRepository;
    private final UserDashboardLayoutRepository layoutRepository;

    private static final int MAX_DASHBOARDS   = 5;
    private static final int MAX_JSON_BYTES   = 32_768;

    // ── Liste ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UserDashboardDto> listDashboards(User user) {
        return dashboardRepository.findByUserOrderBySortOrderAsc(user)
                .stream().map(UserDashboardDto::from).toList();
    }

    // ── Détail avec layout ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public UserDashboardWithLayoutDto getDashboard(Long id, User user) {
        UserDashboard d = requireOwned(id, user);
        UserDashboardLayout layout = layoutRepository.findByDashboardId(d.getId()).orElse(null);
        return UserDashboardWithLayoutDto.from(d, layout);
    }

    // ── Création ──────────────────────────────────────────────────────────────

    @Transactional
    public UserDashboardWithLayoutDto createDashboard(CreateDashboardRequest req, User user) {
        if (dashboardRepository.countByUser(user) >= MAX_DASHBOARDS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Vous ne pouvez pas créer plus de " + MAX_DASHBOARDS + " tableaux de bord.");
        }

        int nextOrder = dashboardRepository.findByUserOrderBySortOrderAsc(user).size();
        LocalDateTime now = LocalDateTime.now();

        UserDashboard dashboard = dashboardRepository.save(UserDashboard.builder()
                .user(user)
                .name(req.name().strip())
                .sortOrder(nextOrder)
                .isDefault(false)
                .createdAt(now)
                .updatedAt(now)
                .build());

        return UserDashboardWithLayoutDto.from(dashboard, null);
    }

    // ── Mise à jour (renommer, réordonner, set default) ───────────────────────

    @Transactional
    public UserDashboardDto updateDashboard(Long id, UpdateDashboardRequest req, User user) {
        UserDashboard d = requireOwned(id, user);
        d.setName(req.name().strip());
        d.setSortOrder(req.sortOrder());
        d.setUpdatedAt(LocalDateTime.now());

        if (Boolean.TRUE.equals(req.isDefault()) && !Boolean.TRUE.equals(d.getIsDefault())) {
            dashboardRepository.findByUserAndIsDefaultTrue(user)
                    .ifPresent(prev -> { prev.setIsDefault(false); dashboardRepository.save(prev); });
            d.setIsDefault(true);
        }

        return UserDashboardDto.from(dashboardRepository.save(d));
    }

    // ── Réordonnancement en masse ─────────────────────────────────────────────

    @Transactional
    public List<UserDashboardDto> reorderDashboards(ReorderDashboardsRequest req, User user) {
        List<UserDashboard> owned = dashboardRepository.findByUserOrderBySortOrderAsc(user);
        List<Long> ownedIds = owned.stream().map(UserDashboard::getId).toList();

        if (!ownedIds.containsAll(req.orderedIds()) || req.orderedIds().size() != ownedIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La liste d'IDs ne correspond pas à vos tableaux de bord.");
        }

        for (int i = 0; i < req.orderedIds().size(); i++) {
            final int order = i;
            Long dashId = req.orderedIds().get(i);
            owned.stream().filter(d -> d.getId().equals(dashId)).findFirst()
                    .ifPresent(d -> d.setSortOrder(order));
        }
        return dashboardRepository.saveAll(owned).stream().map(UserDashboardDto::from).toList();
    }

    // ── Sauvegarde du layout ──────────────────────────────────────────────────

    @Transactional
    public UserDashboardWithLayoutDto saveLayout(Long dashboardId,
                                                 SaveDashboardLayoutRequest req,
                                                 User user) {
        UserDashboard d = requireOwned(dashboardId, user);

        if (req.layoutJson().getBytes().length > MAX_JSON_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "Layout JSON dépasse 32 kB");
        }

        UserDashboardLayout layout = layoutRepository.findByDashboardId(dashboardId)
                .orElse(UserDashboardLayout.builder().dashboard(d).build());

        layout.setLayoutJson(req.layoutJson());
        layout.setVersion(req.version());
        layout.setUpdatedAt(LocalDateTime.now());
        d.setUpdatedAt(LocalDateTime.now());

        dashboardRepository.save(d);
        return UserDashboardWithLayoutDto.from(d, layoutRepository.save(layout));
    }

    // ── Suppression ───────────────────────────────────────────────────────────

    @Transactional
    public void deleteDashboard(Long id, User user) {
        UserDashboard d = requireOwned(id, user);

        if (dashboardRepository.countByUser(user) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Vous devez conserver au moins un tableau de bord.");
        }

        layoutRepository.deleteByDashboard(d);
        dashboardRepository.delete(d);

        // Si c'était le défaut, promouvoir le premier restant
        if (Boolean.TRUE.equals(d.getIsDefault())) {
            dashboardRepository.findByUserOrderBySortOrderAsc(user).stream()
                    .findFirst()
                    .ifPresent(first -> {
                        first.setIsDefault(true);
                        dashboardRepository.save(first);
                    });
        }
    }

    // ── Migration Palier 2 → Palier 3 (auto-création au premier accès) ────────

    /**
     * Garantit qu'un utilisateur a au moins un dashboard.
     * Appelé lors du premier GET /api/dashboards pour migrer les anciens layouts.
     */
    @Transactional
    public UserDashboard ensureDefaultDashboard(User user) {
        return dashboardRepository.findByUserAndIsDefaultTrue(user)
                .or(() -> dashboardRepository.findByUserOrderBySortOrderAsc(user).stream().findFirst())
                .orElseGet(() -> {
                    LocalDateTime now = LocalDateTime.now();
                    return dashboardRepository.save(UserDashboard.builder()
                            .user(user)
                            .name("Principal")
                            .sortOrder(0)
                            .isDefault(true)
                            .createdAt(now)
                            .updatedAt(now)
                            .build());
                });
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private UserDashboard requireOwned(Long id, User user) {
        UserDashboard d = dashboardRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tableau de bord introuvable."));
        if (!d.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès refusé à ce tableau de bord.");
        }
        return d;
    }
}
