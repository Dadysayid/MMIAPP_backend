-- Script pour vérifier la structure de la table notifications
-- Exécutez ce script dans votre base de données pour vérifier la structure

-- Vérifier si la table existe
SHOW TABLES LIKE 'notifications';

-- Vérifier la structure de la table
DESCRIBE notifications;

-- Vérifier le contenu de la table
SELECT * FROM notifications LIMIT 5;

-- Vérifier les colonnes exactes
SHOW COLUMNS FROM notifications;

-- Vérifier s'il y a des colonnes problématiques
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'notifications' 
AND TABLE_SCHEMA = DATABASE();
