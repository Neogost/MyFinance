package com.myfinance.repository;

import com.myfinance.domain.Position;
import com.myfinance.domain.PositionOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PositionOrderRepository extends JpaRepository<PositionOrder, Long> {

    List<PositionOrder> findByPositionOrderByOrderDateDesc(Position position);
}
