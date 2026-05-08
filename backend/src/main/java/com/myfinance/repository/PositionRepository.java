package com.myfinance.repository;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.domain.Position;
import com.myfinance.domain.PositionStatus;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PositionRepository extends JpaRepository<Position, Long> {

    List<Position> findByUserOrderByCreatedAtDesc(User user);

    List<Position> findByInstrument(Instrument instrument);

    List<Position> findByUserAndCategoryOrderByCreatedAtDesc(User user, AssetCategory category);

    List<Position> findByUserAndStatusOrderByCreatedAtDesc(User user, PositionStatus status);

    List<Position> findByUserAndCategoryAndStatusOrderByCreatedAtDesc(User user, AssetCategory category, PositionStatus status);

    /** Compte les positions dont l'instrument est libellé dans une devise donnée. */
    @Query("SELECT COUNT(p) FROM Position p WHERE p.instrument IS NOT NULL AND p.instrument.currency = :currency")
    long countByInstrumentCurrency(@Param("currency") String currency);
}
