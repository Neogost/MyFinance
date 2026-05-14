package com.myfinance.service;

import com.myfinance.domain.*;
import com.myfinance.dto.*;
import com.myfinance.repository.InfoBannerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InfoBannerServiceTest {

    @Mock InfoBannerRepository infoBannerRepository;
    @InjectMocks InfoBannerService infoBannerService;

    User admin;
    User user;
    InfoBanner bannerInfo;
    InfoBanner bannerAlert;

    static final LocalDateTime BEFORE = LocalDateTime.now().minusHours(1);
    static final LocalDateTime AFTER  = LocalDateTime.now().plusDays(1);

    @BeforeEach
    void setUp() {
        admin = User.builder().id(1L).login("admin").role(RoleEnum.ADMIN).build();
        user  = User.builder().id(2L).login("user").role(RoleEnum.USER).build();

        bannerInfo = InfoBanner.builder()
                .id(1L).title("Info").message("Message info").type(InfoBannerType.INFO)
                .audience(InfoBannerAudience.ALL).startAt(BEFORE).endAt(AFTER)
                .createdAt(BEFORE).updatedAt(BEFORE).createdBy(admin)
                .build();

        bannerAlert = InfoBanner.builder()
                .id(2L).title("Alerte").message("Message alerte").type(InfoBannerType.ALERT)
                .audience(InfoBannerAudience.ALL).startAt(BEFORE).endAt(null)
                .createdAt(BEFORE).updatedAt(BEFORE).createdBy(admin)
                .build();
    }

    // ── findActive ─────────────────────────────────────────────────

    @Test
    void findActive_utilisateurUser_filtreAudienceCorrectement() {
        when(infoBannerRepository.findActiveForAudiences(any(), eq(Set.of(InfoBannerAudience.ALL, InfoBannerAudience.USERS_ONLY))))
                .thenReturn(List.of(bannerInfo));

        List<InfoBannerDto> result = infoBannerService.findActive(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).type()).isEqualTo(InfoBannerType.INFO);
    }

    @Test
    void findActive_utilisateurAdmin_filtreAudienceCorrectement() {
        when(infoBannerRepository.findActiveForAudiences(any(), eq(Set.of(InfoBannerAudience.ALL, InfoBannerAudience.ADMIN_ONLY))))
                .thenReturn(List.of(bannerAlert));

        List<InfoBannerDto> result = infoBannerService.findActive(admin);

        assertThat(result).hasSize(1);
    }

    @Test
    void findActive_triePrioriteDecroissante() {
        when(infoBannerRepository.findActiveForAudiences(any(), any()))
                .thenReturn(List.of(bannerInfo, bannerAlert)); // INFO avant ALERT

        List<InfoBannerDto> result = infoBannerService.findActive(user);

        assertThat(result).extracting(InfoBannerDto::type)
                .containsExactly(InfoBannerType.ALERT, InfoBannerType.INFO); // ALERT doit passer en premier
    }

    // ── findAll admin ──────────────────────────────────────────────

    @Test
    void findAll_retourneToutesLesBannières() {
        when(infoBannerRepository.findAllByOrderByStartAtDesc()).thenReturn(List.of(bannerInfo, bannerAlert));

        List<InfoBannerAdminDto> result = infoBannerService.findAll();

        assertThat(result).hasSize(2);
    }

    @Test
    void findAll_calculeStatutActif() {
        when(infoBannerRepository.findAllByOrderByStartAtDesc()).thenReturn(List.of(bannerInfo));

        List<InfoBannerAdminDto> result = infoBannerService.findAll();

        assertThat(result.get(0).status()).isEqualTo(InfoBannerStatus.ACTIVE);
    }

    @Test
    void findAll_calculeStatutProgramme() {
        InfoBanner futur = InfoBanner.builder().id(3L).message("Futur").type(InfoBannerType.INFO)
                .audience(InfoBannerAudience.ALL).startAt(LocalDateTime.now().plusDays(1)).endAt(null)
                .createdAt(BEFORE).updatedAt(BEFORE).build();
        when(infoBannerRepository.findAllByOrderByStartAtDesc()).thenReturn(List.of(futur));

        List<InfoBannerAdminDto> result = infoBannerService.findAll();

        assertThat(result.get(0).status()).isEqualTo(InfoBannerStatus.SCHEDULED);
    }

    @Test
    void findAll_calculeStatutExpire() {
        InfoBanner expire = InfoBanner.builder().id(4L).message("Expiré").type(InfoBannerType.INFO)
                .audience(InfoBannerAudience.ALL).startAt(LocalDateTime.now().minusDays(2)).endAt(LocalDateTime.now().minusDays(1))
                .createdAt(BEFORE).updatedAt(BEFORE).build();
        when(infoBannerRepository.findAllByOrderByStartAtDesc()).thenReturn(List.of(expire));

        List<InfoBannerAdminDto> result = infoBannerService.findAll();

        assertThat(result.get(0).status()).isEqualTo(InfoBannerStatus.EXPIRED);
    }

    // ── findById ───────────────────────────────────────────────────

    @Test
    void findById_leve404_siBannièreIntrouvable() {
        when(infoBannerRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> infoBannerService.findById(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── create ─────────────────────────────────────────────────────

    @Test
    void create_sauvegardeEtRetourneLaDto() {
        CreateInfoBannerRequest request = new CreateInfoBannerRequest(
                "Titre", "Message", InfoBannerType.INFO, InfoBannerAudience.ALL, BEFORE, AFTER);

        when(infoBannerRepository.save(any(InfoBanner.class))).thenAnswer(inv -> {
            InfoBanner b = inv.getArgument(0);
            return InfoBanner.builder().id(10L).title(b.getTitle()).message(b.getMessage())
                    .type(b.getType()).audience(b.getAudience()).startAt(b.getStartAt())
                    .endAt(b.getEndAt()).createdAt(BEFORE).updatedAt(BEFORE).createdBy(admin).build();
        });

        InfoBannerAdminDto result = infoBannerService.create(request, admin);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.createdByLogin()).isEqualTo("admin");
        verify(infoBannerRepository).save(any(InfoBanner.class));
    }

    @Test
    void create_leve400_siEndAtAvantStartAt() {
        CreateInfoBannerRequest request = new CreateInfoBannerRequest(
                null, "Msg", InfoBannerType.INFO, InfoBannerAudience.ALL, AFTER, BEFORE);

        assertThatThrownBy(() -> infoBannerService.create(request, admin))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(infoBannerRepository, never()).save(any());
    }

    @Test
    void create_accepteSansEndAt() {
        CreateInfoBannerRequest request = new CreateInfoBannerRequest(
                null, "Message", InfoBannerType.MAINTENANCE, InfoBannerAudience.ALL, BEFORE, null);

        when(infoBannerRepository.save(any())).thenAnswer(inv -> {
            InfoBanner b = inv.getArgument(0);
            return InfoBanner.builder().id(11L).message(b.getMessage()).type(b.getType())
                    .audience(b.getAudience()).startAt(b.getStartAt()).endAt(null)
                    .createdAt(BEFORE).updatedAt(BEFORE).build();
        });

        assertThatNoException().isThrownBy(() -> infoBannerService.create(request, admin));
    }

    // ── update ─────────────────────────────────────────────────────

    @Test
    void update_leve404_siBannièreIntrouvable() {
        when(infoBannerRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> infoBannerService.update(99L,
                new UpdateInfoBannerRequest("Titre", "Msg", InfoBannerType.INFO, InfoBannerAudience.ALL, BEFORE, null)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void update_modifieLaBannière() {
        when(infoBannerRepository.findById(1L)).thenReturn(Optional.of(bannerInfo));
        when(infoBannerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InfoBannerAdminDto result = infoBannerService.update(1L,
                new UpdateInfoBannerRequest("Nouveau titre", "Nouveau msg", InfoBannerType.ALERT, InfoBannerAudience.ADMIN_ONLY, BEFORE, null));

        assertThat(result.type()).isEqualTo(InfoBannerType.ALERT);
        assertThat(result.title()).isEqualTo("Nouveau titre");
    }

    // ── delete ─────────────────────────────────────────────────────

    @Test
    void delete_supprimeLaBannière() {
        when(infoBannerRepository.existsById(1L)).thenReturn(true);

        infoBannerService.delete(1L);

        verify(infoBannerRepository).deleteById(1L);
    }

    @Test
    void delete_leve404_siBannièreIntrouvable() {
        when(infoBannerRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> infoBannerService.delete(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));

        verify(infoBannerRepository, never()).deleteById(any());
    }
}
