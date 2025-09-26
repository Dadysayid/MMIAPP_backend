-- Script pour insérer le code d'accès par défaut
-- Ce script doit être exécuté après la création de la table admin_access_codes

USE gestion_autorisation;

-- Vérifier si la table existe
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'gestion_autorisation' 
    AND table_name = 'admin_access_codes'
);

-- Créer la table si elle n'existe pas
SET @create_table = IF(@table_exists = 0, 
    'CREATE TABLE admin_access_codes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        access_code VARCHAR(8) NOT NULL UNIQUE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (created_by) REFERENCES utilisateurs(id) ON DELETE CASCADE
    )',
    'SELECT "Table admin_access_codes existe déjà" as message'
);

PREPARE stmt FROM @create_table;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Désactiver tous les codes existants
UPDATE admin_access_codes SET is_active = FALSE;

-- Insérer le code d'accès par défaut
-- Code : Adm1n!@ (8 caractères avec majuscules, minuscules, chiffres et caractères spéciaux)
INSERT INTO admin_access_codes (access_code, created_by, is_active) VALUES 
('Adm1n!@', 1, TRUE)
ON DUPLICATE KEY UPDATE 
    access_code = 'Adm1n!@',
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- Vérifier l'insertion
SELECT 
    'Code d\'accès par défaut inséré avec succès' as message,
    access_code as code_par_defaut,
    created_at,
    is_active
FROM admin_access_codes 
WHERE is_active = TRUE;

-- Afficher tous les codes (pour vérification)
SELECT 
    id,
    access_code,
    created_by,
    created_at,
    updated_at,
    is_active
FROM admin_access_codes 
ORDER BY created_at DESC;



