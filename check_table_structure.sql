-- Script pour vérifier la structure de la table admin_access_codes
-- Exécutez ce script dans votre base de données pour vérifier la structure

-- Vérifier si la table existe
SHOW TABLES LIKE 'admin_access_codes';

-- Vérifier la structure de la table
DESCRIBE admin_access_codes;

-- Vérifier le contenu de la table
SELECT * FROM admin_access_codes;

-- Vérifier les colonnes exactes
SHOW COLUMNS FROM admin_access_codes;



