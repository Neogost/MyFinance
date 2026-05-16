package com.myfinance.service;

import com.myfinance.domain.User;
import com.myfinance.domain.UserDashboardLayout;
import com.myfinance.dto.DashboardLayoutDto;
import com.myfinance.dto.SaveDashboardLayoutRequest;
import com.myfinance.repository.UserDashboardLayoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class DashboardLayoutService {

    private final UserDashboardLayoutRepository layoutRepository;

    // Taille max du JSON acceptée (32 kB)
    private static final int MAX_JSON_BYTES = 32_768;

    @Transactional(readOnly = true)
    public DashboardLayoutDto getLayout(User currentUser) {
        return layoutRepository.findByUserId(currentUser.getId())
                .map(DashboardLayoutDto::from)
                .orElse(null);
    }

    @Transactional
    public DashboardLayoutDto saveLayout(SaveDashboardLayoutRequest request, User currentUser) {
        if (request.layoutJson().getBytes().length > MAX_JSON_BYTES) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE,
                    "Layout JSON dépasse 32 kB");
        }

        UserDashboardLayout layout = layoutRepository.findByUserId(currentUser.getId())
                .orElse(UserDashboardLayout.builder().user(currentUser).build());

        layout.setLayoutJson(request.layoutJson());
        layout.setVersion(request.version());
        layout.setUpdatedAt(Instant.now());

        return DashboardLayoutDto.from(layoutRepository.save(layout));
    }
}
