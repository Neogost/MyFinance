-- Migration 014 — Contrat de location sur les revenus locatifs
-- Permet de saisir une période de contrat (début, fin, jour de perception)
-- pour les OtherIncome de type LOCATIF, afin d'éviter la saisie mensuelle.

ALTER TABLE other_incomes ADD COLUMN period_start DATE;
ALTER TABLE other_incomes ADD COLUMN period_end   DATE;
ALTER TABLE other_incomes ADD COLUMN day_of_month INTEGER;
