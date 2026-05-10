-- Jour du mois du prélèvement (1-28) pour les dépenses MONTHLY
-- NULL = pas de date de prélèvement saisie → ignoré dans le calendrier des abonnements
ALTER TABLE recurring_expenses ADD COLUMN payment_day INTEGER;
