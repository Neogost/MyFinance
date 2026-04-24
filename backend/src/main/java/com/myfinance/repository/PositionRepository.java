package com.myfinance.repository;

import com.myfinance.domain.AssetCategory;
import com.myfinance.domain.Instrument;
import com.myfinance.domain.Position;
import com.myfinance.domain.PositionStatus;
import com.myfinance.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PositionRepository extends JpaRepository<Position, Long> {

    List<Position> findByUserOrderByCreatedAtDesc(User user);

    List<Position> findByInstrument(Instrument instrument);

    List<Position> findByUserAndCategoryOrderByCreatedAtDesc(User user, AssetCategory category);

    List<Position> findByUserAndStatusOrderByCreatedAtDesc(User user, PositionStatus status);

    List<Position> findByUserAndCategoryAndStatusOrderByCreatedAtDesc(User user, AssetCategory category, PositionStatus status);
}
