-- Script pour nettoyer la table utilisateurs
-- Supprime la colonne registre_commerce qui n'est plus utilisée

USE gestion_autorisation;

-- Vérifier si la colonne registre_commerce existe
SELECT COUNT(*) as column_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'gestion_autorisation' 
AND TABLE_NAME = 'utilisateurs' 
AND COLUMN_NAME = 'registre_commerce';

-- Supprimer la colonne registre_commerce si elle existe
ALTER TABLE utilisateurs DROP COLUMN IF EXISTS registre_commerce;

-- Vérifier la structure finale
DESCRIBE utilisateurs;

-- Message de confirmation
SELECT 'Table utilisateurs nettoyée avec succès' as message;
