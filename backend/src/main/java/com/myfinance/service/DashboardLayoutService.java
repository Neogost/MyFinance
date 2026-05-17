package com.myfinance.service;

import com.myfinance.domain.User;
import com.myfinance.domain.UserDashboard;
import com.myfinance.domain.UserDashboardLayout;
import com.myfinance.dto.DashboardLayoutDto;
import com.myfinance.dto.SaveDashboardLayoutRequest;
import com.myfinance.repository.UserDashboardLayoutRepository;
import com.myfinance.repository.UserDashboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

/**
 * Accès au layout d'un dashboard individuel.
 * Les anciens endpoints /api/dashboard/layout utilisent le dashboard par défaut.
 */
@Service
@RequiredArgsConstructor
public class DashboardLayoutService {

    private final UserDashboardLayoutRepository layoutRepository;
    private final UserDashboardRepository       dashboardRepository;

    private static final int MAX_JSON_BYTES = 32_768;

    // ── Rétrocompatibilité Palier 2 — dashboard par défaut ───────────────────

    @Transactional(readOnly = true)
    public DashboardLayoutDto getLayout(User currentUser) {
        return dashboardRepository.findByUserAndIsDefaultTrue(currentUser)
                .flatMap(d -> layoutRepository.findByDashboardId(d.getId()))
                .map(DashboardLayoutDto::from)
                .orElse(null);
    }

    @Transactional
    public DashboardLayoutDto saveLayout(SaveDashboardLayoutRequest request, User currentUser) {
        UserDashboard dashboard = dashboardRepository.findByUserAndIsDefaultTrue(currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Aucun dashboard par défaut trouvé."));
        return saveLayoutForDashboard(request, dashboard);
    }

    // ── Accès par ID de dashboard (Palier 3) ──────────────────────────────────

    @Transactional(readOnly = true)
    public DashboardLayoutDto getLayoutByDashboardId(Long dashboardId, User currentUser) {
        requireOwned(dashboardId, currentUser);
        return layoutRepository.findByDashboardId(dashboardId)
                .map(DashboardLayoutDto::from)
                .orElse(null);
    }

    @Transactional
    public DashboardLayoutDto saveLayoutByDashboardId(Long dashboardId,
                                                       SaveDashboardLayoutRequest request,
                                                       User currentUser) {
        UserDashboard dashboard = requireOwned(dashboardId, currentUser);
        return saveLayoutForDashboard(request, dashboard);
    }

    // ── Helper commun ─────────────────────────────────────────────────────────

    private DashboardLayoutDto saveLayoutForDashboard(SaveDashboardLayoutRequest request,
                                                       UserDashboard dashboard) {
        if (request.layoutJson().getBytes().length > MAX_JSON_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "Layout JSON dépasse 32 kB");
        }

        UserDashboardLayout layout = layoutRepository.findByDashboardId(dashboard.getId())
                .orElse(UserDashboardLayout.builder().dashboard(dashboard).build());

        layout.setLayoutJson(request.layoutJson());
        layout.setVersion(request.version());
        layout.setUpdatedAt(LocalDateTime.now());

        return DashboardLayoutDto.from(layoutRepository.save(layout));
    }

    private UserDashboard requireOwned(Long dashboardId, User user) {
        UserDashboard d = dashboardRepository.findById(dashboardId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tableau de bord introuvable."));
        if (!d.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès refusé à ce tableau de bord.");
        }
        return d;
    }
}
