package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.InfoBannerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InfoBannerService {

    private final InfoBannerRepository infoBannerRepository;

    // ── Lecture utilisateur ────────────────────────────────────────

    public List<InfoBannerDto> findActive(User user) {
        Set<InfoBannerAudience> audiences = user.getRole() == RoleEnum.ADMIN
                ? Set.of(InfoBannerAudience.ALL, InfoBannerAudience.ADMIN_ONLY)
                : Set.of(InfoBannerAudience.ALL, InfoBannerAudience.USERS_ONLY);

        return infoBannerRepository.findActiveForAudiences(LocalDateTime.now(), audiences)
                .stream()
                .sorted(Comparator.comparingInt(b -> typePriority(b.getType())))
                .map(InfoBannerDto::from)
                .toList();
    }

    // ── Lecture admin ──────────────────────────────────────────────

    public List<InfoBannerAdminDto> findAll() {
        LocalDateTime now = LocalDateTime.now();
        return infoBannerRepository.findAllByOrderByStartAtDesc()
                .stream()
                .map(b -> InfoBannerAdminDto.from(b, now))
                .toList();
    }

    public InfoBannerAdminDto findById(Long id) {
        InfoBanner banner = infoBannerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Bannière introuvable : " + id));
        return InfoBannerAdminDto.from(banner, LocalDateTime.now());
    }

    // ── Création ───────────────────────────────────────────────────

    public InfoBannerAdminDto create(CreateInfoBannerRequest request, User admin) {
        validateDates(request.startAt(), request.endAt());

        InfoBanner banner = InfoBanner.builder()
                .title(request.title())
                .message(request.message())
                .type(request.type())
                .audience(request.audience())
                .startAt(request.startAt())
                .endAt(request.endAt())
                .createdBy(admin)
                .build();

        return InfoBannerAdminDto.from(infoBannerRepository.save(banner), LocalDateTime.now());
    }

    // ── Modification ───────────────────────────────────────────────

    public InfoBannerAdminDto update(Long id, UpdateInfoBannerRequest request) {
        InfoBanner banner = infoBannerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Bannière introuvable : " + id));

        validateDates(request.startAt(), request.endAt());

        banner.setTitle(request.title());
        banner.setMessage(request.message());
        banner.setType(request.type());
        banner.setAudience(request.audience());
        banner.setStartAt(request.startAt());
        banner.setEndAt(request.endAt());

        return InfoBannerAdminDto.from(infoBannerRepository.save(banner), LocalDateTime.now());
    }

    // ── Suppression ────────────────────────────────────────────────

    public void delete(Long id) {
        if (!infoBannerRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bannière introuvable : " + id);
        }
        infoBannerRepository.deleteById(id);
    }

    // ── Helpers ────────────────────────────────────────────────────

    private void validateDates(LocalDateTime startAt, LocalDateTime endAt) {
        if (endAt != null && !endAt.isAfter(startAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La date de fin doit être strictement postérieure à la date de début");
        }
    }

    private static int typePriority(InfoBannerType type) {
        return switch (type) {
            case ALERT       -> 1;
            case WARNING     -> 2;
            case MAINTENANCE -> 3;
            case INFO        -> 4;
            case SUCCESS     -> 5;
        };
    }
}
