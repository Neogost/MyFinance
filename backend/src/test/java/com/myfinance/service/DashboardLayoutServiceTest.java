package com.myfinance.service;

import com.myfinance.domain.RoleEnum;
import com.myfinance.domain.User;
import com.myfinance.domain.UserDashboardLayout;
import com.myfinance.dto.DashboardLayoutDto;
import com.myfinance.dto.SaveDashboardLayoutRequest;
import com.myfinance.repository.UserDashboardLayoutRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardLayoutServiceTest {

    @Mock UserDashboardLayoutRepository layoutRepository;
    @InjectMocks DashboardLayoutService dashboardLayoutService;

    User user;
    UserDashboardLayout existingLayout;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("jean").role(RoleEnum.USER).build();
        existingLayout = UserDashboardLayout.builder()
                .id(1L)
                .user(user)
                .layoutJson("{\"version\":1}")
                .version(1)
                .updatedAt(Instant.now())
                .build();
    }

    // ── getLayout ─────────────────────────────────────────────

    @Test
    void getLayout_retourneNullSiAucunLayout() {
        when(layoutRepository.findByUserId(1L)).thenReturn(Optional.empty());

        DashboardLayoutDto result = dashboardLayoutService.getLayout(user);

        assertThat(result).isNull();
    }

    @Test
    void getLayout_retourneLeLayoutExistant() {
        when(layoutRepository.findByUserId(1L)).thenReturn(Optional.of(existingLayout));

        DashboardLayoutDto result = dashboardLayoutService.getLayout(user);

        assertThat(result).isNotNull();
        assertThat(result.layoutJson()).isEqualTo("{\"version\":1}");
        assertThat(result.version()).isEqualTo(1);
    }

    // ── saveLayout ────────────────────────────────────────────

    @Test
    void saveLayout_creeUnNouveauLayoutSiAbsent() {
        when(layoutRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(layoutRepository.save(any())).thenAnswer(inv -> {
            UserDashboardLayout l = inv.getArgument(0);
            l.setId(2L);
            return l;
        });

        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest("{\"version\":1,\"breakpoints\":{}}", 1);
        DashboardLayoutDto result = dashboardLayoutService.saveLayout(request, user);

        assertThat(result.layoutJson()).isEqualTo("{\"version\":1,\"breakpoints\":{}}");
        ArgumentCaptor<UserDashboardLayout> captor = ArgumentCaptor.forClass(UserDashboardLayout.class);
        verify(layoutRepository).save(captor.capture());
        assertThat(captor.getValue().getUser()).isEqualTo(user);
    }

    @Test
    void saveLayout_metAJourLeLayoutExistant() {
        when(layoutRepository.findByUserId(1L)).thenReturn(Optional.of(existingLayout));
        when(layoutRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest("{\"version\":2}", 2);
        DashboardLayoutDto result = dashboardLayoutService.saveLayout(request, user);

        assertThat(result.version()).isEqualTo(2);
        assertThat(result.layoutJson()).isEqualTo("{\"version\":2}");
        verify(layoutRepository, times(1)).save(existingLayout);
    }

    @Test
    void saveLayout_rejecteSiJsonTropLong() {
        String tropLong = "x".repeat(33_000);
        SaveDashboardLayoutRequest request = new SaveDashboardLayoutRequest(tropLong, 1);

        assertThatThrownBy(() -> dashboardLayoutService.saveLayout(request, user))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }
}
