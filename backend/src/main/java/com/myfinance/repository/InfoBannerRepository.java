package com.myfinance.repository;

import com.myfinance.domain.InfoBanner;
import com.myfinance.domain.InfoBannerAudience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public interface InfoBannerRepository extends JpaRepository<InfoBanner, Long> {

    // Bannières actives pour un ensemble d'audiences (filtre plage temporelle)
    @Query("SELECT b FROM InfoBanner b WHERE b.startAt <= :now AND (b.endAt IS NULL OR b.endAt >= :now) AND b.audience IN :audiences")
    List<InfoBanner> findActiveForAudiences(@Param("now") LocalDateTime now, @Param("audiences") Set<InfoBannerAudience> audiences);

    // Toutes les bannières triées par startAt décroissant (vue admin)
    List<InfoBanner> findAllByOrderByStartAtDesc();
}
