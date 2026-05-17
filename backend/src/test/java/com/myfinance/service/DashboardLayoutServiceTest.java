package com.myfinance.service;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.domain.UserDashboard;
import com.myfinance.domain.UserDashboardLayout;
import com.myfinance.dto.DashboardLayoutDto;
import com.myfinance.dto.SaveDashboardLayoutRequest;
import com.myfinance.repository.UserDashboardLayoutRepository;
import com.myfinance.repository.UserDashboardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardLayoutServiceTest {

    @Mock UserDashboardLayoutRepository layoutRepository;
    @Mock UserDashboardRepository        dashboardRepository;
    @InjectMocks DashboardLayoutService dashboardLayoutService;

    User          user;
    UserDashboard defaultDash;
    UserDashboardLayout existingLayout;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("jean").role(RoleEnum.USER).build();

        defaultDash = UserDashboard.builder()
                .id(10L).user(user).name("Principal")
                .sortOrder(0).isDefault(true)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();

        existingLayout = UserDashboardLayout.builder()
                .id(1L).dashboard(defaultDash)
                .layoutJson("{\"version\":1}").version(1).updatedAt(LocalDateTime.now())
                .build();
    }

    // ── getLayout ─────────────────────────────────────────────────────────────

    @Test
    void getLayout_retourneNullSiAucunDashboardDefaut() {
        when(dashboardRepository.findByUserAndIsDefaultTrue(user)).thenReturn(Optional.empty());

        DashboardLayoutDto result = dashboardLayoutService.getLayout(user);

        assertThat(result).isNull();
    }

    @Test
    void getLayout_retourneLeLayoutExistant() {
        when(dashboardRepository.findByUserAndIsDefaultTrue(user)).thenReturn(Optional.of(defaultDash));
        when(layoutRepository.findByDashboardId(10L)).thenReturn(Optional.of(existingLayout));

        DashboardLayoutDto result = dashboardLayoutService.getLayout(user);

        assertThat(result).isNotNull();
        assertThat(result.layoutJson()).isEqualTo("{\"version\":1}");
        assertThat(result.version()).isEqualTo(1);
    }

    // ── saveLayout ────────────────────────────────────────────────────────────

    @Test
    void saveLayout_creeUnNouveauLayoutSiAbsent() {
        when(dashboardRepository.findByUserAndIsDefaultTrue(user)).thenReturn(Optional.of(defaultDash));
        when(layoutRepository.findByDashboardId(10L)).thenReturn(Optional.empty());
        when(layoutRepository.save(any())).thenAnswer(inv -> {
            UserDashboardLayout l = inv.getArgument(0);
            l.setId(2L);
            return l;
        });

        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest("{\"version\":1,\"breakpoints\":{}}", 1);
        DashboardLayoutDto result = dashboardLayoutService.saveLayout(request, user);

        assertThat(result.layoutJson()).isEqualTo("{\"version\":1,\"breakpoints\":{}}");
        verify(layoutRepository).save(any());
    }

    @Test
    void saveLayout_metAJourLeLayoutExistant() {
        when(dashboardRepository.findByUserAndIsDefaultTrue(user)).thenReturn(Optional.of(defaultDash));
        when(layoutRepository.findByDashboardId(10L)).thenReturn(Optional.of(existingLayout));
        when(layoutRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest("{\"version\":2}", 2);
        DashboardLayoutDto result = dashboardLayoutService.saveLayout(request, user);

        assertThat(result.version()).isEqualTo(2);
        assertThat(result.layoutJson()).isEqualTo("{\"version\":2}");
    }

    @Test
    void saveLayout_rejecteSiJsonTropLong() {
        when(dashboardRepository.findByUserAndIsDefaultTrue(user)).thenReturn(Optional.of(defaultDash));
        String tropLong = "x".repeat(33_000);
        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest(tropLong, 1);

        assertThatThrownBy(() -> dashboardLayoutService.saveLayout(request, user))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }
}
