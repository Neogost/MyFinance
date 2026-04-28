package com.myfinance.repository;

import com.myfinance.domain.Position;
import com.myfinance.domain.PositionOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PositionOrderRepository extends JpaRepository<PositionOrder, Long> {

    List<PositionOrder> findByPositionOrderByOrderDateDesc(Position position);

    void deleteByPosition(Position position);

    /** Charge tous les ordres d'une liste de positions en une seule requête, triés par date croissante. */
    @Query("SELECT po FROM PositionOrder po WHERE po.position IN :positions ORDER BY po.orderDate ASC")
    List<PositionOrder> findByPositionInOrderByOrderDateAsc(@Param("positions") List<Position> positions);
}
