package com.myfinance.service;

import com.myfinance.domain.User;
import com.myfinance.domain.UserDashboard;
import com.myfinance.domain.UserDashboardLayout;
import com.myfinance.dto.*;
import com.myfinance.repository.UserDashboardLayoutRepository;
import com.myfinance.repository.UserDashboardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserDashboardServiceTest {

    @Mock UserDashboardRepository      dashboardRepository;
    @Mock UserDashboardLayoutRepository layoutRepository;
    @InjectMocks UserDashboardService  service;

    User user;
    UserDashboard defaultDash;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);

        defaultDash = UserDashboard.builder()
                .id(10L).user(user).name("Principal")
                .sortOrder(0).isDefault(true)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();
    }

    // ── listDashboards ────────────────────────────────────────────────────────

    @Test
    void listDashboards_retourne_liste_triée() {
        when(dashboardRepository.findByUserOrderBySortOrderAsc(user))
                .thenReturn(List.of(defaultDash));

        List<UserDashboardDto> result = service.listDashboards(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Principal");
        assertThat(result.get(0).isDefault()).isTrue();
    }

    // ── getDashboard ──────────────────────────────────────────────────────────

    @Test
    void getDashboard_retourne_dto_avec_layout() {
        UserDashboardLayout layout = UserDashboardLayout.builder()
                .id(1L).dashboard(defaultDash)
                .layoutJson("{\"v\":1}").version(1).updatedAt(LocalDateTime.now())
                .build();
        when(dashboardRepository.findById(10L)).thenReturn(Optional.of(defaultDash));
        when(layoutRepository.findByDashboardId(10L)).thenReturn(Optional.of(layout));

        UserDashboardWithLayoutDto dto = service.getDashboard(10L, user);

        assertThat(dto.layoutJson()).isEqualTo("{\"v\":1}");
        assertThat(dto.isDefault()).isTrue();
    }

    @Test
    void getDashboard_lève_403_si_autre_user() {
        User other = new User(); other.setId(99L);
        when(dashboardRepository.findById(10L)).thenReturn(Optional.of(defaultDash));

        assertThatThrownBy(() -> service.getDashboard(10L, other))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Accès refusé");
    }

    // ── createDashboard ───────────────────────────────────────────────────────

    @Test
    void createDashboard_crée_et_retourne_dto() {
        when(dashboardRepository.countByUser(user)).thenReturn(1);
        when(dashboardRepository.findByUserOrderBySortOrderAsc(user))
                .thenReturn(List.of(defaultDash));
        when(dashboardRepository.save(any())).thenAnswer(inv -> {
            UserDashboard d = inv.getArgument(0);
            d.setId(20L);
            return d;
        });

        UserDashboardWithLayoutDto dto = service.createDashboard(
                new CreateDashboardRequest("Famille"), user);

        assertThat(dto.name()).isEqualTo("Famille");
        assertThat(dto.isDefault()).isFalse();
    }

    @Test
    void createDashboard_lève_409_si_limite_atteinte() {
        when(dashboardRepository.countByUser(user)).thenReturn(5);

        assertThatThrownBy(() -> service.createDashboard(
                new CreateDashboardRequest("Extra"), user))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("5 tableaux de bord");
    }

    // ── deleteDashboard ───────────────────────────────────────────────────────

    @Test
    void deleteDashboard_lève_400_si_seul_dashboard() {
        when(dashboardRepository.findById(10L)).thenReturn(Optional.of(defaultDash));
        when(dashboardRepository.countByUser(user)).thenReturn(1);

        assertThatThrownBy(() -> service.deleteDashboard(10L, user))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("au moins un");
    }

    @Test
    void deleteDashboard_supprime_layout_puis_dashboard() {
        when(dashboardRepository.findById(10L)).thenReturn(Optional.of(defaultDash));
        when(dashboardRepository.countByUser(user)).thenReturn(2);

        UserDashboard other = UserDashboard.builder().id(11L).user(user)
                .name("Famille").sortOrder(1).isDefault(false)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        when(dashboardRepository.findByUserOrderBySortOrderAsc(user))
                .thenReturn(List.of(other));

        service.deleteDashboard(10L, user);

        verify(layoutRepository).deleteByDashboard(defaultDash);
        verify(dashboardRepository).delete(defaultDash);
        // promotion du premier restant comme défaut
        verify(dashboardRepository).save(other);
    }

    // ── reorderDashboards ─────────────────────────────────────────────────────

    @Test
    void reorderDashboards_lève_400_si_ids_invalides() {
        when(dashboardRepository.findByUserOrderBySortOrderAsc(user))
                .thenReturn(List.of(defaultDash));

        assertThatThrownBy(() -> service.reorderDashboards(
                new ReorderDashboardsRequest(List.of(99L)), user))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("IDs");
    }

    // ── saveLayout ────────────────────────────────────────────────────────────

    @Test
    void saveLayout_crée_layout_si_absent() {
        SaveDashboardLayoutRequest req = new SaveDashboardLayoutRequest("{\"v\":1}", 1);
        when(dashboardRepository.findById(10L)).thenReturn(Optional.of(defaultDash));
        when(layoutRepository.findByDashboardId(10L)).thenReturn(Optional.empty());
        when(layoutRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(dashboardRepository.save(any())).thenReturn(defaultDash);

        UserDashboardWithLayoutDto dto = service.saveLayout(10L, req, user);

        assertThat(dto.layoutJson()).isEqualTo("{\"v\":1}");
        verify(layoutRepository).save(any());
    }

    @Test
    void saveLayout_lève_413_si_json_trop_grand() {
        String bigJson = "x".repeat(33_000);
        SaveDashboardLayoutRequest req = new SaveDashboardLayoutRequest(bigJson, 1);
        when(dashboardRepository.findById(10L)).thenReturn(Optional.of(defaultDash));

        assertThatThrownBy(() -> service.saveLayout(10L, req, user))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("32 kB");
    }
}
