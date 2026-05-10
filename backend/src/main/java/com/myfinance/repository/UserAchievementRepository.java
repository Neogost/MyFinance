package com.myfinance.repository;

import com.myfinance.domain.AchievementCode;
import com.myfinance.domain.User;
import com.myfinance.domain.UserAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    /** Tous les badges confirmés d'un utilisateur, du plus récent au plus ancien. */
    List<UserAchievement> findByUserAndConfirmedAtIsNotNullOrderByConfirmedAtDesc(User user);

    /** Plus haut niveau confirmé pour un badge donné (0 si aucun). */
    @Query("SELECT MAX(a.level) FROM UserAchievement a WHERE a.user = :user AND a.achievementCode = :code AND a.confirmedAt IS NOT NULL")
    Optional<Integer> findMaxConfirmedLevel(@Param("user") User user, @Param("code") AchievementCode code);

    /** Entrée pending (confirmedAt null) pour un badge et niveau donnés. */
    Optional<UserAchievement> findByUserAndAchievementCodeAndLevelAndConfirmedAtIsNull(
            User user, AchievementCode code, int level);

    /** Vérifie si un badge à un niveau donné est déjà confirmé. */
    boolean existsByUserAndAchievementCodeAndLevelAndConfirmedAtIsNotNull(
            User user, AchievementCode code, int level);

    /** Nombre de badges confirmés pour un utilisateur. */
    long countByUserAndConfirmedAtIsNotNull(User user);
}
