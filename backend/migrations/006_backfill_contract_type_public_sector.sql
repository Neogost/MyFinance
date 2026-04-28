-- Migration 006 — Backfill du champ contract_type
-- Fonctionnalité : Contrats fonction publique (cf. docs/architecture/salary-public-sector.md)
--
-- Phase    : 2 — à exécuter APRÈS le déploiement de la V1 et vérification que tous
--            les contrats existants sont bien des contrats privés.
-- Créé le  : 2026-04-28
-- Idempotent : oui (WHERE contract_type IS NULL)
-- Bloquant   : non (transaction courte)
--
-- Vérification AVANT exécution :
--   SELECT id, company_name, start_date, contract_type
--   FROM salary_contracts
--   WHERE contract_type IS NULL;
--   → Revoir manuellement que toutes ces lignes sont bien des contrats privés.
--
-- Procédure d'exécution sur le NAS QNAP (prod) :
--   1. cp /share/Public/myfinance/myfinance.db /share/Public/myfinance/myfinance.backup.YYYY-MM-DD.db
--   2. sqlite3 /share/Public/myfinance/myfinance.db < backend/migrations/006_backfill_contract_type_public_sector.sql
--   3. sqlite3 /share/Public/myfinance/myfinance.db "SELECT COUNT(*) FROM salary_contracts WHERE contract_type IS NULL;"
--      → doit retourner 0

UPDATE salary_contracts
SET contract_type = 'PRIVATE'
WHERE contract_type IS NULL;
