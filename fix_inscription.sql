-- Script pour vérifier et corriger la table utilisateurs
-- Ce script résout les problèmes d'inscription

USE gestion_autorisation;

-- Vérifier si la colonne identifiant_unique existe
SELECT COUNT(*) as column_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'gestion_autorisation' 
AND TABLE_NAME = 'utilisateurs' 
AND COLUMN_NAME = 'identifiant_unique';

-- Ajouter la colonne identifiant_unique si elle n'existe pas
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS identifiant_unique VARCHAR(8) UNIQUE;

-- Créer un index pour optimiser les recherches par identifiant
CREATE INDEX IF NOT EXISTS idx_identifiant_unique ON utilisateurs(identifiant_unique);

-- Vérifier la structure finale
DESCRIBE utilisateurs;

-- Message de confirmation
SELECT 'Table utilisateurs vérifiée et corrigée avec succès' as message;
