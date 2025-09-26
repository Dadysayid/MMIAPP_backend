-- Ajouter la colonne updated_at à la table avis_commissions
ALTER TABLE avis_commissions 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
AFTER date_avis; 