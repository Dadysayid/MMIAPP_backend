-- Script pour ajouter le champ de confirmation de mot de passe à la table utilisateurs
-- Ce script ajoute la validation de confirmation de mot de passe

USE gestion_autorisation;

-- Vérifier si la colonne confirmation_mot_de_passe existe déjà
SELECT COUNT(*) as column_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'gestion_autorisation' 
AND TABLE_NAME = 'utilisateurs' 
AND COLUMN_NAME = 'confirmation_mot_de_passe';

-- Ajouter la colonne confirmation_mot_de_passe si elle n'existe pas
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS confirmation_mot_de_passe VARCHAR(255);

-- Ajouter un commentaire pour documenter le champ
ALTER TABLE utilisateurs MODIFY COLUMN confirmation_mot_de_passe VARCHAR(255) COMMENT 'Champ de confirmation du mot de passe pour validation';

-- Créer un index pour optimiser les recherches (optionnel)
-- CREATE INDEX IF NOT EXISTS idx_confirmation_mot_de_passe ON utilisateurs(confirmation_mot_de_passe);

-- Vérifier la structure finale
DESCRIBE utilisateurs;

-- Message de confirmation
SELECT 'Colonne confirmation_mot_de_passe ajoutée avec succès à la table utilisateurs' as message;

-- Afficher les colonnes liées aux mots de passe
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'gestion_autorisation' 
AND TABLE_NAME = 'utilisateurs' 
AND COLUMN_NAME IN ('mot_de_passe', 'confirmation_mot_de_passe');




