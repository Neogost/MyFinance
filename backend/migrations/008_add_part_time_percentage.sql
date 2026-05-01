-- Migration 008 : ajout de la quotité de travail sur les contrats salariaux
-- Permet de gérer les contrats à temps partiel (ex : 70 % = 7/10e).
-- DEFAULT 100 : tous les contrats existants sont considérés à temps plein.

ALTER TABLE salary_contracts ADD COLUMN part_time_percentage REAL NOT NULL DEFAULT 100.0;
