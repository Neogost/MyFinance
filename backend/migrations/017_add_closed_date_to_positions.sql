-- Migration 017 : ajout de closed_date sur positions
-- Permet d'identifier précisément quand une position a été fermée,
-- pour le calcul TWR/MWR (exclusion de la position après cette date).

ALTER TABLE positions ADD COLUMN closed_date INTEGER;

-- Backfill : pour les positions déjà CLOSED, on prend la date du dernier ordre
-- (MAX orderDate). Si aucun ordre, closed_date reste NULL.
UPDATE positions
SET closed_date = (
    SELECT MAX(po.order_date)
    FROM position_orders po
    WHERE po.position_id = positions.id
)
WHERE status = 'CLOSED'
  AND closed_date IS NULL;
